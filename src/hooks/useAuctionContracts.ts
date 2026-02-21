// src/hooks/useAuctionContracts.ts
// Wagmi Hooks for Auction Contract Interactions
// 100% Script-Verified from investor-bidding.sh, investor-settle.sh, admin-endauction.sh

import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount } from 'wagmi';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useNetwork } from '../lib/network/NetworkContext';
import freighterApi, { isConnected, signTransaction, setAllowed } from '@stellar/freighter-api';
import * as StellarSdk from '@stellar/stellar-sdk';
import { assetService } from '../lib/api/asset.service';
import {
  CONTRACTS,
  USDC_ABI,
  MARKETPLACE_ABI,
  IDENTITY_REGISTRY_ABI,
  uuidToBytes32,
  parseTokenAmount,
  parseUSDC,
  calculateDepositNeeded,
  type BidSubmissionParams,
  type BidSettlementParams,
  type EndAuctionParams,
} from '../lib/blockchain/auction.contract';
import { marketplaceService } from '../lib/api/marketplace.service';

/**
 * Hook for submitting bids to auctions
 * VERIFIED: investor-bidding.sh lines 284-375
 *
 * Flow:
 * 1. Check USDC allowance
 * 2. Approve USDC if needed
 * 3. Submit bid to contract
 * 4. Notify backend
 */
/**
 * Parse error message from contract revert/RPC error
 * Extracts user-friendly message from various error formats
 */
function parseErrorMessage(error: any): string {
  // Handle wagmi/viem contract revert errors
  if (error?.cause?.reason) {
    return error.cause.reason;
  }

  // Handle direct revert reason
  if (error?.reason) {
    return error.reason;
  }

  // Handle execution reverted errors with extracted reason
  if (error?.message) {
    // Extract reason from "execution reverted: <reason>" format
    const revertMatch = error.message.match(/execution reverted:?\s*(.+?)(\n|$)/i);
    if (revertMatch) {
      return revertMatch[1].trim();
    }

    // Extract reason from "reverted with reason string '<reason>'" format
    const reasonMatch = error.message.match(/reverted with reason string ['"](.*?)['"]/i);
    if (reasonMatch) {
      return reasonMatch[1];
    }

    // Extract custom error name
    const customErrorMatch = error.message.match(/reverted with custom error ['"](.*?)['"]/i);
    if (customErrorMatch) {
      return `Contract error: ${customErrorMatch[1]}`;
    }

    // User rejected transaction
    if (error.message.includes('User rejected') || error.message.includes('user rejected')) {
      return 'Transaction cancelled by user';
    }

    // Insufficient funds
    if (error.message.includes('insufficient funds') || error.message.includes('InsufficientFunds')) {
      return 'Insufficient funds for transaction';
    }

    // Network/RPC errors
    if (error.message.includes('network') || error.message.includes('timeout')) {
      return 'Network error. Please try again';
    }

    // Return cleaned message (remove stack traces, etc.)
    const cleanMessage = error.message.split('\n')[0];
    if (cleanMessage.length < 100) {
      return cleanMessage;
    }
  }

  // Fallback
  return 'Transaction failed. Please try again';
}

export function useSubmitBid() {
  const { address } = useAccount();
  const [status, setStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingBidParams, setPendingBidParams] = useState<BidSubmissionParams | null>(null);

  // Contract write hooks
  const {
    writeContract: approveUSDC,
    data: approveHash,
    isPending: isApproving,
    error: approveError,
  } = useWriteContract();

  const {
    writeContract: submitBidTx,
    data: bidHash,
    isPending: isSubmitting,
    error: bidError,
  } = useWriteContract();

  // Wait for transactions
  const {
    isLoading: isApprovePending,
    isSuccess: isApproveSuccess,
    error: approveReceiptError,
  } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const {
    isLoading: isBidPending,
    isSuccess: isBidSuccess,
    data: bidReceipt,
    error: bidReceiptError,
  } = useWaitForTransactionReceipt({
    hash: bidHash,
  });

  // Read USDC allowance
  const { data: currentAllowance } = useReadContract({
    address: CONTRACTS.USDC as `0x${string}`,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.PrimaryMarketplace as `0x${string}`] : undefined,
  });

  // Handle approval errors
  useEffect(() => {
    if (approveError) {
      const errorMsg = parseErrorMessage(approveError);
      console.error('❌ USDC Approval Error:', errorMsg);
      setError(errorMsg);
      setStatus(`Approval failed: ${errorMsg}`);
      setIsLoading(false);
      setPendingBidParams(null);
    }
  }, [approveError]);

  // Handle approval receipt errors (transaction failed on-chain)
  useEffect(() => {
    if (approveReceiptError) {
      const errorMsg = parseErrorMessage(approveReceiptError);
      console.error('❌ USDC Approval Transaction Failed:', errorMsg);
      setError(errorMsg);
      setStatus(`Approval failed: ${errorMsg}`);
      setIsLoading(false);
      setPendingBidParams(null);
    }
  }, [approveReceiptError]);

  // Handle bid submission errors
  useEffect(() => {
    if (bidError) {
      const errorMsg = parseErrorMessage(bidError);
      console.error('❌ Bid Submission Error:', errorMsg);
      setError(errorMsg);
      setStatus(`Bid submission failed: ${errorMsg}`);
      setIsLoading(false);
      setPendingBidParams(null);
    }
  }, [bidError]);

  // Handle bid receipt errors (transaction failed on-chain)
  useEffect(() => {
    if (bidReceiptError) {
      const errorMsg = parseErrorMessage(bidReceiptError);
      console.error('❌ Bid Transaction Failed:', errorMsg);
      setError(errorMsg);
      setStatus(`Bid failed: ${errorMsg}`);
      setIsLoading(false);
      setPendingBidParams(null);
    }
  }, [bidReceiptError]);

  // CRITICAL: Auto-submit bid after approval succeeds (investor-bidding.sh flow)
  useEffect(() => {
    if (isApproveSuccess && pendingBidParams) {
      console.log('✅ USDC approval confirmed! Auto-submitting bid...');
      console.log('📦 Pending bid params:', pendingBidParams);

      // Convert parameters
      const assetIdBytes32 = uuidToBytes32(pendingBidParams.assetId);
      const tokenAmountWei = parseTokenAmount(pendingBidParams.tokenAmount);
      const priceWei = parseUSDC(pendingBidParams.pricePerToken);

      setStatus('Submitting bid on-chain...');
      console.log('🔨 Submitting bid to contract...');
      console.log('🔨 Contract address:', CONTRACTS.PrimaryMarketplace);
      console.log('🔨 Args:', [assetIdBytes32, tokenAmountWei.toString(), priceWei.toString()]);

      try {
        submitBidTx({
          address: CONTRACTS.PrimaryMarketplace as `0x${string}`,
          abi: MARKETPLACE_ABI,
          functionName: 'submitBid',
          args: [assetIdBytes32, tokenAmountWei, priceWei],
        });
        console.log('✅ Bid submission transaction triggered');
        // Clear pending params
        setPendingBidParams(null);
      } catch (error: any) {
        console.error('❌ Error triggering bid submission:', error);
        setStatus(`Error: ${error.message}`);
        setIsLoading(false);
        setPendingBidParams(null);
      }
    }
  }, [isApproveSuccess, pendingBidParams, submitBidTx]);

  // CRITICAL: Auto-notify backend after bid transaction succeeds (investor-bidding.sh line 362)
  const lastBidParamsRef = useRef<BidSubmissionParams | null>(null);
  const notificationSentRef = useRef<string | null>(null);

  useEffect(() => {
    const handleBidSuccess = async () => {
      if (isBidSuccess && bidHash && lastBidParamsRef.current && bidReceipt) {
        // Prevent duplicate notifications for the same transaction
        if (notificationSentRef.current === bidHash) {
          console.log('⏭️ Notification already sent for this transaction');
          return;
        }

        console.log('✅ Bid transaction confirmed!');
        console.log('📝 Bid hash:', bidHash);

        try {
          setStatus('In progress..');

          const tokenAmountWei = parseTokenAmount(lastBidParamsRef.current.tokenAmount);
          const priceWei = parseUSDC(lastBidParamsRef.current.pricePerToken);

          // Call backend notification API
          await marketplaceService.notifyBidPlaced({
            txHash: bidHash,
            assetId: lastBidParamsRef.current.assetId,
            tokenAmount: tokenAmountWei.toString(),
            price: priceWei.toString(),
          });

          console.log('✅ Backend notified successfully');
          setStatus('Bid submitted successfully! 🎉');

          // Mark this transaction as notified
          notificationSentRef.current = bidHash;

          // Reset loading state
          setIsLoading(false);

          // Clear the stored params after successful notification
          lastBidParamsRef.current = null;

          // Redirect to portfolio after 1 second
          setTimeout(() => {
            window.location.href = '/portfolio';
          }, 1000);
        } catch (error: any) {
          console.error('❌ Error notifying backend:', error);
          setStatus(`Backend notification failed: ${error.message}`);
          setIsLoading(false);
        }
      }
    };

    handleBidSuccess();
  }, [isBidSuccess, bidHash, bidReceipt]);

  const submitBid = useCallback(
    async (params: BidSubmissionParams) => {
      console.log('🎯 submitBid called with params:', params);
      console.log('🎯 Current address:', address);
      console.log('🎯 Current allowance:', currentAllowance?.toString());

      if (!address) {
        throw new Error('Wallet not connected');
      }

      // Clear previous errors
      setError(null);

      // Store params for backend notification after success
      lastBidParamsRef.current = params;

      setIsLoading(true);
      setStatus('Preparing bid...');

      try {
        // Convert parameters to contract format
        console.log('🔄 Converting parameters...');
        const assetIdBytes32 = uuidToBytes32(params.assetId);
        const tokenAmountWei = parseTokenAmount(params.tokenAmount);
        const priceWei = parseUSDC(params.pricePerToken);

        // Calculate deposit needed (investor-bidding.sh line 273)
        const depositNeeded = calculateDepositNeeded(priceWei, tokenAmountWei);

        console.log('✅ Bid parameters converted:', {
          assetId: params.assetId,
          assetIdBytes32,
          tokenAmount: params.tokenAmount,
          tokenAmountWei: tokenAmountWei.toString(),
          pricePerToken: params.pricePerToken,
          priceWei: priceWei.toString(),
          depositNeeded: depositNeeded.toString(),
        });

        // Step 1: Check and approve USDC if needed (investor-bidding.sh lines 285-293)
        const allowance = currentAllowance as bigint | undefined;
        console.log('🔍 Checking allowance:', {
          currentAllowance: allowance?.toString() || '0',
          depositNeeded: depositNeeded.toString(),
          needsApproval: !allowance || allowance < depositNeeded,
        });

        if (!allowance || allowance < depositNeeded) {
          setStatus('Approving USDC...');
          console.log('💰 Approving USDC:', depositNeeded.toString());
          console.log('💰 Contract addresses:', {
            USDC: CONTRACTS.USDC,
            Marketplace: CONTRACTS.PrimaryMarketplace,
          });

          // Store params for auto-submit after approval
          setPendingBidParams(params);
          console.log('📦 Stored pending bid params for auto-submit after approval');

          try {
            approveUSDC({
              address: CONTRACTS.USDC as `0x${string}`,
              abi: USDC_ABI,
              functionName: 'approve',
              args: [CONTRACTS.PrimaryMarketplace as `0x${string}`, depositNeeded],
            });
            console.log('✅ USDC approval transaction triggered');
            console.log('⏳ Waiting for approval confirmation... (useEffect will auto-submit bid)');
          } catch (approveError: any) {
            console.error('❌ Error triggering USDC approval:', approveError);
            setPendingBidParams(null); // Clear on error
            throw new Error(`Failed to approve USDC: ${approveError.message}`);
          }

          // DON'T return - useEffect will handle bid submission after approval
          return { requiresApproval: true };
        }

        // Step 2: Submit bid to contract (investor-bidding.sh line 297)
        setStatus('Submitting bid on-chain...');
        console.log('🔨 Submitting bid to contract...');
        console.log('🔨 Contract address:', CONTRACTS.PrimaryMarketplace);
        console.log('🔨 Args:', [assetIdBytes32, tokenAmountWei.toString(), priceWei.toString()]);

        try {
          submitBidTx({
            address: CONTRACTS.PrimaryMarketplace as `0x${string}`,
            abi: MARKETPLACE_ABI,
            functionName: 'submitBid',
            args: [assetIdBytes32, tokenAmountWei, priceWei],
          });
          console.log('✅ Bid submission transaction triggered');
        } catch (submitError: any) {
          console.error('❌ Error triggering bid submission:', submitError);
          throw new Error(`Failed to submit bid: ${submitError.message}`);
        }

        // Step 3: Wait for transaction and notify backend
        // (handled by useEffect when isBidSuccess changes)

        return { requiresApproval: false };
      } catch (error: any) {
        console.error('❌ Error in submitBid:', error);
        setStatus(`Error: ${error.message}`);
        setIsLoading(false);
        throw error;
      }
    },
    [address, currentAllowance, approveUSDC, submitBidTx]
  );

  // Reset error and status
  const reset = useCallback(() => {
    setError(null);
    setStatus('');
    setIsLoading(false);
    setPendingBidParams(null);
  }, []);

  return {
    submitBid,
    status,
    error,
    isLoading: isLoading || isApproving || isSubmitting || isApprovePending || isBidPending,
    isApproving: isApproving || isApprovePending,
    isSubmitting: isSubmitting || isBidPending,
    isBidSuccess,
    bidHash,
    approveHash,
    reset,
  };
}

/**
 * Hook for settling/claiming bids after auction ends
 * VERIFIED: investor-settle.sh lines 185-275
 *
 * Flow:
 * 1. Call settleBid on contract
 * 2. Notify backend
 */
export function useSettleBid() {
  const { address } = useAccount();
  const { networkType } = useNetwork();
  const [status, setStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastSettleParamsRef = useRef<BidSettlementParams | null>(null);
  const notificationSentRef = useRef<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    writeContract: settleBidTx,
    data: txHash,
    isPending: isSubmitting,
    error: submitError,
  } = useWriteContract();

  const {
    isLoading: isPending,
    isSuccess,
    data: receipt,
    error: receiptError
  } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Handle submit errors
  useEffect(() => {
    if (submitError) {
      const errorMsg = parseErrorMessage(submitError);
      console.error('❌ Settlement Submission Error:', errorMsg);
      setError(errorMsg);
      setStatus('');
      setIsLoading(false);
      lastSettleParamsRef.current = null;

      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [submitError]);

  // Handle receipt errors (transaction failed on-chain)
  useEffect(() => {
    if (receiptError) {
      const errorMsg = parseErrorMessage(receiptError);
      console.error('❌ Settlement Transaction Failed:', errorMsg);
      setError(errorMsg);
      setStatus('');
      setIsLoading(false);
      lastSettleParamsRef.current = null;

      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [receiptError]);

  const settleBid = useCallback(
    async (params: BidSettlementParams) => {
      // Clear previous errors
      setError(null);
      setIsLoading(true);
      setStatus('Settling bid on-chain...');

      // Store params for auto-notification after success
      lastSettleParamsRef.current = params;

      // Set a timeout to prevent infinite loading (30 seconds)
      timeoutRef.current = setTimeout(() => {
        if (isLoading && !isSuccess && networkType !== 'stellar') {
          console.error('❌ Settlement transaction timeout');
          setError('Transaction timeout. Please check your wallet and try again.');
          setStatus('');
          setIsLoading(false);
          lastSettleParamsRef.current = null;
        }
      }, 30000);

      try {
        if (networkType === 'stellar') {
          if (!(await isConnected())) {
            throw new Error("Freighter wallet not found");
          }
          await setAllowed();

          const { address: stellarAddress } = await freighterApi.getAddress();
          if (!stellarAddress) throw new Error("Could not get wallet address");

          const primaryMarketId = import.meta.env.VITE_STELLAR_PRIMARY_MARKET || "CB2N3N2TDF47NTARJ6JRUMYX434GSP2HLI5N5RTVJKOX4NL7NZYMBZIK";
          const HORIZON_URL = import.meta.env.VITE_STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
          const RPC_URL = import.meta.env.VITE_STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org';
          const NETWORK_PASSPHRASE = import.meta.env.VITE_STELLAR_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015';

          // Fetch Asset details to get assetCode
          setStatus('Fetching asset details...');
          const assetDetails: any = await assetService.getAssetById(params.assetId);
          if (!assetDetails || !assetDetails.token || !assetDetails.token.address) {
            throw new Error(`Asset not found or no token deployed for ${params.assetId}`);
          }
          const assetCode = assetDetails.token.address.split(':')[0];

          setStatus('Simulating settlement...');
          const horizonServer = new StellarSdk.Horizon.Server(HORIZON_URL);
          const source = await horizonServer.loadAccount(stellarAddress);
          const contract = new StellarSdk.Contract(primaryMarketId);

          const txBuilder = new StellarSdk.TransactionBuilder(source, {
            fee: StellarSdk.BASE_FEE,
            networkPassphrase: NETWORK_PASSPHRASE,
          }).addOperation(
            contract.call(
              'settle_bid',
              new StellarSdk.Address(stellarAddress).toScVal(), // caller
              StellarSdk.nativeToScVal(assetCode, { type: 'string' }), // asset_code
              StellarSdk.nativeToScVal(BigInt(params.bidIndex), { type: 'u64' }) // bid_index
            )
          );

          const tx = txBuilder.setTimeout(30).build();
          const rpcServer = new StellarSdk.rpc.Server(RPC_URL);
          const simulation = await rpcServer.simulateTransaction(tx);

          if (!StellarSdk.rpc.Api.isSimulationSuccess(simulation)) {
            throw new Error(`Simulation failed: ${(simulation as any).error || 'Unknown error'}`);
          }

          setStatus('Awaiting signature...');
          const assembled = StellarSdk.rpc.assembleTransaction(tx, simulation).build();
          const signed = await signTransaction(assembled.toXDR(), { networkPassphrase: NETWORK_PASSPHRASE });
          if (!signed) throw new Error("User denied signature");

          setStatus('Submitting to Stellar network...');
          const signedTx = new StellarSdk.Transaction(signed.signedTxXdr, NETWORK_PASSPHRASE);
          const response = await rpcServer.sendTransaction(signedTx);

          if ((response as any).status !== "PENDING" && (response as any).status !== "SUCCESS") {
            throw new Error(`Transaction failed: ${JSON.stringify(response)}`);
          }

          // Wait for network confirmation
          let txResult;
          let attempts = 0;
          do {
            await new Promise(r => setTimeout(r, 3000));
            txResult = await rpcServer.getTransaction(response.hash);
            attempts++;
            if (attempts > 20) throw new Error('Confirmation timeout after 60 seconds');
          } while ((txResult as any).status === 'NOT_FOUND' || (txResult as any).status === 'PENDING');

          if ((txResult as any).status !== 'SUCCESS') {
            throw new Error('Transaction failed: ' + (txResult as any).status);
          }

          console.log('✅ Stellar Settlement confirmed! Notifying backend...');
          setStatus('Notifying backend...');
          let tokensReceived = '0';
          let cost = '0';
          let refund = '0';

          try {
            if ((txResult as any).resultMetaXdr) {
              const meta = (txResult as any).resultMetaXdr;
              const v3 = meta.v3 ? meta.v3() : null;
              if (v3 && v3.sorobanMeta && v3.sorobanMeta()) {
                const sorobanMeta = v3.sorobanMeta();
                const events = sorobanMeta.events ? sorobanMeta.events() : [];
                for (const event of events) {
                  const topics = event.body().v0 ? event.body().v0().topics() : [];
                  const hasSettled = topics.some((t: any) => {
                    try { return StellarSdk.scValToNative(t) === 'BidSettled'; } catch { return false; }
                  });
                  if (hasSettled) {
                    const data = StellarSdk.scValToNative(event.body().v0().data());
                    if (Array.isArray(data) && data.length >= 5) {
                      tokensReceived = data[2].toString();
                      cost = data[3].toString();
                      refund = data[4].toString();
                    }
                  }
                }
              }
            }
          } catch (evtErr) {
            console.warn('Event decode skipped:', evtErr);
          }

          await marketplaceService.notifyBidSettled({
            assetId: params.assetId,
            bidIndex: params.bidIndex,
            txHash: response.hash,
            blockNumber: (txResult as any).ledger ? (txResult as any).ledger.toString() : '0',
            network: 'stellar',
            ledger: (txResult as any).ledger ? (txResult as any).ledger.toString() : '0',
            tokensReceived,
            cost,
            refund
          });

          notificationSentRef.current = response.hash;
          setStatus('Bid settled successfully! 🎉');
          setIsLoading(false);
          lastSettleParamsRef.current = null;
          if (timeoutRef.current) clearTimeout(timeoutRef.current);

          setTimeout(() => {
            window.location.reload();
          }, 1000);

          return;
        }

        if (!address) {
          throw new Error('Wallet not connected');
        }

        // Convert parameters
        const assetIdBytes32 = uuidToBytes32(params.assetId);

        console.log('Settling bid:', {
          assetId: params.assetId,
          assetIdBytes32,
          bidIndex: params.bidIndex,
        });

        // Call settleBid on contract (investor-settle.sh line 192)
        settleBidTx({
          address: CONTRACTS.PrimaryMarketplace as `0x${string}`,
          abi: MARKETPLACE_ABI,
          functionName: 'settleBid',
          args: [assetIdBytes32, BigInt(params.bidIndex)],
        });
      } catch (error: any) {
        const errorMsg = parseErrorMessage(error);
        console.error('❌ Error settling bid:', errorMsg);
        setError(errorMsg);
        setStatus('');
        setIsLoading(false);
        lastSettleParamsRef.current = null;

        // Clear timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        throw error;
      }
    },
    [address, settleBidTx, isLoading, isSuccess, networkType]
  );

  // CRITICAL: Auto-notify backend after settlement succeeds (investor-settle.sh line 264)
  useEffect(() => {
    const handleSettleSuccess = async () => {
      if (isSuccess && txHash && lastSettleParamsRef.current && receipt) {
        // Clear timeout on success
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        // Prevent duplicate notifications
        if (notificationSentRef.current === txHash) {
          return;
        }

        try {
          setStatus('Notifying backend...');
          console.log('✅ Settlement confirmed! Notifying backend...');

          await marketplaceService.notifyBidSettled({
            assetId: lastSettleParamsRef.current.assetId,
            bidIndex: lastSettleParamsRef.current.bidIndex,
            txHash,
            blockNumber: receipt.blockNumber.toString(),
          });

          notificationSentRef.current = txHash;
          setStatus('Bid settled successfully! 🎉');
          setIsLoading(false);
          lastSettleParamsRef.current = null;

          console.log('✅ Backend notified successfully!');

          // Refresh page after 1 second to show updated portfolio
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } catch (error: any) {
          console.error('❌ Backend notification failed:', error);
          setError(`Settlement complete, but backend notification failed: ${error.message}`);
          setStatus('');
          setIsLoading(false);
        }
      }
    };

    handleSettleSuccess();
  }, [isSuccess, txHash, receipt]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Reset error and status
  const reset = useCallback(() => {
    setError(null);
    setStatus('');
    setIsLoading(false);
    lastSettleParamsRef.current = null;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return {
    settleBid,
    status,
    error,
    isLoading: isLoading || isSubmitting || isPending,
    isSuccess,
    txHash,
    reset,
  };
}

/**
 * Hook for ending auctions (Admin only)
 * VERIFIED: admin-endauction.sh lines 158-275
 *
 * Flow:
 * 1. Call endAuction on contract
 * 2. Notify backend
 */
export function useEndAuction() {
  const { address } = useAccount();
  const [status, setStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    writeContract: endAuctionTx,
    data: txHash,
    isPending: isSubmitting,
  } = useWriteContract();

  const { isLoading: isPending, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const endAuction = useCallback(
    async (params: EndAuctionParams) => {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      setIsLoading(true);
      setStatus('Ending auction on-chain...');

      try {
        // Check if Stellar (address not 0x)
        if (!address.startsWith('0x')) {
          // Stellar Flow
          // We need asset details to get code/issuer... Params only has assetId.
          // This hook might need refactoring to support Stellar fully if used outside Admin Listings page.
          // For now, let's assume this hook is primarily EVM-focused or we need to fetch asset.
          // Given the Listings page implements it manually, maybe we leave this as EVM-only or add a TODO.
          // But for completeness, let's add a basic check or error.
          console.log("Stellar end auction should be handled via stellarService directly or updated hook.");

          // If we want to support it here, we'd need to fetch asset details first.
          // For now, let's throw if trying to use this hook on Stellar without proper implementation
          // OR we can import stellarService and try to do it if we had the code/issuer.
          throw new Error("Stellar End Auction via this hook is not yet fully implemented. Please use the Admin Listings page.");
        }

        // EVM Flow
        // Convert parameters
        const assetIdBytes32 = uuidToBytes32(params.assetId);
        const clearingPriceWei = parseUSDC(params.clearingPrice);

        console.log('Ending auction:', {
          assetId: params.assetId,
          assetIdBytes32,
          clearingPrice: params.clearingPrice,
          clearingPriceWei: clearingPriceWei.toString(),
        });

        // Call endAuction on contract (admin-endauction.sh line 205)
        endAuctionTx({
          address: CONTRACTS.PrimaryMarketplace as `0x${string}`,
          abi: MARKETPLACE_ABI,
          functionName: 'endAuction',
          args: [assetIdBytes32, clearingPriceWei],
        });
      } catch (error: any) {
        console.error('Error ending auction:', error);
        setStatus(`Error: ${error.message}`);
        setIsLoading(false);
        throw error;
      }
    },
    [address, endAuctionTx]
  );

  // Notify backend after successful end (admin-endauction.sh line 260)
  const notifyBackend = useCallback(
    async (params: EndAuctionParams, txHash: string) => {
      setStatus('Notifying backend...');

      const clearingPriceWei = parseUSDC(params.clearingPrice);

      await marketplaceService.endAuction(params.assetId, clearingPriceWei.toString(), txHash);

      setStatus('Auction ended successfully! 🎉');
      setIsLoading(false);
    },
    []
  );

  return {
    endAuction,
    notifyBackend,
    status,
    isLoading: isLoading || isSubmitting || isPending,
    isSuccess,
    txHash,
  };
}

/**
 * Hook to check KYC status
 * VERIFIED: investor-bidding.sh lines 74-136
 */
export function useCheckKYC() {
  const { address } = useAccount();

  const { data: isVerified, isLoading } = useReadContract({
    address: CONTRACTS.IdentityRegistry as `0x${string}`,
    abi: IDENTITY_REGISTRY_ABI,
    functionName: 'isVerified',
    args: address ? [address] : undefined,
  });

  return {
    isVerified: !!isVerified,
    isLoading,
    address,
  };
}
