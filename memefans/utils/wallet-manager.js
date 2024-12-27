import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { ErrorHandler, GiveawayError, ErrorCodes } from './error.js';
import { ValidationHelper } from './validation.js';
import bs58 from 'bs58';

// 钱包状态
const WalletState = {
    UNINITIALIZED: 'UNINITIALIZED',
    INITIALIZING: 'INITIALIZING',
    READY: 'READY',
    ERROR: 'ERROR'
};

export class WalletManager {
    constructor() {
        this.wallet = null;
        this.connection = null;
        this.state = WalletState.UNINITIALIZED;
        this.lastError = null;
    }

    // 获取钱包状态
    getState() {
        return {
            state: this.state,
            address: this.getAddress(),
            error: this.lastError
        };
    }

    // 从私钥导入钱包
    async importFromPrivateKey(privateKeyString) {
        try {
            this.state = WalletState.INITIALIZING;
            
            // 验证私钥格式
            if (!ValidationHelper.isValidPrivateKey(privateKeyString)) {
                throw new GiveawayError('无效的私钥格式', ErrorCodes.VALIDATION_ERROR);
            }

            // 解码私钥
            const secretKey = bs58.decode(privateKeyString);
            if (secretKey.length !== 64) {
                throw new GiveawayError('私钥长度不正确', ErrorCodes.VALIDATION_ERROR);
            }

            // 创建钱包
            this.wallet = Keypair.fromSecretKey(secretKey);

            // 安全存储（加密）
            await this.secureStore(secretKey);

            this.state = WalletState.READY;
            this.lastError = null;

            return {
                success: true,
                address: this.getAddress()
            };
        } catch (error) {
            this.state = WalletState.ERROR;
            this.lastError = error.message;
            throw ErrorHandler.handleError(error);
        }
    }

    // 安全存储私钥
    async secureStore(secretKey) {
        try {
            // 使用 Chrome 存储 API 的加密功能
            const encryptedKey = await this.encrypt(secretKey);
            await chrome.storage.local.set({
                encryptedWalletKey: encryptedKey
            });
        } catch (error) {
            throw new GiveawayError('钱包存储失败', ErrorCodes.WALLET_ERROR);
        }
    }

    // 加密私钥
    async encrypt(data) {
        // 这里应该实现真正的加密逻辑
        // 示例仅作演示
        return {
            version: '1',
            data: Array.from(data),
            timestamp: Date.now()
        };
    }

    // 解密私钥
    async decrypt(encryptedData) {
        // 这里应该实现真正的解密逻辑
        // 示例仅作演示
        return new Uint8Array(encryptedData.data);
    }

    // 导出私钥（需要用户确认）
    async exportPrivateKey(password) {
        try {
            if (!this.wallet) {
                throw new GiveawayError('钱包未初始化', ErrorCodes.WALLET_ERROR);
            }

            // 验证密码（这里应该实现真正的密码验证）
            if (!password || password.length < 8) {
                throw new GiveawayError('无效的密码', ErrorCodes.VALIDATION_ERROR);
            }

            return {
                success: true,
                privateKey: bs58.encode(this.wallet.secretKey)
            };
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 获取钱包地址
    getAddress() {
        if (!this.wallet) {
            return null;
        }
        return this.wallet.publicKey.toString();
    }

    // 获取简短地址
    getShortAddress() {
        const address = this.getAddress();
        if (!address) {
            return null;
        }
        return `${address.slice(0, 4)}...${address.slice(-4)}`;
    }

    // 初始化连接
    async initConnection(endpoint) {
        try {
            if (!this.connection) {
                this.connection = new Connection(endpoint, 'confirmed');
                // 测试连接
                await this.connection.getRecentBlockhash();
            }
            return this.connection;
        } catch (error) {
            throw new GiveawayError('连接初始化失败', ErrorCodes.NETWORK_ERROR);
        }
    }

    // 获取 SOL 余额
    async getSOLBalance() {
        try {
            if (!this.wallet || !this.connection) {
                throw new GiveawayError('钱包未初始化', ErrorCodes.WALLET_ERROR);
            }

            const balance = await this.connection.getBalance(this.wallet.publicKey);
            return {
                success: true,
                balance: balance / 1e9, // Convert lamports to SOL
                raw: balance
            };
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 获取代币余额
    async getTokenBalance(tokenMint) {
        try {
            if (!this.wallet || !this.connection) {
                throw new GiveawayError('钱包未初始化', ErrorCodes.WALLET_ERROR);
            }

            ValidationHelper.validatePublicKey(tokenMint);

            const mintPubkey = new PublicKey(tokenMint);
            const tokenAccounts = await this.connection.getTokenAccountsByOwner(
                this.wallet.publicKey,
                { mint: mintPubkey }
            );

            if (tokenAccounts.value.length === 0) {
                return {
                    success: true,
                    balance: 0,
                    raw: 0
                };
            }

            const tokenBalance = await this.connection.getTokenAccountBalance(
                tokenAccounts.value[0].pubkey
            );

            return {
                success: true,
                balance: tokenBalance.value.uiAmount,
                raw: tokenBalance.value.amount
            };
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }

    // 清除钱包数据
    async clear() {
        try {
            this.wallet = null;
            this.connection = null;
            this.state = WalletState.UNINITIALIZED;
            this.lastError = null;
            await chrome.storage.local.remove(['encryptedWalletKey']);
            return { success: true };
        } catch (error) {
            throw ErrorHandler.handleError(error);
        }
    }
}
