import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Loader2, TrendingUp, Info, ShoppingCart } from 'lucide-react';
import { useLeverageStore } from '../../stores/leverage.store';
import { parseUnits } from 'viem';
import { PageLoader } from '../ui/page-loader';

// Hardcoded for testing/demo
const TEST_ASSET = {
  id: '1aa1e321-f783-4504-ad19-676a397057d7',
  symbol: 'INV-TECH-2025-A',
  address: '0xe7BAdAaF6d2FFF75394cC8608f68362c61F00bFb',
  price: 0.80,
  priceWei: '800000' // 0.80 USDC (6 decimals)
};

export const LeverageForm = () => {
  const [amount, setAmount] = useState('');
  const { 
    methPrice, 
    activeQuote, 
    isLoading, 
    fetchMethPrice, 
    getQuote, 
    createPosition 
  } = useLeverageStore();

  useEffect(() => {
    fetchMethPrice();
  }, [fetchMethPrice]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAmount(val);
    getQuote(val); // In a real app, debounce this
  };
  
  const borrowableUSDC = activeQuote ? parseFloat(activeQuote.expectedUSDC) / 1e6 : 0;
  const estimatedTokens = borrowableUSDC > 0 ? borrowableUSDC / TEST_ASSET.price : 0;

  const handleSubmit = async () => {
    if (!amount || !activeQuote) return;

    try {
      const mETHCollateral = parseUnits(amount, 18).toString();
      // Token has 18 decimals usually? Let's assume standard ERC20 for the RWA token
      const tokenAmount = parseUnits(estimatedTokens.toString(), 18).toString(); 

      await createPosition({
        assetId: TEST_ASSET.id,
        tokenAddress: TEST_ASSET.address,
        tokenAmount: tokenAmount,
        pricePerToken: TEST_ASSET.priceWei,
        mETHCollateral: mETHCollateral
      });
      
      setAmount('');
      alert('Position created successfully!');
    } catch (error) {
      alert('Failed to create position. See console.');
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Open Leveraged Position
        </CardTitle>
        <CardDescription>
          Deposit mETH collateral to borrow USDC and purchase RWA tokens.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Input Section */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Collateral Amount (mETH)
          </label>
          <div className="relative">
            <Input 
              type="number" 
              placeholder="0.00"
              value={amount}
              onChange={handleAmountChange}
              className="pr-16"
            />
            <span className="absolute right-3 top-2.5 text-sm font-semibold text-muted-foreground">
              mETH
            </span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Balance: 5.42 mETH</span>
            <span>≈ ${amount ? (parseFloat(amount) * methPrice).toLocaleString() : '0.00'} USD</span>
          </div>
        </div>

        {/* Info Box */}
        <div className="rounded-lg bg-secondary/30 p-4 space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">mETH Price</span>
            <span className="font-mono font-medium">${methPrice.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Max Borrow (LTV 150%)</span>
            <span className="font-mono font-medium text-green-500">
              {borrowableUSDC > 0 ? `$${borrowableUSDC.toLocaleString(undefined, {maximumFractionDigits: 2})}` : '$0.00'} USDC
            </span>
          </div>
           <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Est. Health Factor</span>
            <span className="font-mono font-bold text-green-500">1.50</span>
          </div>
        </div>

        {/* Purchase Preview */}
        <div className="border border-border rounded-lg p-4 space-y-2 bg-card/50">
           <div className="flex items-center gap-2 mb-2">
             <ShoppingCart className="h-4 w-4 text-primary" />
             <span className="font-semibold text-sm">Purchase Preview</span>
           </div>
           <div className="flex justify-between text-sm">
             <span className="text-muted-foreground">Asset</span>
             <span>{TEST_ASSET.symbol}</span>
           </div>
           <div className="flex justify-between text-sm">
             <span className="text-muted-foreground">Price</span>
             <span>${TEST_ASSET.price.toFixed(2)}</span>
           </div>
           <div className="flex justify-between text-sm pt-2 border-t border-dashed">
             <span className="font-medium">Est. Tokens Received</span>
             <span className="font-bold">{estimatedTokens.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
           </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-3 flex gap-3">
          <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-400">
            You must maintain a health factor above 1.10 to avoid liquidation. 
            Assets are purchased automatically with borrowed funds.
          </p>
        </div>

      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          size="lg"
          disabled={!amount || isLoading || !activeQuote}
          onClick={handleSubmit}
        >
          {isLoading ? (
            <>
              <PageLoader text="Processing" />
            </>
          ) : (
            'Approve & Open Position'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};
