
import freighterApi, {
    isConnected,
    signTransaction,
    setAllowed,
} from "@stellar/freighter-api";
import * as StellarSdk from "@stellar/stellar-sdk";
import type { ClaimResult, SettlementInfoResult, TransactionResult, YieldService } from "./yield.service.interface";

const HORIZON_URL = import.meta.env.VITE_STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
const NETWORK_PASSPHRASE = import.meta.env.VITE_STELLAR_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015';
const YIELD_VAULT_ID = import.meta.env.VITE_STELLAR_YIELD_VAULT_ID || import.meta.env.VITE_STELLAR_YIELD_VAULT || '';

export class StellarYieldService implements YieldService {

    private parseTokenAddress(tokenAddress: string): { code: string, issuer: string } {
        if (!tokenAddress.includes(':')) {
            throw new Error(`Invalid Stellar token address format: ${tokenAddress}. Expected "CODE:ISSUER"`);
        }
        const [code, issuer] = tokenAddress.split(':');
        return { code, issuer };
    }

    async getSettlementInfo(tokenAddress: string, userAddress?: string): Promise<SettlementInfoResult> {
        try {
            if (!YIELD_VAULT_ID) {
                throw new Error("Stellar YieldVault contract ID not configured");
            }

            if (!userAddress) {
                if (await isConnected()) {
                    // In a real app we might want to get the address from Freighter if not provided
                    throw new Error("User address required for settlement info");
                }
            }

            const { code, issuer } = this.parseTokenAddress(tokenAddress);

            // 1. Simulate get_settlement_info call
            const server = new StellarSdk.rpc.Server(import.meta.env.VITE_STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org');
            const contract = new StellarSdk.Contract(YIELD_VAULT_ID);

            const simulationSource = userAddress || 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

            const horizonServer = new StellarSdk.Horizon.Server(HORIZON_URL);
            let sourceAccount;
            try {
                sourceAccount = await horizonServer.loadAccount(simulationSource);
            } catch (e) {
                console.warn("Could not load account for simulation, using random keypair");
                const pair = StellarSdk.Keypair.random();
                sourceAccount = new StellarSdk.Account(pair.publicKey(), "0");
            }

            const tx = new StellarSdk.TransactionBuilder(sourceAccount, {
                fee: StellarSdk.BASE_FEE,
                networkPassphrase: NETWORK_PASSPHRASE,
            })
                .addOperation(
                    contract.call(
                        'get_settlement_info',
                        StellarSdk.nativeToScVal(code, { type: 'string' })
                    )
                )
                .setTimeout(30)
                .build();

            const simulation = await server.simulateTransaction(tx);

            if (!StellarSdk.rpc.Api.isSimulationSuccess(simulation)) {
                console.warn("get_settlement_info simulation failed (possibly no settlement yet)", simulation);
                return {
                    success: true,
                    totalSettlement: '0',
                    totalTokenSupply: '0',
                    totalClaimed: '0',
                    totalTokensBurned: '0',
                    yieldPerToken: '0',
                    investorBalance: '0',
                    expectedUsdcForAllTokens: '0',
                    tokenSymbol: code,
                    tokenDecimals: 7,
                    allowance: '9999999999999'
                };
            }

            const res = simulation.result?.retval;
            if (!res) throw new Error("No return value from get_settlement_info");

            const unwrap = (val: any) => StellarSdk.scValToNative(val);
            const nativeRes = unwrap(res);

            const totalSettlement = (nativeRes.total_settlement || 0n).toString();
            // Contract uses supply_snapshot for total active supply at snapshot
            const totalTokenSupply = (nativeRes.supply_snapshot || nativeRes.total_supply || 0n).toString();
            const totalClaimed = (nativeRes.claimed_tokens || nativeRes.total_claimed || 0n).toString();
            const totalTokensBurned = (nativeRes.total_tokens_burned || nativeRes.total_burned || 0n).toString();
            const yieldPerToken = (nativeRes.yield_per_token || 0n).toString();

            let userBalanceRaw = 0n;
            let userBalanceStr = '0.0000';
            if (userAddress) {
                try {
                    const accountData = await horizonServer.loadAccount(userAddress);
                    const balances = (accountData as any).balances || [];
                    const balanceObj = balances.find((b: any) =>
                        b.asset_code === code && b.asset_issuer === issuer
                    );
                    if (balanceObj) {
                        const parts = balanceObj.balance.split('.');
                        const intPart = BigInt(parts[0]);
                        const fracPart = parts[1] ? parts[1].padEnd(7, '0').slice(0, 7) : '0000000';
                        userBalanceRaw = intPart * 10_000_000n + BigInt(fracPart);
                        userBalanceStr = parseFloat(balanceObj.balance).toFixed(4);
                    }
                } catch (e) {
                    console.warn("Could not fetch user balance", e);
                }
            }

            let expectedUsdc = '0';
            if (BigInt(totalTokenSupply) > 0n && userBalanceRaw > 0n) {
                const settlementBn = BigInt(totalSettlement);
                const supplyBn = BigInt(totalTokenSupply);
                const expectedBn = (userBalanceRaw * settlementBn) / supplyBn;
                expectedUsdc = (Number(expectedBn) / 10_000_000).toFixed(6);
            }

            return {
                success: true,
                totalSettlement,
                totalTokenSupply,
                totalClaimed,
                totalTokensBurned,
                yieldPerToken,
                investorBalance: userBalanceStr,
                tokenDecimals: 7,
                tokenSymbol: code,
                allowance: '999999999999999999',
                expectedUsdcForAllTokens: expectedUsdc,
                yieldVaultAddress: YIELD_VAULT_ID
            };

        } catch (error: any) {
            console.error("Stellar Yield Info Error:", error);
            return {
                success: false,
                error: error.message || "Failed to fetch Stellar yield info"
            };
        }
    }

    async approveYieldVault(_tokenAddress: string, _burnAmountWei: string, _currentAllowance?: string): Promise<TransactionResult> {
        return {
            success: true,
            skipped: true,
            transactionHash: 'skipped'
        };
    }

    async claimYield(tokenAddress: string, burnAmountWei: string): Promise<ClaimResult> {
        try {
            if (!YIELD_VAULT_ID) throw new Error("YieldVault ID not configured");

            const { code, issuer } = this.parseTokenAddress(tokenAddress);

            if (!(await isConnected())) {
                throw new Error("Freighter wallet not found");
            }
            await setAllowed();

            // Retrieve public key/address from Freighter
            const { address } = await freighterApi.getAddress();
            if (!address) throw new Error("Could not get wallet address");
            const publicKey = address;

            const horizonServer = new StellarSdk.Horizon.Server(HORIZON_URL);
            const source = await horizonServer.loadAccount(publicKey);

            const contract = new StellarSdk.Contract(YIELD_VAULT_ID);

            // Derive SAC Contract ID from Asset
            const assetObj = new StellarSdk.Asset(code, issuer);
            const sacContractId = assetObj.contractId(NETWORK_PASSPHRASE);
            console.log(`Derived SAC Contract ID for ${code}: ${sacContractId}`);

            const txBuilder = new StellarSdk.TransactionBuilder(source, {
                fee: StellarSdk.BASE_FEE,
                networkPassphrase: NETWORK_PASSPHRASE,
            })
                .addOperation(
                    contract.call(
                        'claim_yield',
                        StellarSdk.nativeToScVal(code, { type: 'string' }),
                        new StellarSdk.Address(sacContractId).toScVal(),
                        StellarSdk.nativeToScVal(BigInt(burnAmountWei), { type: 'i128' }),
                        new StellarSdk.Address(address).toScVal()
                    )
                );

            const tx = txBuilder.setTimeout(30).build();

            const rpcServer = new StellarSdk.rpc.Server(import.meta.env.VITE_STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org');
            const simulation = await rpcServer.simulateTransaction(tx);

            if (!StellarSdk.rpc.Api.isSimulationSuccess(simulation)) {
                throw new Error(`Simulation failed: ${(simulation as any).error || 'Unknown error'}`);
            }

            const assembled = StellarSdk.rpc.assembleTransaction(tx, simulation).build();
            const xdr = assembled.toXDR();
            const signed = await signTransaction(xdr, { networkPassphrase: NETWORK_PASSPHRASE });
            if (!signed) throw new Error("User denied signature");

            const signedTx = new StellarSdk.Transaction(signed.signedTxXdr, NETWORK_PASSPHRASE);
            const response = await rpcServer.sendTransaction(signedTx);

            if (response.status !== "PENDING" && (response as any).status !== "SUCCESS") {
                throw new Error(`Transaction failed: ${JSON.stringify(response)}`);
            }

            return {
                success: true,
                transactionHash: response.hash,
                tokensBurned: burnAmountWei,
                tokensBurnedFormatted: (Number(burnAmountWei) / 10_000_000).toFixed(2),
                usdcReceived: '0'
            };

        } catch (error: any) {
            console.error("Stellar Claim Yield Error:", error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

export const stellarYieldService = new StellarYieldService();
