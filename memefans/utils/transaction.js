import { Connection } from '@solana/web3.js';
import { SOLANA_RPC_URL } from '../config.js';

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

export class TransactionHelper {
    constructor() {
        this.connection = new Connection(SOLANA_RPC_URL);
    }

    async trackTransaction(signature) {
        try {
            const status = await this.connection.confirmTransaction(signature);
            return {
                success: !status.value.err,
                error: status.value.err,
                signature
            };
        } catch (error) {
            console.error('Transaction tracking failed:', error);
            return {
                success: false,
                error: error.message,
                signature
            };
        }
    }

    async retryTransaction(transactionFn, maxRetries = MAX_RETRIES) {
        let lastError;
        for (let i = 0; i < maxRetries; i++) {
            try {
                const result = await transactionFn();
                if (result.success) return result;
                lastError = result.error;
            } catch (error) {
                lastError = error;
            }
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            }
        }
        throw new Error(`Transaction failed after ${maxRetries} attempts. Last error: ${lastError}`);
    }

    async waitForConfirmation(signature, maxRetries = MAX_RETRIES) {
        let lastError;
        for (let i = 0; i < maxRetries; i++) {
            try {
                const status = await this.connection.confirmTransaction(signature);
                if (!status.value.err) return true;
                lastError = status.value.err;
            } catch (error) {
                lastError = error;
            }
            if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            }
        }
        throw new Error(`Transaction confirmation failed after ${maxRetries} attempts. Last error: ${lastError}`);
    }
}
