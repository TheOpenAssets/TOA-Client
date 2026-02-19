import {
    isConnected,
    signTransaction,
    setAllowed,
} from "@stellar/freighter-api";
import * as StellarSdk from "@stellar/stellar-sdk";

const HORIZON_URL = import.meta.env.VITE_STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
const NETWORK_PASSPHRASE = import.meta.env.VITE_STELLAR_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015';

export const stellarService = {
    /**
     * Check if a trustline exists for a specific asset
     */
    checkTrustline: async (account: string, assetCode: string, issuer: string): Promise<boolean> => {
        try {
            // Use Horizon for account data
            const server = new StellarSdk.Horizon.Server(HORIZON_URL);
            const accountData = await server.loadAccount(account);

            const balances = (accountData as any).balances || [];
            return balances.some((balance: any) => {
                return (
                    balance.asset_type !== 'native' &&
                    balance.asset_code === assetCode &&
                    balance.asset_issuer === issuer
                );
            });
        } catch (error) {
            console.error('Error checking trustline:', error);
            return false;
        }
    },

    /**
     * Get the balance of a specific asset for an account
     */
    getAccountBalance: async (account: string, assetCode: string, issuer?: string): Promise<string> => {
        try {
            // Use Horizon for account data
            const server = new StellarSdk.Horizon.Server(HORIZON_URL);
            const accountData = await server.loadAccount(account);

            const balances = (accountData as any).balances || [];
            console.log('DEBUG: Horizon account balances:', balances);

            const balance = balances.find((b: any) => {
                if (assetCode === 'native') return b.asset_type === 'native';

                const codeMatch = b.asset_code === assetCode;
                const issuerMatch = issuer ? b.asset_issuer === issuer : true;

                if (b.asset_code === assetCode) {
                    console.log(`DEBUG: Found likely match for ${assetCode}. Issuer: ${b.asset_issuer}. Expected: ${issuer}. Match? ${issuerMatch}`);
                }

                return codeMatch && issuerMatch;
            });

            const result = balance ? balance.balance : '0';
            console.log(`Balance found for ${assetCode}: ${result}`);
            return result;
        } catch (error) {
            console.error('Error fetching balance:', error);
            return '0';
        }
    },

    /**
     * Add a trustline for an asset using Freighter
     */
    addTrustline: async (account: string, assetCode: string, issuer: string): Promise<string> => {
        try {
            // 1. Check Freighter connection
            if (!(await isConnected())) {
                throw new Error("Freighter wallet not found");
            }

            await setAllowed(); // Ensure we have permission

            // 2. Load account to get sequence number (Use Horizon for reliable sequence)
            const server = new StellarSdk.Horizon.Server(HORIZON_URL);
            const source = await server.loadAccount(account);

            // 3. Build Transaction
            const asset = new StellarSdk.Asset(assetCode, issuer);
            const tx = new StellarSdk.TransactionBuilder(source, {
                fee: StellarSdk.BASE_FEE,
                networkPassphrase: NETWORK_PASSPHRASE,
            })
                .addOperation(StellarSdk.Operation.changeTrust({
                    asset: asset,
                }))
                .setTimeout(30)
                .build();

            // 4. Sign with Freighter
            const xdr = tx.toXDR();
            const signedXdrObj = await signTransaction(xdr, {
                networkPassphrase: NETWORK_PASSPHRASE,
            });

            if (!signedXdrObj) {
                throw new Error("User denied transaction signature");
            }

            // 5. Submit Transaction
            // signedXdrObj is { signedTxXdr: string, signerAddress: string }
            const response = await server.submitTransaction(new StellarSdk.Transaction(signedXdrObj.signedTxXdr, NETWORK_PASSPHRASE));

            return response.hash;
        } catch (error: any) {
            console.error("Add trustline error:", error);
            throw new Error(error.message || "Failed to add trustline");
        }
    },

    /**
     * Buy tokens on Stellar using the Primary Market contract
     */
    buyTokens: async (account: string, assetCode: string, amount: string): Promise<string> => {
        try {
            // 1. Check Freighter connection
            if (!(await isConnected())) {
                throw new Error("Freighter wallet not found");
            }

            await setAllowed(); // Ensure we have permission

            // 2. Load account for sequence number
            const server = new StellarSdk.Horizon.Server(HORIZON_URL);
            const source = await server.loadAccount(account);

            // 3. Resolve Contract ID (PrimaryMarket)
            const marketContractId = import.meta.env.VITE_STELLAR_PRIMARY_MARKET;
            if (!marketContractId) {
                throw new Error("Primary Market contract ID not configured");
            }

            // 4. Prepare arguments
            const STELLAR_DECIMALS = BigInt(10_000_000);
            const amountBigInt = BigInt(amount) * STELLAR_DECIMALS;

            const contract = new StellarSdk.Contract(marketContractId);

            // 5. Build Transaction
            console.log(`DEBUG: Calling buy_tokens on ${marketContractId} with: Account=${account}, Asset=${assetCode} (String), Amount=${amountBigInt.toString()} (i128)`);

            const tx = new StellarSdk.TransactionBuilder(source, {
                fee: StellarSdk.BASE_FEE,
                networkPassphrase: NETWORK_PASSPHRASE,
            })
                .addOperation(
                    contract.call(
                        'buy_tokens',
                        StellarSdk.nativeToScVal(account, { type: 'address' }),
                        StellarSdk.nativeToScVal(assetCode, { type: 'string' }),
                        StellarSdk.nativeToScVal(amountBigInt, { type: 'i128' }),
                    )
                )
                .setTimeout(30)
                .build();

            // 6. Simulate Transaction (Required for Soroban to get resources)
            const rpcServer = new StellarSdk.rpc.Server(import.meta.env.VITE_STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org');
            console.log("Simulating transaction...");
            const simulation = await rpcServer.simulateTransaction(tx);

            if (!StellarSdk.rpc.Api.isSimulationSuccess(simulation)) {
                console.error("Simulation failed:", simulation);
                throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation)}`);
            }

            console.log("Simulation successful. Assembling transaction...");
            // Assemble the transaction with the simulation data (resources, auth)
            const assembledTx = StellarSdk.rpc.assembleTransaction(tx, simulation).build();

            // 7. Sign with Freighter (pass XDR of assembled tx)
            const xdr = assembledTx.toXDR();
            const signedXdrObj = await signTransaction(xdr, {
                networkPassphrase: NETWORK_PASSPHRASE,
            });

            if (!signedXdrObj) {
                throw new Error("User denied transaction signature");
            }

            // 8. Submit Transaction via RPC
            // Restore the transaction object from the signed XDR
            const signedTx = new StellarSdk.Transaction(signedXdrObj.signedTxXdr, NETWORK_PASSPHRASE);

            // Submit
            const response = await rpcServer.sendTransaction(signedTx);

            if (response.status === "PENDING" || (response as any).status === "SUCCESS") {
                return response.hash;
            } else {
                throw new Error(`Transaction failed: ${JSON.stringify(response)}`);
            }

        } catch (error: any) {
            console.error("Buy tokens error:", error);
            throw new Error(error.message || "Failed to buy tokens");
        }
    },
};
