// 钱包管理模块
class WalletManager {
  constructor() {
    this.wallet = null;
    this.connection = null;
  }

  // 从私钥导入钱包
  async importFromPrivateKey(privateKeyString) {
    try {
      // 解码 Base58 格式的私钥
      const secretKey = bs58.decode(privateKeyString);
      
      if (secretKey.length !== 64) {
        throw new Error(`私钥长度不正确: ${secretKey.length} (应为 64)`);
      }
      
      // 创建钱包
      this.wallet = window.solana.Keypair.fromSecretKey(secretKey);
      
      // 保存到存储
      await chrome.storage.local.set({
        walletKey: JSON.stringify(Array.from(secretKey))
      });
      
      return this.wallet;
    } catch (error) {
      console.error('导入钱包失败:', error);
      throw error;
    }
  }

  // 导出私钥
  exportPrivateKey() {
    if (!this.wallet) {
      throw new Error('钱包未初始化');
    }
    return bs58.encode(this.wallet.secretKey);
  }

  // 获取钱包地址
  getAddress() {
    if (!this.wallet) {
      return null;
    }
    return this.wallet.publicKey.toString();
  }

  // 获取简短地址（用于显示）
  getShortAddress() {
    const address = this.getAddress();
    if (!address) {
      return null;
    }
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }

  // 初始化连接
  async initConnection() {
    if (!this.connection) {
      this.connection = new window.solana.Connection(
        'https://special-fluent-dust.solana-mainnet.quiknode.pro/6e0fc13eb7512bc5c4ed3c311e778ac9739c0025/',
        'confirmed'
      );
    }
    return this.connection;
  }

  // 获取 SOL 余额
  async getSOLBalance() {
    if (!this.wallet || !this.connection) {
      return 0;
    }
    const balance = await this.connection.getBalance(this.wallet.publicKey);
    return balance / 1000000000; // Convert lamports to SOL
  }

  // 获取代币余额
  async getTokenBalance(tokenMint) {
    if (!this.wallet || !this.connection) {
      return 0;
    }
    try {
      const tokenAccounts = await this.connection.getTokenAccountsByOwner(
        this.wallet.publicKey,
        { mint: new window.solana.PublicKey(tokenMint) }
      );
      
      if (tokenAccounts.value.length === 0) {
        return 0;
      }
      
      const tokenBalance = await this.connection.getTokenAccountBalance(
        tokenAccounts.value[0].pubkey
      );
      
      return tokenBalance.value.uiAmount;
    } catch (error) {
      console.error('获取代币余额失败:', error);
      return 0;
    }
  }
}

// 创建全局实例
window.walletManager = new WalletManager();
