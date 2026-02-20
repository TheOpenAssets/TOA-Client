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
    buyTokens: async (account: string, assetCode: string, amount: string, decimals: number = 7): Promise<string> => {
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
            // Handle fractional amounts correctly (e.g. 0.1 tokens)
            // We use standard string parsing to avoid floating point errors
            const parts = amount.split('.');
            let amountBigInt: bigint;
            const decimalsBigInt = BigInt(decimals);

            if (parts.length === 1) {
                // Integer
                amountBigInt = BigInt(amount) * (BigInt(10) ** decimalsBigInt);
            } else {
                // Decimal
                const integerPart = parts[0];
                const fractionalPart = parts[1];

                // Truncate fractional part if longer than decimals
                const truncatedFraction = fractionalPart.slice(0, decimals);

                // Pad with zeros if shorter
                const paddedFraction = truncatedFraction.padEnd(decimals, '0');

                const fullNumberStr = integerPart + paddedFraction;
                amountBigInt = BigInt(fullNumberStr);
            }

            const contract = new StellarSdk.Contract(marketContractId);

            // 5. Build Transaction
            console.log(`DEBUG: Calling buy_tokens on ${marketContractId} with: Account=${account}, Asset=${assetCode}, Amount=${amountBigInt.toString()} (Decimals: ${decimals})`);

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

            // 6. Simulate Transaction
            const rpcServer = new StellarSdk.rpc.Server(import.meta.env.VITE_STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org');
            const simulation = await rpcServer.simulateTransaction(tx);

            if (!StellarSdk.rpc.Api.isSimulationSuccess(simulation)) {
                console.error("Simulation failed:", simulation);
                let errorMsg = simulation.error as string || "Unknown simulation error";

                // Try to extract diagnostic events if available
                if (simulation.events && simulation.events.length > 0) {
                    const events = simulation.events.map((e: any) => {
                        // Diagnostic events structure
                        return `Topic: ${e.topic || e.topics}, Data: ${e.value || e.data}`;
                    }).join('\n');
                    errorMsg += `\nEvents: ${events}`;
                }

                throw new Error(`Transaction simulation failed: ${errorMsg}. \nPossible causes: Contract has insufficient balance of asset ${assetCode}, or listing is inactive.`);
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

    /**
     * Submit a bid on Stellar (Primary Market)
     * Matches logic from scripts/investor-place-bid.sh
     */
    submitBid: async (
        account: string,
        assetCode: string,
        tokenAmount: string,
        limitPrice: string
    ): Promise<{ txHash: string; tokenAmount7dec: string; limitPrice7dec: string }> => {
        try {
            if (!(await isConnected())) throw new Error("Freighter wallet not found");
            await setAllowed();

            const server = new StellarSdk.Horizon.Server(HORIZON_URL);
            const source = await server.loadAccount(account);

            const marketContractId = import.meta.env.VITE_STELLAR_PRIMARY_MARKET;
            if (!marketContractId) throw new Error("Primary Market contract ID not configured");

            // Convert to Stellar 7-decimal integers (i64)
            const STELLAR_DECIMALS = 10_000_000;
            const tokenAmount7dec = BigInt(Math.round(parseFloat(tokenAmount) * STELLAR_DECIMALS));
            const limitPrice7dec = BigInt(Math.round(parseFloat(limitPrice) * STELLAR_DECIMALS));

            const contract = new StellarSdk.Contract(marketContractId);

            console.log(`Submitting bid: Code=${assetCode}, Tokens=${tokenAmount7dec}, Price=${limitPrice7dec}`);

            const tx = new StellarSdk.TransactionBuilder(source, {
                fee: StellarSdk.BASE_FEE,
                networkPassphrase: NETWORK_PASSPHRASE,
            })
                .addOperation(
                    contract.call(
                        'submit_bid',
                        new StellarSdk.Address(account).toScVal(),
                        StellarSdk.nativeToScVal(assetCode, { type: 'string' }),
                        StellarSdk.nativeToScVal(tokenAmount7dec, { type: 'i64' }),
                        StellarSdk.nativeToScVal(limitPrice7dec, { type: 'i64' })
                    )
                )
                .setTimeout(30)
                .build();

            const rpcServer = new StellarSdk.rpc.Server(import.meta.env.VITE_STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org');
            const simulation = await rpcServer.simulateTransaction(tx);

            if (!StellarSdk.rpc.Api.isSimulationSuccess(simulation)) {
                let errorMsg = typeof simulation.error === 'string' ? simulation.error : 'Unknown error';
                if (simulation.events && simulation.events.length > 0) {
                    // Extract informative errors from events if possible
                    errorMsg += " | Events: " + simulation.events.map((e: any) => e.topics.join(',')).join('; ');
                }
                throw new Error(`Simulation failed: ${errorMsg}`);
            }

            const assembled = StellarSdk.rpc.assembleTransaction(tx, simulation).build();
            const signed = await signTransaction(assembled.toXDR(), { networkPassphrase: NETWORK_PASSPHRASE });
            if (!signed) throw new Error("User denied signature");

            const signedTx = new StellarSdk.Transaction(signed.signedTxXdr, NETWORK_PASSPHRASE);
            const response = await rpcServer.sendTransaction(signedTx);

            if (response.status !== "PENDING" && (response as any).status !== "SUCCESS") {
                throw new Error(`Transaction failed: ${JSON.stringify(response)}`);
            }

            return {
                txHash: response.hash,
                tokenAmount7dec: tokenAmount7dec.toString(),
                limitPrice7dec: limitPrice7dec.toString()
            };

        } catch (error: any) {
            console.error("Submit bid error:", error);
            throw new Error(error.message || "Failed to submit bid");
        }
    },

    /**
     * End an auction on Stellar (Admin only)
     * Matches logic from scripts/admin-end-auction.sh
     */
    endAuction: async (
        account: string,
        assetCode: string,
        issuer: string,
        totalSupply: string,
        clearingPrice: string
    ): Promise<{ txHash: string; ledger: number; clearingPrice7dec: string }> => {
        try {
            // 1. Check Freighter connection
            if (!(await isConnected())) {
                throw new Error("Freighter wallet not found");
            }

            await setAllowed();

            // 2. Load account
            const server = new StellarSdk.Horizon.Server(HORIZON_URL);
            const source = await server.loadAccount(account);

            // 3. Configuration & Conversion
            const marketContractId = import.meta.env.VITE_STELLAR_PRIMARY_MARKET;
            if (!marketContractId) throw new Error("Primary Market contract ID not configured");

            const STELLAR_DECIMALS = 10_000_000;
            const totalSupply7dec = BigInt(Math.round(parseFloat(totalSupply) * STELLAR_DECIMALS));
            const clearingPrice7dec = BigInt(Math.round(parseFloat(clearingPrice) * STELLAR_DECIMALS));

            const rpcServer = new StellarSdk.rpc.Server(import.meta.env.VITE_STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org');

            // 4. Check PrimaryMarket Balance & Mint if needed (SAC)
            const asset = new StellarSdk.Asset(assetCode, issuer);
            const sacContractId = asset.contractId(NETWORK_PASSPHRASE);
            const sacContract = new StellarSdk.Contract(sacContractId);

            console.log(`Checking balance in PrimaryMarket... SAC: ${sacContractId}`);

            // Prepare simulation to check balance
            const balanceTx = new StellarSdk.TransactionBuilder(source, {
                fee: StellarSdk.BASE_FEE,
                networkPassphrase: NETWORK_PASSPHRASE,
            })
                .addOperation(
                    sacContract.call(
                        'balance',
                        new StellarSdk.Address(marketContractId).toScVal()
                    )
                )
                .setTimeout(30)
                .build();

            const balanceSim = await rpcServer.simulateTransaction(balanceTx);
            let currentBalance = BigInt(0);

            if (StellarSdk.rpc.Api.isSimulationSuccess(balanceSim) && balanceSim.result) {
                currentBalance = StellarSdk.scValToNative(balanceSim.result.retval) as bigint;
            }
            console.log(`Current PrimaryMarket balance: ${currentBalance.toString()} (Required: ${totalSupply7dec.toString()})`);

            // Variable to hold the source account for the clear auction tx (may need refresh if minting occurred)
            let clearAuctionSource = source;

            if (currentBalance < totalSupply7dec) {
                const mintAmount = totalSupply7dec - currentBalance;
                console.log(`Minting ${mintAmount.toString()} tokens to PrimaryMarket...`);

                const mintTx = new StellarSdk.TransactionBuilder(source, {
                    fee: StellarSdk.BASE_FEE,
                    networkPassphrase: NETWORK_PASSPHRASE,
                })
                    .addOperation(
                        sacContract.call(
                            'mint',
                            new StellarSdk.Address(marketContractId).toScVal(),
                            StellarSdk.nativeToScVal(mintAmount, { type: 'i128' })
                        )
                    )
                    .setTimeout(30)
                    .build();

                // Sign & Submit Mint
                const mintXdr = mintTx.toXDR();
                const signedMint = await signTransaction(mintXdr, { networkPassphrase: NETWORK_PASSPHRASE });
                if (!signedMint) throw new Error("User denied minting signature");

                const signedMintTx = new StellarSdk.Transaction(signedMint.signedTxXdr, NETWORK_PASSPHRASE);
                const mintRes = await rpcServer.sendTransaction(signedMintTx);

                if (mintRes.status !== "PENDING" && (mintRes as any).status !== "SUCCESS") {
                    throw new Error(`Minting failed: ${JSON.stringify(mintRes)}`);
                }

                // Wait for confirmation (simple delay for now)
                console.log("Mint submitted, waiting for confirmation...");
                await new Promise(r => setTimeout(r, 4000));

                // Reload account sequence for next tx
                clearAuctionSource = await server.loadAccount(account);
            }

            // 5. Clear Auction
            console.log("Clearing auction...");
            const marketContract = new StellarSdk.Contract(marketContractId);

            // ALWAYS fetch a fresh copy of the account to avoid txBadSeq errors.
            // Earlier simulations (like balanceTx) increment the in-memory sequence number of 'source'.
            clearAuctionSource = await server.loadAccount(account);

            const clearTx = new StellarSdk.TransactionBuilder(clearAuctionSource, {
                fee: StellarSdk.BASE_FEE,
                networkPassphrase: NETWORK_PASSPHRASE,
            })
                .addOperation(
                    marketContract.call(
                        'clear_auction',
                        new StellarSdk.Address(account).toScVal(), // admin
                        StellarSdk.nativeToScVal(assetCode, { type: 'string' }),
                        StellarSdk.nativeToScVal(clearingPrice7dec, { type: 'i64' })
                    )
                )
                .setTimeout(30)
                .build();

            // Simulate Clear
            const clearSim = await rpcServer.simulateTransaction(clearTx);
            if (!StellarSdk.rpc.Api.isSimulationSuccess(clearSim)) {
                console.error("Clear simulation failed:", clearSim);
                throw new Error(`Clear auction simulation failed: ${(clearSim as any).error}`);
            }

            // Sign & Submit Clear
            const assembledClear = StellarSdk.rpc.assembleTransaction(clearTx, clearSim).build();
            const clearXdr = assembledClear.toXDR();

            const signedClear = await signTransaction(clearXdr, { networkPassphrase: NETWORK_PASSPHRASE });
            if (!signedClear) throw new Error("User denied clear auction signature");

            const signedClearTx = new StellarSdk.Transaction(signedClear.signedTxXdr, NETWORK_PASSPHRASE);
            const clearRes = await rpcServer.sendTransaction(signedClearTx);

            if (clearRes.status !== "PENDING" && (clearRes as any).status !== "SUCCESS") {
                throw new Error(`Clear auction failed: ${JSON.stringify(clearRes)}`);
            }

            return {
                txHash: clearRes.hash,
                ledger: 0, // We don't get ledger immediately from sendTransaction, backend can query if needed
                clearingPrice7dec: clearingPrice7dec.toString()
            };

        } catch (error: any) {
            console.error("End auction error:", error);
            throw new Error(error.message || "Failed to end auction");
        }
    },
};
