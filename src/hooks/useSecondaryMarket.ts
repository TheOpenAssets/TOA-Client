import { useState, useCallback, useEffect, useRef } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { marketplaceService } from '../lib/api/marketplace.service';

/**
 * Hook for canceling orders on the secondary market
 */
export function useCancelOrder() {
  const { address } = useAccount();
  const [status, setStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const notificationSentRef = useRef<string | null>(null);

  const {
    writeContract: cancelOrderTx,
    data: txHash,
    isPending: isSubmitting,
    error: submitError,
  } = useWriteContract();

  const {
    isLoading: isPending,
    isSuccess,
    error: receiptError
  } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Handle submit errors
  useEffect(() => {
    if (submitError) {
      console.error('❌ Cancel Order Submission Error:', submitError);
      setError(submitError.message || 'Failed to submit cancel order transaction');
      setStatus('');
      setIsLoading(false);
    }
  }, [submitError]);

  // Handle receipt errors
  useEffect(() => {
    if (receiptError) {
      console.error('❌ Cancel Order Transaction Failed:', receiptError);
      setError(receiptError.message || 'Transaction failed on-chain');
      setStatus('');
      setIsLoading(false);
    }
  }, [receiptError]);

  const cancelOrder = useCallback(
    async (orderId: string) => {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      setError(null);
      setIsLoading(true);
      setStatus('Preparing cancellation...');

      try {
        // Step 1: Get transaction data from backend
        const txData = await marketplaceService.getCancelOrderTxData(orderId);
        
        console.log('📝 Cancel Order Tx Data:', txData);

        // Step 2: Send transaction
        setStatus('Please sign the transaction...');
        
        cancelOrderTx({
          address: txData.to as `0x${string}`,
          abi: txData.abi,
          functionName: txData.functionName,
          args: txData.args,
        });

      } catch (error: any) {
        console.error('❌ Error canceling order:', error);
        setError(error.message || 'Failed to cancel order');
        setStatus('');
        setIsLoading(false);
        throw error;
      }
    },
    [address, cancelOrderTx]
  );

  // Notify user on success (No backend notification needed for cancel? API docs don't mention it, 
  // but usually blockchain events handle it. We just rely on on-chain success here.)
  useEffect(() => {
    if (isSuccess && txHash) {
       // Prevent duplicate processing if needed
       if (notificationSentRef.current === txHash) {
        return;
      }
      
      setStatus('Order cancelled successfully!');
      setIsLoading(false);
      notificationSentRef.current = txHash;
      
      // We might want to refresh the orders list in the parent component
    }
  }, [isSuccess, txHash]);

  const reset = useCallback(() => {
    setError(null);
    setStatus('');
    setIsLoading(false);
  }, []);

  return {
    cancelOrder,
    status,
    error,
    isLoading: isLoading || isSubmitting || isPending,
    isSuccess,
    txHash,
    reset,
  };
}
