// src/hooks/useAuctionContracts.ts
// Wagmi Hooks for Auction Contract Interactions
// 100% Script-Verified from investor-bidding.sh, investor-settle.sh, admin-endauction.sh

import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount } from 'wagmi';
import { useState, useCallback } from 'react';
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
export function useSubmitBid() {
  const { address } = useAccount();
  const [status, setStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  // Contract write hooks
  const {
    writeContract: approveUSDC,
    data: approveHash,
    isPending: isApproving,
  } = useWriteContract();

  const {
    writeContract: submitBidTx,
    data: bidHash,
    isPending: isSubmitting,
  } = useWriteContract();

  // Wait for transactions
  const { isLoading: isApprovePending } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  const { isLoading: isBidPending, isSuccess: isBidSuccess } = useWaitForTransactionReceipt({
    hash: bidHash,
  });

  // Read USDC allowance
  const { data: currentAllowance } = useReadContract({
    address: CONTRACTS.USDC,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.PrimaryMarketplace] : undefined,
  });

  const submitBid = useCallback(
    async (params: BidSubmissionParams) => {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      setIsLoading(true);
      setStatus('Preparing bid...');

      try {
        // Convert parameters to contract format
        const assetIdBytes32 = uuidToBytes32(params.assetId);
        const tokenAmountWei = parseTokenAmount(params.tokenAmount);
        const priceWei = parseUSDC(params.pricePerToken);

        // Calculate deposit needed (investor-bidding.sh line 273)
        const depositNeeded = calculateDepositNeeded(priceWei, tokenAmountWei);

        console.log('Bid parameters:', {
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
        if (!allowance || allowance < depositNeeded) {
          setStatus('Approving USDC...');
          console.log('Approving USDC:', depositNeeded.toString());

          approveUSDC({
            address: CONTRACTS.USDC,
            abi: USDC_ABI,
            functionName: 'approve',
            args: [CONTRACTS.PrimaryMarketplace, depositNeeded],
          });

          // Wait for approval (handled by useWaitForTransactionReceipt above)
          // User will see "Approving USDC..." status
          return { requiresApproval: true };
        }

        // Step 2: Submit bid to contract (investor-bidding.sh line 297)
        setStatus('Submitting bid on-chain...');
        console.log('Submitting bid to contract...');

        submitBidTx({
          address: CONTRACTS.PrimaryMarketplace,
          abi: MARKETPLACE_ABI,
          functionName: 'submitBid',
          args: [assetIdBytes32, tokenAmountWei, priceWei],
        });

        // Step 3: Wait for transaction and notify backend
        // (handled by useEffect when isBidSuccess changes)

        return { requiresApproval: false };
      } catch (error: any) {
        console.error('Error submitting bid:', error);
        setStatus(`Error: ${error.message}`);
        setIsLoading(false);
        throw error;
      }
    },
    [address, currentAllowance, approveUSDC, submitBidTx]
  );

  // Notify backend after successful bid (investor-bidding.sh line 362)
  const notifyBackend = useCallback(
    async (params: BidSubmissionParams, txHash: string, blockNumber: number) => {
      setStatus('Notifying backend...');

      const tokenAmountWei = parseTokenAmount(params.tokenAmount);
      const priceWei = parseUSDC(params.pricePerToken);

      await marketplaceService.notifyBidPlaced({
        txHash,
        assetId: params.assetId,
        tokenAmount: tokenAmountWei.toString(),
        price: priceWei.toString(),
        blockNumber: blockNumber.toString(),
      });

      setStatus('Bid submitted successfully! 🎉');
      setIsLoading(false);
    },
    []
  );

  return {
    submitBid,
    notifyBackend,
    status,
    isLoading: isLoading || isApproving || isSubmitting || isApprovePending || isBidPending,
    isApproving: isApproving || isApprovePending,
    isSubmitting: isSubmitting || isBidPending,
    isBidSuccess,
    bidHash,
    approveHash,
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
  const [status, setStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    writeContract: settleBidTx,
    data: txHash,
    isPending: isSubmitting,
  } = useWriteContract();

  const { isLoading: isPending, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const settleBid = useCallback(
    async (params: BidSettlementParams) => {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      setIsLoading(true);
      setStatus('Settling bid on-chain...');

      try {
        // Convert parameters
        const assetIdBytes32 = uuidToBytes32(params.assetId);

        console.log('Settling bid:', {
          assetId: params.assetId,
          assetIdBytes32,
          bidIndex: params.bidIndex,
        });

        // Call settleBid on contract (investor-settle.sh line 192)
        settleBidTx({
          address: CONTRACTS.PrimaryMarketplace,
          abi: MARKETPLACE_ABI,
          functionName: 'settleBid',
          args: [assetIdBytes32, BigInt(params.bidIndex)],
        });
      } catch (error: any) {
        console.error('Error settling bid:', error);
        setStatus(`Error: ${error.message}`);
        setIsLoading(false);
        throw error;
      }
    },
    [address, settleBidTx]
  );

  // Notify backend after successful settlement (investor-settle.sh line 264)
  const notifyBackend = useCallback(
    async (params: BidSettlementParams, txHash: string, blockNumber: number) => {
      setStatus('Notifying backend...');

      await marketplaceService.notifyBidSettled({
        assetId: params.assetId,
        bidIndex: params.bidIndex,
        txHash,
        blockNumber: blockNumber.toString(),
      });

      setStatus('Bid settled successfully! 🎉');
      setIsLoading(false);
    },
    []
  );

  return {
    settleBid,
    notifyBackend,
    status,
    isLoading: isLoading || isSubmitting || isPending,
    isSuccess,
    txHash,
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
          address: CONTRACTS.PrimaryMarketplace,
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
    address: CONTRACTS.IdentityRegistry,
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
