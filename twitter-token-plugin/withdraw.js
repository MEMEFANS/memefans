// 常量定义
const SOLANA_RPC_URL = 'https://api.devnet.solana.com';
const PROGRAM_ID = '8gQeZ5ijKyGnbhwqF5pYnABBgpvKdGZ8FmyxEYeUyAZF';  // 替换为实际的程序 ID
const FANS_TOKEN_MINT = 'FANSXzHZNsXc5BLwMgkZhZRzwrZwE4pcNpxjqFhHm2E9';  // 替换为实际的代币 Mint 地址

class WithdrawManager {
  constructor() {
    this.connection = new solanaWeb3.Connection(SOLANA_RPC_URL);
  }

  async withdraw(amount) {
    try {
      console.log('开始提现流程...');
      
      // 检查 Phantom 钱包
      if (!window.solana || !window.solana.isPhantom) {
        throw new Error('请先安装 Phantom 钱包');
      }

      // 连接钱包
      try {
        console.log('尝试连接 Phantom 钱包...');
        await window.solana.connect();
      } catch (err) {
        console.error('连接钱包失败:', err);
        throw new Error('无法连接到 Phantom 钱包');
      }

      // 获取钱包公钥
      const publicKey = window.solana.publicKey;
      if (!publicKey) {
        throw new Error('未能获取钱包地址');
      }
      console.log('获取到钱包地址:', publicKey.toString());

      // 创建提现记录
      console.log('创建提现记录...');
      await BalanceManager.withdraw(amount);

      // 创建提现交易
      console.log('创建提现交易...');
      const transaction = await this.createWithdrawTransaction(publicKey, amount);

      // 发送交易并等待确认
      try {
        console.log('请求用户签名交易...');
        const { signature } = await window.solana.signAndSendTransaction(transaction);
        console.log('交易已发送，等待确认... 交易哈希:', signature);
        
        // 等待交易确认
        const confirmation = await this.connection.confirmTransaction(signature);
        if (confirmation.value.err) {
          console.error('交易确认失败:', confirmation.value.err);
          throw new Error('交易确认失败');
        }

        // 更新提现记录
        console.log('交易确认成功，更新提现记录...');
        await BalanceManager.updateWithdrawal(amount, signature);
        
        // 刷新余额
        await BalanceManager.refreshBalances();
        
        console.log('提现成功！交易哈希:', signature);
        return { success: true, signature };
      } catch (error) {
        console.error('交易失败:', error);
        throw new Error('交易失败: ' + error.message);
      }
    } catch (error) {
      console.error('提现失败:', error);
      throw error;
    }
  }

  async createWithdrawTransaction(publicKey, amount) {
    try {
      console.log('开始创建提现交易...');
      
      // 创建提现指令
      const data = new Uint8Array([
        2,  // 指令类型：提现
        ...new solanaWeb3.BN(amount).toArray('le', 8)
      ]);

      const instruction = new solanaWeb3.TransactionInstruction({
        keys: [
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: new solanaWeb3.PublicKey(PROGRAM_ID), isSigner: false, isWritable: true },
          { pubkey: new solanaWeb3.PublicKey(FANS_TOKEN_MINT), isSigner: false, isWritable: false },
        ],
        programId: new solanaWeb3.PublicKey(PROGRAM_ID),
        data: data
      });

      // 创建交易
      const transaction = new solanaWeb3.Transaction();
      
      // 获取最新的区块哈希
      console.log('获取最新区块哈希...');
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
      
      transaction.add(instruction);
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;
      transaction.lastValidBlockHeight = lastValidBlockHeight;

      console.log('交易创建成功');
      return transaction;
    } catch (error) {
      console.error('创建提现交易失败:', error);
      throw error;
    }
  }
}

// 导出
window.WithdrawManager = WithdrawManager;
