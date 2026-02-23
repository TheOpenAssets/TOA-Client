
export interface SettlementInfoResult {
    success: boolean;
    totalSettlement?: string;
    totalTokenSupply?: string;
    totalClaimed?: string;
    totalTokensBurned?: string;
    yieldPerToken?: string;
    investorBalance?: string;
    tokenDecimals?: number;
    tokenSymbol?: string;
    allowance?: string;
    expectedUsdcForAllTokens?: string;
    yieldVaultAddress?: string;
    error?: string;
}

export interface TransactionResult {
    success: boolean;
    transactionHash?: string;
    blockNumber?: number;
    skipped?: boolean;
    error?: string;
}

export interface ClaimResult {
    success: boolean;
    transactionHash?: string;
    blockNumber?: number;
    tokensBurned?: string;
    usdcReceived?: string;
    tokensBurnedFormatted?: string;
    usdcReceivedFormatted?: string;
    error?: string;
}

export interface YieldService {
    getSettlementInfo(tokenAddress: string, userAddress?: string): Promise<SettlementInfoResult>;

    approveYieldVault(
        tokenAddress: string,
        burnAmountWei: string,
        currentAllowance?: string
    ): Promise<TransactionResult>;

    claimYield(
        tokenAddress: string,
        burnAmountWei: string
    ): Promise<ClaimResult>;
}
