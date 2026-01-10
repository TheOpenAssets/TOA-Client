# Borrow Feature Revamp - Implementation Plan

## Executive Summary

This plan outlines a complete UI/UX revamp of the borrow feature while preserving the existing, production-ready backend infrastructure and smart contract integration.

**Status**: Platform direct borrowing is fully implemented. We're redesigning the UI to match the clean, modern aesthetic of TradingEngine.page.tsx.

---

## Current State Analysis

### ✅ What Already Works (Keep & Reuse)
- Smart contract integration (`solvency-contract.service.ts`) - 530 lines, verified ABI
- Backend API services (`solvency.service.ts`) - All endpoints tested
- Type definitions (`solvency.types.ts`) - Comprehensive domain models
- Health factor calculations and monitoring
- Position tracking and OAID credit lines
- My Loans tab in Portfolio (basic implementation exists)
- Mandatory position syncing after transactions

### 🔄 What Needs Revamp (UI/UX Only)
- My Loans table - Enhance with card-based UI, better visuals
- Borrow flow - Combine separate modals into unified experience
- Empty states - Add friendly gatekeeper with clear CTAs
- Real-time validation - Add debounced API validation
- Styling - Apply TradingEngine design patterns throughout

---

## Design Principles (From TradingEngine Inspiration)

### Color Palette
```css
Background: #F7F8FA (light gray)
Cards: #FFFFFF with shadow-[0_2px_12px_rgba(0,0,0,0.04)]
Borders: rounded-[20px] to rounded-[24px]
Text Primary: #111111
Text Secondary: #6B7280
Accent: #10B981 (green for positive), #EF4444 (red for negative)
```

### Typography
- Font: Inherit from TradingEngine (likely Inter or similar)
- Headings: font-bold, tracking-tight
- Values: Large font sizes (36px-56px) for important numbers
- Labels: text-sm, text-[#6B7280]

### Layout Patterns
- Clean card-based sections with ample padding (p-6 to p-8)
- Minimal text with info tooltips (ℹ️) for details
- Sticky sidebars for primary actions
- Smooth transitions and hover states

---

## Implementation Tasks

### Task 1: Enhance My Loans Table in Portfolio
**File**: `src/components/portfolio/MyLoansTable.tsx`

#### Current State
- Basic HTML table with columns: Position ID, Collateral, Value, Debt, Health Factor, Date, Actions
- Simple empty state: "No Active Loans"
- Plain text buttons for Repay/Add Collateral

#### Revamp To
**Card-Based Layout** (inspired by TradingEngine asset sections):
```tsx
{positions.length === 0 ? (
  // Enhanced Empty State
  <div className="bg-white rounded-[24px] p-12 text-center">
    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#F3F4F6] flex items-center justify-center">
      <Wallet className="w-8 h-8 text-[#6B7280]" />
    </div>
    <h3 className="text-xl font-semibold text-[#111111] mb-2">
      No Active Loans
    </h3>
    <p className="text-sm text-[#6B7280] mb-6 max-w-md mx-auto">
      You haven't borrowed against your assets yet. Start borrowing USDC using your RWA tokens as collateral.
    </p>
    <button
      onClick={() => navigate('/borrow')}
      className="px-6 py-3 bg-[#111111] hover:bg-[#1a1a1a] text-white rounded-[12px] font-medium transition-all"
    >
      Start Borrowing
    </button>
  </div>
) : (
  // Card Grid Layout
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {positions.map(position => (
      <div key={position.positionId} className="bg-white rounded-[20px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
        {/* Position Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#6B7280]">Position</span>
            <span className="font-semibold text-[#111111]">#{position.positionId}</span>
          </div>
          <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getHealthBadgeColor(position.healthStatus)}`}>
            {position.healthStatus}
          </span>
        </div>

        {/* Collateral Info */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600"></div>
            <div>
              <div className="text-sm font-medium text-[#111111]">{position.collateralToken.symbol}</div>
              <div className="text-xs text-[#6B7280]">
                {formatCollateralAmount(position.collateralAmount, 18)} tokens
              </div>
            </div>
          </div>
          <div className="text-xs text-[#6B7280]">
            Collateral Value: <span className="text-[#111111] font-medium">{formatUSD(position.tokenValueUSD)}</span>
          </div>
        </div>

        {/* Debt Info */}
        <div className="bg-[#F9FAFB] rounded-lg p-3 mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-[#6B7280]">Outstanding Debt</span>
            <span className="text-lg font-bold text-[#111111]">{formatUSD(position.outstandingDebt)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-[#6B7280]">Health Factor</span>
            <span className={`text-sm font-semibold ${getHealthColor(position.healthFactor)}`}>
              {formatHealthFactor(position.healthFactor)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button className="flex-1 py-2 bg-[#F3F4F6] hover:bg-[#E5E7EB] rounded-lg text-sm font-medium text-[#111111] transition-colors">
            Repay
          </button>
          <button className="flex-1 py-2 bg-[#F3F4F6] hover:bg-[#E5E7EB] rounded-lg text-sm font-medium text-[#111111] transition-colors">
            Add Collateral
          </button>
        </div>

        {/* Date */}
        <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-[#6B7280] text-center">
          Created {format(new Date(position.createdAt), 'MMM d, yyyy')}
        </div>
      </div>
    ))}
  </div>
)}
```

#### Additional Features
- **Filters** (above card grid):
  ```tsx
  <div className="flex items-center gap-3 mb-6">
    <button className={`px-4 py-2 rounded-lg text-sm font-medium ${activeFilter === 'all' ? 'bg-[#F3F4F6] text-[#111111]' : 'text-[#6B7280]'}`}>
      All Loans
    </button>
    <button className={`px-4 py-2 rounded-lg text-sm font-medium ${activeFilter === 'healthy' ? 'bg-[#F3F4F6] text-[#111111]' : 'text-[#6B7280]'}`}>
      Healthy
    </button>
    <button className={`px-4 py-2 rounded-lg text-sm font-medium ${activeFilter === 'warning' ? 'bg-[#F3F4F6] text-[#111111]' : 'text-[#6B7280]'}`}>
      At Risk
    </button>
  </div>
  ```

- **Sorting Dropdown**:
  ```tsx
  <Select value={sortBy} onValueChange={setSortBy}>
    <SelectTrigger className="w-48">Sort by</SelectTrigger>
    <SelectContent>
      <SelectItem value="date">Newest First</SelectItem>
      <SelectItem value="health">Health Factor</SelectItem>
      <SelectItem value="debt">Debt Amount</SelectItem>
    </SelectContent>
  </Select>
  ```

---

### Task 2: Build Gatekeeper Check & Empty State
**File**: `src/pages/borrow/BorrowPage.tsx`

#### Current Flow
```tsx
// If no credit, show "Get Started" button → Opens DepositCollateralModal
{pageState === 'success_no_credit' && (
  <button onClick={() => setShowDepositModal(true)}>
    Deposit Collateral
  </button>
)}
```

#### Revamp To: Portfolio Holdings Check
```tsx
// Add new state
const [hasTokens, setHasTokens] = useState<boolean | null>(null);
const [portfolioAssets, setPortfolioAssets] = useState<PortfolioAsset[]>([]);

// Fetch portfolio on mount
useEffect(() => {
  if (address) {
    portfolioService.getPortfolio()
      .then(data => {
        setPortfolioAssets(data.portfolio);
        setHasTokens(data.portfolio.length > 0);
      })
      .catch(err => {
        console.error('Error checking portfolio:', err);
        setHasTokens(false);
      });
  }
}, [address]);

// Render gatekeeper if no tokens
{pageState === 'success_no_credit' && hasTokens === false && (
  <div className="bg-white rounded-[24px] p-12 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
    <div className="max-w-2xl mx-auto text-center">
      {/* Icon */}
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
        <Lock className="w-10 h-10 text-blue-600" />
      </div>

      {/* Heading */}
      <h2 className="text-2xl font-bold text-[#111111] mb-3">
        Get Started with Borrowing
      </h2>
      <p className="text-[#6B7280] mb-8">
        To borrow USDC, you'll need tokens to use as collateral. Choose one of the options below to get started:
      </p>

      {/* Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Option 1: Deposit Assets */}
        <div className="bg-[#F9FAFB] rounded-[16px] p-6 text-left hover:bg-[#F3F4F6] transition-colors cursor-pointer"
          onClick={() => navigate('/issuers')}>
          <div className="w-12 h-12 rounded-full bg-[#10B981] flex items-center justify-center mb-4">
            <Upload className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-[#111111] mb-2">
            Deposit Private Assets
          </h3>
          <p className="text-sm text-[#6B7280]">
            Tokenize and deposit your real-world assets to use as collateral
          </p>
        </div>

        {/* Option 2: Buy from Marketplace */}
        <div className="bg-[#F9FAFB] rounded-[16px] p-6 text-left hover:bg-[#F3F4F6] transition-colors cursor-pointer"
          onClick={() => navigate('/marketplace')}>
          <div className="w-12 h-12 rounded-full bg-[#3B82F6] flex items-center justify-center mb-4">
            <ShoppingCart className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-[#111111] mb-2">
            Buy Tokens from Marketplace
          </h3>
          <p className="text-sm text-[#6B7280]">
            Purchase tokenized assets from other users on the secondary marketplace
          </p>
        </div>
      </div>

      {/* Help Text */}
      <div className="flex items-start gap-2 text-left bg-blue-50 rounded-lg p-4">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-900">
          <strong>How it works:</strong> Once you have RWA tokens in your portfolio, you can deposit them as collateral and borrow up to 70% of their value in USDC.
        </div>
      </div>
    </div>
  </div>
)}
```

---

### Task 3: Create Unified Borrow Modal with Two-Step Flow
**New File**: `src/pages/borrow/components/UnifiedBorrowModal.tsx`

This modal combines deposit + borrow into one seamless experience.

#### Modal Structure

```tsx
interface UnifiedBorrowModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioAssets: PortfolioAsset[];
  onSuccess: () => void;
}

export const UnifiedBorrowModal = ({ isOpen, onClose, portfolioAssets, onSuccess }: UnifiedBorrowModalProps) => {
  // ============================================
  // STATE MANAGEMENT
  // ============================================

  // Step tracking
  const [currentStep, setCurrentStep] = useState<'input' | 'depositing' | 'borrowing'>('input');

  // Form state
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null);
  const [collateralToken, setCollateralToken] = useState<PortfolioAsset | null>(null);
  const [collateralAmount, setCollateralAmount] = useState('');
  const [borrowAmount, setBorrowAmount] = useState('');

  // Transaction state
  const [positionId, setPositionId] = useState<string | null>(null);
  const [depositTxHash, setDepositTxHash] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [isBorrowing, setIsBorrowing] = useState(false);

  // Validation state
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [maxBorrowable, setMaxBorrowable] = useState<string>('0');
  const [projectedHealthFactor, setProjectedHealthFactor] = useState<number | null>(null);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const collateralValueUSD = useMemo(() => {
    if (!collateralToken || !collateralAmount) return 0;
    const amount = parseFloat(collateralAmount);
    const price = parseFloat(collateralToken.price || '0');
    return amount * price;
  }, [collateralToken, collateralAmount]);

  const maxBorrowBasedOnCollateral = useMemo(() => {
    // 70% LTV for RWA tokens
    return collateralValueUSD * 0.7;
  }, [collateralValueUSD]);

  const isInputValid = useMemo(() => {
    return (
      selectedProtocol !== null &&
      collateralToken !== null &&
      parseFloat(collateralAmount) > 0 &&
      parseFloat(borrowAmount) > 0 &&
      validationStatus === 'valid'
    );
  }, [selectedProtocol, collateralToken, collateralAmount, borrowAmount, validationStatus]);

  const canDeposit = currentStep === 'input' && isInputValid;
  const canBorrow = currentStep === 'depositing' && positionId !== null;
  const isCompleted = currentStep === 'borrowing' && !isBorrowing;

  // ============================================
  // REAL-TIME VALIDATION (DEBOUNCED)
  // ============================================

  const debouncedValidation = useMemo(
    () =>
      debounce(async (amount: string, collateral: string, tokenAddress: string) => {
        if (!amount || parseFloat(amount) <= 0) {
          setValidationStatus('idle');
          return;
        }

        setValidationStatus('validating');

        try {
          // Call backend validation API
          const response = await solvencyService.validateBorrow({
            borrowAmount: amount,
            collateralToken: tokenAddress,
            collateralAmount: collateral,
            protocolId: selectedProtocol?.id || 'platform',
          });

          if (response.success && response.canBorrow) {
            setValidationStatus('valid');
            setValidationError(null);
            setMaxBorrowable(response.maxBorrowable);
            setProjectedHealthFactor(response.projectedHealthFactor);
          } else {
            setValidationStatus('invalid');
            setValidationError(response.reason || 'Cannot borrow this amount');
            setMaxBorrowable(response.maxBorrowable);
          }
        } catch (error) {
          console.error('Validation error:', error);
          setValidationStatus('invalid');
          setValidationError('Unable to validate borrow amount');
        }
      }, 500),
    [selectedProtocol]
  );

  // Trigger validation when borrow amount changes
  useEffect(() => {
    if (borrowAmount && collateralAmount && collateralToken) {
      debouncedValidation(borrowAmount, collateralAmount, collateralToken.tokenAddress);
    }
  }, [borrowAmount, collateralAmount, collateralToken, debouncedValidation]);

  // ============================================
  // TRANSACTION HANDLERS
  // ============================================

  const handleDepositCollateral = async () => {
    if (!collateralToken || !collateralAmount) return;

    try {
      setCurrentStep('depositing');
      setIsApproving(true);

      // Step 1: Approve token
      const tokenContract = new ethers.Contract(
        collateralToken.tokenAddress,
        ERC20_ABI,
        signer
      );

      const amountWei = ethers.parseUnits(collateralAmount, 18);
      const allowance = await tokenContract.allowance(address, VAULT_ADDRESS);

      if (allowance < amountWei) {
        const approveTx = await tokenContract.approve(VAULT_ADDRESS, amountWei);
        await approveTx.wait();
      }

      setIsApproving(false);
      setIsDepositing(true);

      // Step 2: Deposit collateral
      const valueUSD = ethers.parseUnits(collateralValueUSD.toFixed(6), 6);
      const depositTx = await vaultContract.depositCollateral(
        collateralToken.tokenAddress,
        amountWei,
        valueUSD,
        0, // tokenType: RWA
        true // issueOAID
      );

      const receipt = await depositTx.wait();
      setDepositTxHash(receipt.hash);

      // Step 3: Parse position ID from event
      let extractedPositionId: string | null = null;
      for (const log of receipt.logs) {
        try {
          const parsed = vaultContract.interface.parseLog({
            topics: log.topics as string[],
            data: log.data,
          });
          if (parsed && parsed.name === 'PositionCreated') {
            extractedPositionId = parsed.args.positionId.toString();
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!extractedPositionId) {
        throw new Error('Failed to extract position ID from transaction');
      }

      setPositionId(extractedPositionId);

      // Step 4: Sync with backend (MANDATORY)
      await solvencyService.syncPosition({
        positionId: extractedPositionId,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      });

      setIsDepositing(false);

      // Auto-proceed to borrow step
      // (Button will now show "Borrow USDC")

    } catch (error: any) {
      console.error('Deposit error:', error);
      setCurrentStep('input');
      setIsApproving(false);
      setIsDepositing(false);
      // Show error toast
    }
  };

  const handleBorrowUSDC = async () => {
    if (!positionId || !borrowAmount) return;

    try {
      setIsBorrowing(true);

      const amountWei = ethers.parseUnits(borrowAmount, 6); // USDC has 6 decimals

      const borrowTx = await vaultContract.borrowUSDC(
        positionId,
        amountWei
      );

      const receipt = await borrowTx.wait();

      // Sync with backend (MANDATORY)
      await solvencyService.syncPosition({
        positionId,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      });

      setIsBorrowing(false);

      // Success! Redirect to My Loans
      onSuccess();
      onClose();
      navigate('/portfolio?tab=loans');

    } catch (error: any) {
      console.error('Borrow error:', error);
      setIsBorrowing(false);
      // Show error toast
    }
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[540px] bg-[#F3F4F6] rounded-[24px] p-0 border-none">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[#111111]">Borrow Assets</h2>
            <button onClick={onClose} className="text-[#6B7280] hover:text-[#111111]">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Step Indicator (Optional) */}
          {currentStep !== 'input' && (
            <div className="mb-6 flex items-center justify-center gap-2">
              <div className={`w-2 h-2 rounded-full ${currentStep === 'depositing' ? 'bg-[#10B981]' : 'bg-[#D1D5DB]'}`} />
              <span className="text-xs text-[#6B7280]">Deposit Collateral</span>
              <div className="w-8 h-px bg-[#D1D5DB]" />
              <div className={`w-2 h-2 rounded-full ${currentStep === 'borrowing' ? 'bg-[#10B981]' : 'bg-[#D1D5DB]'}`} />
              <span className="text-xs text-[#6B7280]">Borrow USDC</span>
            </div>
          )}

          {/* Protocol Selection */}
          <div className="bg-white rounded-[20px] p-5 mb-4">
            <label className="text-sm text-[#6B7280] mb-3 block">Select Protocol</label>
            <Select
              value={selectedProtocol?.id || ''}
              onValueChange={(id) => {
                const protocol = protocols.find(p => p.id === id);
                setSelectedProtocol(protocol || null);
              }}
              disabled={currentStep !== 'input'}
            >
              <SelectTrigger className="w-full bg-[#F9FAFB] border-gray-200">
                <SelectValue placeholder="Choose lending protocol" />
              </SelectTrigger>
              <SelectContent>
                {protocols.map(protocol => (
                  <SelectItem key={protocol.id} value={protocol.id}>
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">{protocol.name}</span>
                      <span className="text-xs text-[#10B981] ml-4">{protocol.borrowRate}% APR</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Collateral Selection */}
          <div className="bg-white rounded-[20px] p-5 mb-4">
            <label className="text-sm text-[#6B7280] mb-3 block">Collateral Asset</label>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1">
                <Select
                  value={collateralToken?.tokenAddress || ''}
                  onValueChange={(address) => {
                    const asset = portfolioAssets.find(a => a.tokenAddress === address);
                    setCollateralToken(asset || null);
                  }}
                  disabled={currentStep !== 'input'}
                >
                  <SelectTrigger className="w-full bg-[#F9FAFB] border-gray-200">
                    <SelectValue placeholder="Select token" />
                  </SelectTrigger>
                  <SelectContent>
                    {portfolioAssets.map(asset => (
                      <SelectItem key={asset.tokenAddress} value={asset.tokenAddress}>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600"></div>
                          <div>
                            <div className="font-medium">{asset.metadata?.assetName || 'Unknown'}</div>
                            <div className="text-xs text-[#6B7280]">
                              Balance: {formatBalance(asset.balance, 18)}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Amount Input */}
            {collateralToken && (
              <>
                <input
                  type="text"
                  placeholder="0"
                  value={collateralAmount}
                  onChange={(e) => setCollateralAmount(e.target.value)}
                  disabled={currentStep !== 'input'}
                  className="bg-transparent text-[#111111] text-3xl font-bold outline-none w-full mb-2"
                />
                <div className="flex items-center justify-between text-xs text-[#6B7280]">
                  <div className="flex items-center gap-1">
                    <Wallet className="w-3 h-3" />
                    <span>Balance: {formatBalance(collateralToken.balance, 18)}</span>
                  </div>
                  <button
                    onClick={() => setCollateralAmount(formatBalance(collateralToken.balance, 18))}
                    className="text-[#111111] font-medium"
                    disabled={currentStep !== 'input'}
                  >
                    MAX
                  </button>
                </div>
                {collateralAmount && (
                  <div className="mt-2 text-sm text-[#6B7280]">
                    ≈ ${collateralValueUSD.toFixed(2)} USD
                  </div>
                )}
              </>
            )}
          </div>

          {/* Borrow Amount */}
          <div className="bg-white rounded-[20px] p-5 mb-4">
            <label className="text-sm text-[#6B7280] mb-3 block">Amount to Borrow</label>
            <div className="flex items-center justify-between mb-2">
              <input
                type="text"
                placeholder="0"
                value={borrowAmount}
                onChange={(e) => setBorrowAmount(e.target.value)}
                disabled={currentStep !== 'input'}
                className="bg-transparent text-[#111111] text-3xl font-bold outline-none flex-1"
              />
              <div className="flex items-center gap-2 bg-[#F3F4F6] px-3 py-2 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-[#2775CA] flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold">$</span>
                </div>
                <span className="text-sm font-medium">USDC</span>
              </div>
            </div>

            {/* Validation Feedback */}
            {validationStatus === 'validating' && (
              <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                <div className="w-3 h-3 border-2 border-[#6B7280] border-t-transparent rounded-full animate-spin" />
                <span>Validating...</span>
              </div>
            )}

            {validationStatus === 'valid' && (
              <div className="flex items-center gap-2 text-xs text-[#10B981]">
                <Check className="w-4 h-4" />
                <span>Valid amount</span>
                {projectedHealthFactor && (
                  <span className="ml-2 text-[#6B7280]">
                    Health Factor: <span className="font-semibold">{(projectedHealthFactor / 100).toFixed(2)}%</span>
                  </span>
                )}
              </div>
            )}

            {validationStatus === 'invalid' && (
              <div className="flex items-center gap-2 text-xs text-[#EF4444]">
                <X className="w-4 h-4" />
                <span>{validationError}</span>
              </div>
            )}

            {maxBorrowBasedOnCollateral > 0 && (
              <div className="mt-2 text-xs text-[#6B7280]">
                You can borrow up to <span className="text-[#111111] font-semibold">${maxBorrowBasedOnCollateral.toFixed(2)}</span> based on your collateral
              </div>
            )}
          </div>

          {/* Health Factor Preview (Compact) */}
          {projectedHealthFactor && borrowAmount && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 mb-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-[#6B7280] font-medium">Health Factor</span>
              </div>
              <div className={`text-xl font-bold ${projectedHealthFactor >= 14000 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                {(projectedHealthFactor / 100).toFixed(2)}%
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={() => {
              if (currentStep === 'input') {
                handleDepositCollateral();
              } else if (positionId) {
                handleBorrowUSDC();
              }
            }}
            disabled={
              (currentStep === 'input' && !canDeposit) ||
              isApproving ||
              isDepositing ||
              isBorrowing
            }
            className="w-full bg-[#111111] hover:bg-[#1a1a1a] text-white font-bold py-4 rounded-[20px] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isApproving && (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Approving Token...</span>
              </>
            )}
            {isDepositing && (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Depositing Collateral...</span>
              </>
            )}
            {isBorrowing && (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Borrowing USDC...</span>
              </>
            )}
            {!isApproving && !isDepositing && !isBorrowing && (
              <>
                {currentStep === 'input' ? (
                  <>
                    <span>Deposit Collateral</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                ) : (
                  <>
                    <span>Borrow ${borrowAmount} USDC</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </>
            )}
          </button>

          {/* Info Text */}
          <div className="mt-4 text-xs text-[#6B7280] leading-relaxed">
            <p>
              This is a two-step process: First, you'll deposit collateral to create a position. Then, you'll borrow USDC against that position.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

---

### Task 4: Add Real-time Validation with Debouncing
**File**: `src/lib/api/solvency.service.ts`

Add new validation endpoint:

```typescript
/**
 * Validate borrow amount against credit line and collateral
 * Used for real-time validation in borrow modal
 */
async validateBorrow(params: {
  borrowAmount: string;
  collateralToken: string;
  collateralAmount: string;
  protocolId: string;
}): Promise<{
  success: boolean;
  canBorrow: boolean;
  reason?: string;
  maxBorrowable: string;
  projectedHealthFactor: number;
}> {
  try {
    const response = await this.api.post('/solvency/validate-borrow', params);
    return response.data;
  } catch (error: any) {
    console.error('Validation error:', error);
    return {
      success: false,
      canBorrow: false,
      reason: error.response?.data?.message || 'Validation failed',
      maxBorrowable: '0',
      projectedHealthFactor: 0,
    };
  }
}
```

**Debounce Utility** (if not already exists):
```typescript
// src/utils/debounce.ts
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(later, wait);
  };
}
```

---

### Task 5: Update BorrowPage to Use Unified Modal

**File**: `src/pages/borrow/BorrowPage.tsx`

Replace separate modals with unified modal:

```tsx
import { UnifiedBorrowModal } from './components/UnifiedBorrowModal';

// Remove these states:
// const [showDepositModal, setShowDepositModal] = useState(false);
// const [showBorrowModal, setShowBorrowModal] = useState(false);
// const [showDirectBorrowModal, setShowDirectBorrowModal] = useState(false);

// Add new state:
const [showUnifiedBorrowModal, setShowUnifiedBorrowModal] = useState(false);

// Update handlers:
const handleStartBorrowing = () => {
  // Check if user has tokens first
  if (!hasTokens) {
    // Show gatekeeper (already rendered in page)
    return;
  }

  setShowUnifiedBorrowModal(true);
};

// In render:
<>
  {/* Existing page content */}

  {/* Replace all modal renders with single unified modal */}
  <UnifiedBorrowModal
    isOpen={showUnifiedBorrowModal}
    onClose={() => setShowUnifiedBorrowModal(false)}
    portfolioAssets={portfolioAssets}
    onSuccess={() => {
      refetchCredit();
      fetchPositions();
      // Optionally navigate to My Loans
    }}
  />
</>
```

---

### Task 6: Apply Clean UI Styling Throughout

#### Credit Summary Card Enhancement
**File**: `src/pages/borrow/components/CreditSummaryCard.tsx`

Apply TradingEngine styling:
```tsx
<div className="bg-white rounded-[24px] p-8 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
  {/* Large credit display */}
  <div className="mb-6">
    <h2 className="text-[56px] font-bold text-[#111111] leading-none tracking-tight">
      ${formatUSD(availableCredit)}
    </h2>
    <div className="text-sm text-[#6B7280] mt-2">
      Available Credit
    </div>
  </div>

  {/* Stats Grid */}
  <div className="grid grid-cols-3 gap-6">
    <div>
      <div className="text-sm text-[#6B7280] mb-1">Credit Limit</div>
      <div className="text-lg font-semibold text-[#111111]">${formatUSD(creditLimit)}</div>
    </div>
    <div>
      <div className="text-sm text-[#6B7280] mb-1">Credit Used</div>
      <div className="text-lg font-semibold text-[#111111]">${formatUSD(creditUsed)}</div>
    </div>
    <div>
      <div className="text-sm text-[#6B7280] mb-1">Utilization</div>
      <div className="text-lg font-semibold text-[#111111]">{utilizationRate}%</div>
    </div>
  </div>

  {/* Utilization Bar */}
  <div className="mt-6">
    <div className="h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-[#10B981] to-[#3B82F6] transition-all"
        style={{ width: `${utilizationRate}%` }}
      />
    </div>
  </div>
</div>
```

#### Health Monitor Banner Enhancement
**File**: `src/pages/borrow/components/HealthMonitorBanner.tsx`

```tsx
<div className={`rounded-[20px] p-6 flex items-center gap-4 ${
  healthStatus === 'critical' ? 'bg-red-50 border-2 border-red-200' :
  healthStatus === 'warning' ? 'bg-yellow-50 border-2 border-yellow-200' :
  'bg-green-50 border-2 border-green-200'
}`}>
  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
    healthStatus === 'critical' ? 'bg-red-100' :
    healthStatus === 'warning' ? 'bg-yellow-100' :
    'bg-green-100'
  }`}>
    <AlertTriangle className={`w-6 h-6 ${
      healthStatus === 'critical' ? 'text-red-600' :
      healthStatus === 'warning' ? 'text-yellow-600' :
      'text-green-600'
    }`} />
  </div>

  <div className="flex-1">
    <h3 className="text-lg font-semibold text-[#111111] mb-1">
      {healthStatus === 'critical' ? 'Critical Health Factor' :
       healthStatus === 'warning' ? 'Warning: Low Health Factor' :
       'Healthy Position'}
    </h3>
    <p className="text-sm text-[#6B7280]">
      {healthStatus === 'critical'
        ? 'Your position is at risk of liquidation. Repay loan or add collateral immediately.'
        : 'Consider repaying part of your loan or adding more collateral to improve your health factor.'}
    </p>
  </div>

  <div className="text-right">
    <div className={`text-3xl font-bold ${
      healthStatus === 'critical' ? 'text-red-600' :
      healthStatus === 'warning' ? 'text-yellow-600' :
      'text-green-600'
    }`}>
      {(healthFactor / 100).toFixed(2)}%
    </div>
    <div className="text-xs text-[#6B7280]">Health Factor</div>
  </div>
</div>
```

---

## API Integration Checklist

### Existing APIs (Verified)
- ✅ `GET /solvency/oaid/my-credit` - Credit line data
- ✅ `GET /solvency/positions/my` - User positions
- ✅ `POST /solvency/sync-position` - Sync after transactions
- ✅ `GET /marketplace/portfolio` - User token holdings
- ✅ `GET /assets/{assetId}` - Asset details

### New API Needed
- ⚠️ `POST /solvency/validate-borrow` - Real-time validation
  - Request: `{ borrowAmount, collateralToken, collateralAmount, protocolId }`
  - Response: `{ canBorrow, maxBorrowable, projectedHealthFactor, reason }`

---

## File Changes Summary

### New Files
1. `src/pages/borrow/components/UnifiedBorrowModal.tsx` (~600 lines)
2. `src/utils/debounce.ts` (~15 lines)
3. `docs/BORROW_REVAMP_PLAN.md` (this file)

### Modified Files
1. `src/components/portfolio/MyLoansTable.tsx` - Complete redesign (~150 lines)
2. `src/pages/borrow/BorrowPage.tsx` - Add gatekeeper, update modal usage (~50 line changes)
3. `src/lib/api/solvency.service.ts` - Add validateBorrow method (~25 lines)
4. `src/pages/borrow/components/CreditSummaryCard.tsx` - Enhanced styling (~30 line changes)
5. `src/pages/borrow/components/HealthMonitorBanner.tsx` - Enhanced styling (~20 line changes)

### Deprecated Files (Keep for Reference)
- `src/pages/borrow/components/DepositCollateralModal.tsx` - Logic reused in UnifiedBorrowModal
- `src/pages/borrow/components/DirectBorrowModal.tsx` - Logic reused in UnifiedBorrowModal
- `src/pages/borrow/components/BorrowModal.tsx` - 3rd party protocols (future use)

---

## Testing Checklist

### Unit Testing
- [ ] Real-time validation debouncing works correctly
- [ ] Health factor calculations are accurate
- [ ] Collateral value USD computation correct
- [ ] Max borrowable amount calculation correct

### Integration Testing
- [ ] Gatekeeper shows when user has no tokens
- [ ] Portfolio assets load correctly in modal
- [ ] Protocol selection works
- [ ] Collateral token selection and amount input work
- [ ] Borrow amount validation triggers correctly
- [ ] Validation API returns expected responses

### Transaction Testing
- [ ] Token approval transaction succeeds
- [ ] Deposit collateral transaction succeeds
- [ ] Position ID is extracted from event correctly
- [ ] Backend sync succeeds after deposit
- [ ] Input fields freeze after deposit
- [ ] Borrow USDC transaction succeeds
- [ ] Backend sync succeeds after borrow
- [ ] User is redirected to My Loans after success

### UI/UX Testing
- [ ] My Loans table displays correctly (card grid)
- [ ] Empty state shows with proper CTAs
- [ ] Filters and sorting work in My Loans
- [ ] Health factor colors are correct
- [ ] Modal is responsive on mobile
- [ ] Loading states are clear
- [ ] Error messages are user-friendly
- [ ] Tooltips and info icons work

---

## Implementation Timeline Estimate

### Phase 1: Foundation (No timeline estimates, just phases)
- Set up UnifiedBorrowModal component structure
- Implement state management and form validation
- Add debounced validation logic

### Phase 2: My Loans Enhancement
- Redesign MyLoansTable with card-based layout
- Add filters and sorting
- Implement enhanced empty state

### Phase 3: Gatekeeper & Flow
- Add portfolio holdings check in BorrowPage
- Build gatekeeper UI for users without tokens
- Integrate UnifiedBorrowModal into BorrowPage

### Phase 4: Transaction Flow
- Implement deposit collateral handler
- Implement borrow USDC handler
- Add position ID extraction and backend syncing
- Add success redirect to My Loans

### Phase 5: Polish & Testing
- Apply TradingEngine styling throughout
- Enhance CreditSummaryCard and HealthMonitorBanner
- Test all transaction flows end-to-end
- Fix bugs and edge cases

---

## Success Metrics

### UX Improvements
- ✅ Single unified modal replaces 3 separate modals
- ✅ Real-time validation prevents errors before transaction
- ✅ Clear gatekeeper guides users without tokens
- ✅ Card-based My Loans table is more visual and informative
- ✅ Two-step flow is clear with loading states

### Technical Improvements
- ✅ Reuse existing smart contract and API infrastructure
- ✅ Type-safe throughout with existing types
- ✅ Debounced validation reduces API calls
- ✅ Proper error handling at each step
- ✅ Mandatory backend sync ensures data consistency

---

## Notes for Implementation

1. **Preserve Existing Logic**: The current smart contract integration and transaction flows are production-ready. Reuse this logic in the new UnifiedBorrowModal.

2. **Backend Validation API**: If the `POST /solvency/validate-borrow` endpoint doesn't exist yet, coordinate with backend team or implement client-side validation as a fallback.

3. **Protocol Selection**: Currently only "Platform Direct" is functional. The modal should be designed to easily add 3rd party protocols (Aave, Compound) when ready.

4. **Mobile Responsiveness**: Ensure the modal works well on mobile devices with responsive breakpoints.

5. **Error Recovery**: If a transaction fails mid-flow (e.g., deposit succeeds but sync fails), provide clear options to retry or contact support.

6. **Gas Estimation**: Consider adding gas estimation before transactions so users know the cost upfront.

7. **Transaction History**: Consider adding a "Recent Transactions" section to help users track their actions.

---

## Conclusion

This revamp focuses on **UI/UX improvements** while leveraging the solid foundation of existing smart contract integration and backend APIs. The key improvements are:

1. **Simplified Flow**: One modal instead of three
2. **Proactive Guidance**: Gatekeeper prevents dead-ends
3. **Real-time Feedback**: Validation as you type
4. **Visual Appeal**: Clean, modern design inspired by TradingEngine
5. **Better Information**: Card-based My Loans table with rich data

All changes are **additive and non-breaking** - existing functionality remains intact while we enhance the user experience.
