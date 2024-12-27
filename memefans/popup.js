// 常量定义
const QUICKNODE_RPC_URL = 'https://special-fluent-dust.solana-mainnet.quiknode.pro/6e0fc13eb7512bc5c4ed3c311e778ac9739c0025';
const FANS_TOKEN_MINT = 'EViQB8r2we14B4sA6jEg5Ujb85WepzKUcf7YwGeGpump';

// 初始化连接和钱包
let connection = null;
let wallet = null;

// 等待 Solana Web3.js 加载
function waitForSolanaWeb3() {
  return new Promise((resolve) => {
    if (typeof window.solanaWeb3 !== 'undefined') {
      resolve();
    } else {
      setTimeout(() => {
        if (typeof window.solanaWeb3 !== 'undefined') {
          resolve();
        } else {
          console.warn('Solana Web3.js 未加载，重试中...');
          waitForSolanaWeb3().then(resolve);
        }
      }, 100);
    }
  });
}

// 初始化连接
async function initConnection() {
  try {
    if (!connection) {
      console.log('正在初始化连接...');
      
      // 等待 Solana Web3.js 加载
      await waitForSolanaWeb3();
      
      // 确保 Solana Web3.js 已加载
      if (typeof solanaWeb3 === 'undefined') {
        throw new Error('Solana Web3.js 未加载，请刷新页面重试');
      }
      
      // 使用更多的连接选项
      const connectionConfig = {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000,
        disableRetryOnRateLimit: false,
        wsEndpoint: QUICKNODE_RPC_URL.replace('https://', 'wss://'),
        httpHeaders: {
          'Content-Type': 'application/json'
        }
      };
      
      connection = new solanaWeb3.Connection(QUICKNODE_RPC_URL, connectionConfig);
      console.log('连接已初始化');
      
      // 测试连接
      try {
        const version = await connection.getVersion();
        console.log('Solana 连接测试成功:', version);
        return true;
      } catch (error) {
        console.error('Solana 连接测试失败:', error);
        throw new Error('无法连接到 Solana 网络，请检查网络连接');
      }
    }
    return true;
  } catch (error) {
    console.error('初始化连接失败:', error);
    showError(error.message);
    return false;
  }
}

// BN 类用于处理大数
class BN {
  constructor(number) {
    this.number = BigInt(number);
  }

  toArray(endian, length) {
    const bytes = [];
    let n = this.number;

    for (let i = 0; i < length; i++) {
      bytes.push(Number(n & BigInt(255)));
      n = n >> BigInt(8);
    }

    return endian === 'le' ? bytes : bytes.reverse();
  }
}

// 导入钱包功能
async function importWallet() {
  try {
    const privateKeyInput = document.getElementById('private-key-input');
    const walletAddressElement = document.getElementById('wallet-address');
    
    if (!privateKeyInput || !walletAddressElement) {
      console.error('找不到必要的DOM元素');
      showError('界面元素加载失败');
      return;
    }

    // 如果私钥输入框是隐藏的，显示它
    if (!privateKeyInput.value) {
      privateKeyInput.style.display = 'block';
      privateKeyInput.focus();
      showSuccess('请输入私钥');
      return;
    }

    const privateKeyString = privateKeyInput.value.trim();
    if (!privateKeyString) {
      showError('请输入私钥');
      return;
    }

    console.log('开始导入钱包...');

    if (typeof bs58 === 'undefined') {
      throw new Error('bs58 库未正确加载');
    }

    try {
      // 解码私钥
      const secretKey = bs58.decode(privateKeyString);
      
      if (secretKey.length !== 64) {
        throw new Error(`私钥长度不正确: ${secretKey.length} (应为 64)`);
      }

      // 创建钱包
      wallet = solanaWeb3.Keypair.fromSecretKey(secretKey);
      
      if (!wallet || !wallet.publicKey) {
        throw new Error('钱包创建失败');
      }
      
      // 显示钱包地址
      const publicKeyString = wallet.publicKey.toString();
      walletAddressElement.textContent = publicKeyString;
      walletAddressElement.classList.remove('empty-wallet');
      console.log('钱包地址已更新:', publicKeyString);
      
      // 保存钱包
      await chrome.storage.local.set({
        walletKey: JSON.stringify(Array.from(secretKey))
      });
      console.log('钱包已保存到本地存储');
      
      // 刷新余额
      await refreshBalance();
      
      // 清理输入
      privateKeyInput.style.display = 'none';
      privateKeyInput.value = '';

      showSuccess('钱包导入成功');
    } catch (error) {
      console.error('私钥处理失败:', error);
      showError('私钥格式不正确，请确保输入正确的 Base58 格式私钥');
      return;
    }
  } catch (error) {
    console.error('导入钱包失败:', error);
    console.error('错误堆栈:', error.stack);
    showError(`导入失败: ${error.message}`);
  }
}

// 初始化保存的钱包
async function initSavedWallet() {
  try {
    const walletAddressElement = document.getElementById('wallet-address');
    if (!walletAddressElement) {
      console.error('找不到钱包地址显示元素');
      return false;
    }

    // 清除现有显示
    walletAddressElement.textContent = '正在加载钱包...';
    walletAddressElement.classList.add('empty-wallet');

    const result = await chrome.storage.local.get(['walletKey']);
    if (result.walletKey) {
      console.log('找到保存的钱包');
      const secretKey = new Uint8Array(JSON.parse(result.walletKey));
      
      // 创建钱包
      wallet = solanaWeb3.Keypair.fromSecretKey(secretKey);
      const publicKeyString = wallet.publicKey.toString();
      console.log('钱包已恢复:', publicKeyString);
      
      // 显示钱包地址
      walletAddressElement.textContent = publicKeyString;
      walletAddressElement.classList.remove('empty-wallet');
      
      // 刷新余额
      await refreshBalance();
      return true;
    } else {
      console.log('未找到保存的钱包，准备创建新钱包');
      return await createNewWallet();
    }
  } catch (error) {
    console.error('初始化保存的钱包失败:', error);
    showError('加载保存的钱包失败: ' + error.message);
    return false;
  }
}

// 创建新钱包
async function createNewWallet() {
  try {
    console.log('正在创建新钱包...');
    
    // 确保 Solana Web3.js 已加载
    if (typeof solanaWeb3 === 'undefined') {
      throw new Error('Solana Web3.js 未加载');
    }
    
    // 确保连接已初始化
    if (!connection) {
      const connected = await initConnection();
      if (!connected) {
        throw new Error('无法初始化连接');
      }
    }
    
    // 创建新的钱包
    wallet = solanaWeb3.Keypair.generate();
    const publicKeyString = wallet.publicKey.toString();
    console.log('新钱包已创建:', publicKeyString);
    
    // 保存钱包
    await chrome.storage.local.set({
      walletKey: JSON.stringify(Array.from(wallet.secretKey))
    });
    console.log('新钱包已保存到本地存储');
    
    // 更新界面
    const walletAddressElement = document.getElementById('wallet-address');
    if (walletAddressElement) {
      walletAddressElement.textContent = publicKeyString;
      walletAddressElement.classList.remove('empty-wallet');
    }
    
    // 刷新余额
    await refreshBalance();
    
    showSuccess('新钱包已创建');
    return true;
  } catch (error) {
    console.error('创建新钱包失败:', error);
    showError('创建新钱包失败: ' + error.message);
    return false;
  }
}

// 刷新余额
async function refreshBalance() {
  try {
    if (!wallet || !connection) {
      console.error('钱包或连接未初始化');
      return;
    }

    console.log('开始刷新余额...');
    console.log('钱包地址:', wallet.publicKey.toString());
    console.log('FANS代币地址:', FANS_TOKEN_MINT);

    // 获取UI元素
    const solBalanceElement = document.getElementById('sol-balance');
    const fansBalanceElement = document.getElementById('fans-balance');
    const accumulatedBalanceElement = document.getElementById('accumulated-balance');
    
    if (!solBalanceElement || !fansBalanceElement || !accumulatedBalanceElement) {
      console.error('找不到余额显示元素');
      return;
    }

    // 显示加载状态
    solBalanceElement.textContent = '正在加载...';
    fansBalanceElement.textContent = '正在加载...';
    accumulatedBalanceElement.textContent = '正在加载...';

    // 获取 SOL 余额
    const balance = await connection.getBalance(wallet.publicKey);
    const solBalance = balance / solanaWeb3.LAMPORTS_PER_SOL;
    console.log('SOL 余额:', solBalance);
    solBalanceElement.textContent = `${solBalance.toFixed(4)} SOL`;

    // 获取 FANS 代币余额
    try {
      console.log('正在查询代币账户...');
      const mintPubkey = new solanaWeb3.PublicKey(FANS_TOKEN_MINT);
      console.log('Mint PublicKey:', mintPubkey.toString());

      const tokenAccounts = await connection.getTokenAccountsByOwner(
        wallet.publicKey,
        { mint: mintPubkey }
      );
      
      console.log('代币账户查询结果:', tokenAccounts);
      
      let tokenBalance = 0;
      if (tokenAccounts.value.length > 0) {
        const tokenAccount = tokenAccounts.value[0];
        console.log('找到代币账户:', tokenAccount.pubkey.toString());
        console.log('代币账户数据:', tokenAccount.account.data);

        const tokenBalanceResponse = await connection.getTokenAccountBalance(
          tokenAccount.pubkey
        );
        console.log('代币余额响应:', tokenBalanceResponse);
        
        if (tokenBalanceResponse.value.uiAmountString) {
          tokenBalance = parseFloat(tokenBalanceResponse.value.uiAmountString);
          console.log('解析后的代币余额:', tokenBalance);
        }
      } else {
        console.log('未找到代币账户，可能需要初始化代币账户');
      }
      
      // 格式化并更新所有 FANS 余额显示
      const formattedBalance = tokenBalance.toLocaleString('zh-CN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      
      fansBalanceElement.textContent = `${formattedBalance} FANS`;
      accumulatedBalanceElement.textContent = `${formattedBalance} FANS`;
      
    } catch (error) {
      console.error('获取FANS余额失败:', error);
      fansBalanceElement.textContent = '获取失败';
      accumulatedBalanceElement.textContent = '获取失败';
    }

    showSuccess('余额已更新');
  } catch (error) {
    console.error('刷新余额失败:', error);
    showError('刷新余额失败：' + error.message);
  }
}

// 创建赠送功能
async function createGiveaway() {
  try {
    if (!wallet || !connection) {
      showError('请先导入钱包');
      return;
    }

    // 检查 Buffer 是否可用
    if (typeof window.Buffer === 'undefined' || typeof window.Buffer.from !== 'function') {
      console.error('Buffer 未正确初始化');
      showError('系统初始化失败，请刷新页面重试');
      return;
    }

    const totalTokens = parseFloat(document.getElementById('total-tokens').value);
    const numPackages = parseInt(document.getElementById('num-packages').value);
    const tokensPerPackage = parseFloat(document.getElementById('tokens-per-package').value);
    const tweetUrl = document.getElementById('tweet-url').value;

    if (!totalTokens || !numPackages || !tokensPerPackage || !tweetUrl) {
      showError('请填写所有必要信息');
      return;
    }

    // 验证推文 URL 格式
    if (!tweetUrl.includes('/status/')) {
      showError('请输入完整的推文链接，例如: https://twitter.com/username/status/123456789');
      return;
    }

    // 从推文URL中提取推文ID
    const tweetId = tweetUrl.split('/status/')[1]?.split('?')[0];
    if (!tweetId) {
      showError('无效的推文链接');
      return;
    }

    const requireFollow = document.getElementById('require-follow').checked;
    const requireLike = document.getElementById('require-like').checked;
    const requireRetweet = document.getElementById('require-retweet').checked;
    const requireComment = document.getElementById('require-comment').checked;

    console.log('创建赠送:', {
      totalTokens,
      numPackages,
      tokensPerPackage,
      tweetId,
      requirements: {
        follow: requireFollow,
        like: requireLike,
        retweet: requireRetweet,
        comment: requireComment
      }
    });

    // 计算每个用户可以获得的代币数量
    const amountPerUser = tokensPerPackage;
    
    // 调用合约创建赠送
    console.log('开始创建赠送交易...');
    const transaction = await createGiveawayTransaction(
      wallet,
      tweetId,
      amountPerUser,
      numPackages
    );

    if (!transaction) {
      throw new Error('创建交易失败');
    }

    console.log('交易创建成功，准备发送...');
    
    // 签名并发送交易
    const signature = await wallet.signAndSendTransaction(transaction);
    console.log('交易已发送，签名:', signature);

    // 等待交易确认
    const confirmation = await connection.confirmTransaction(signature);
    console.log('交易确认结果:', confirmation);

    if (confirmation.value.err) {
      throw new Error('交易确认失败: ' + confirmation.value.err);
    }

    // 保存赠送信息到存储
    await chrome.storage.local.set({
      [`giveaway_${tweetId}`]: {
        totalTokens,
        numPackages,
        tokensPerPackage,
        requirements: {
          follow: requireFollow,
          like: requireLike,
          retweet: requireRetweet,
          comment: requireComment
        },
        createdAt: new Date().toISOString(),
        signature
      }
    });

    showSuccess('赠送创建成功！');
    
    // 通知 content script 更新界面
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.tabs.sendMessage(tab.id, {
      type: 'REFRESH_GIVEAWAY',
      tweetId
    });

  } catch (error) {
    console.error('创建赠送失败:', error);
    showError('创建赠送失败: ' + error.message);
  }
}

// 创建赠送交易
async function createGiveawayTransaction(wallet, tweetId, amountPerUser, maxUsers) {
  try {
    // 检查用户是否有足够的代币
    const tokenAccounts = await connection.getTokenAccountsByOwner(
      wallet.publicKey,
      { mint: new solanaWeb3.PublicKey(FANS_TOKEN_MINT) }
    );

    if (tokenAccounts.value.length === 0) {
      throw new Error('找不到代币账户');
    }

    const tokenAccount = tokenAccounts.value[0];
    const balance = await connection.getTokenAccountBalance(tokenAccount.pubkey);
    const userBalance = parseFloat(balance.value.uiAmountString);

    const totalRequired = amountPerUser * maxUsers;
    if (userBalance < totalRequired) {
      throw new Error(`代币余额不足。需要 ${totalRequired} FANS，但只有 ${userBalance} FANS`);
    }

    // 创建赠送交易
    const transaction = new solanaWeb3.Transaction();
    
    // 添加创建赠送指令
    const createGiveawayIx = await createGiveawayInstruction(
      wallet.publicKey,
      tweetId,
      amountPerUser,
      maxUsers
    );
    transaction.add(createGiveawayIx);

    // 获取最新的区块哈希
    const { blockhash } = await connection.getRecentBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    return transaction;
  } catch (error) {
    console.error('创建赠送交易失败:', error);
    throw error;
  }
}

// 创建赠送指令
async function createGiveawayInstruction(walletPubkey, tweetId, amountPerUser, maxUsers) {
  // 生成赠送账户的 PDA
  const [giveawayPda] = await solanaWeb3.PublicKey.findProgramAddress(
    [Buffer.from('giveaway'), Buffer.from(tweetId)],
    PROGRAM_ID
  );

  // 获取用户的代币账户
  const userTokenAccount = await getAssociatedTokenAddress(
    new solanaWeb3.PublicKey(FANS_TOKEN_MINT),
    walletPubkey
  );

  // 创建指令
  return new solanaWeb3.TransactionInstruction({
    keys: [
      { pubkey: walletPubkey, isSigner: true, isWritable: true },
      { pubkey: giveawayPda, isSigner: false, isWritable: true },
      { pubkey: userTokenAccount, isSigner: false, isWritable: true },
      { pubkey: new solanaWeb3.PublicKey(FANS_TOKEN_MINT), isSigner: false, isWritable: false },
      { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: Buffer.from([
      0, // 指令类型：创建赠送
      ...new BN(amountPerUser).toArray('le', 8),
      ...new BN(maxUsers).toArray('le', 4),
      ...Buffer.from(tweetId),
    ]),
  });
}

// 获取关联的代币地址
async function getAssociatedTokenAddress(mint, owner) {
  const [address] = await solanaWeb3.PublicKey.findProgramAddress(
    [
      owner.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return address;
}

// 显示错误消息
function showError(message) {
  const statusElement = document.getElementById('status-message');
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.className = 'status-message error';
    statusElement.style.display = 'block';
    setTimeout(() => {
      statusElement.textContent = '';
      statusElement.className = 'status-message';
      statusElement.style.display = 'none';
    }, 3000);
  }
}

// 显示成功消息
function showSuccess(message) {
  const statusElement = document.getElementById('status-message');
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.className = 'status-message success';
    statusElement.style.display = 'block';
    setTimeout(() => {
      statusElement.textContent = '';
      statusElement.className = 'status-message';
      statusElement.style.display = 'none';
    }, 3000);
  }
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', async () => {
  console.log('页面加载完成，开始初始化...');
  
  try {
    // 初始化界面状态
    const walletAddressElement = document.getElementById('wallet-address');
    const privateKeyInput = document.getElementById('private-key-input');
    
    if (!walletAddressElement || !privateKeyInput) {
      throw new Error('找不到必要的界面元素');
    }
    
    // 设置初始状态
    walletAddressElement.textContent = '正在初始化...';
    walletAddressElement.classList.add('empty-wallet');
    privateKeyInput.style.display = 'none';
    
    // 初始化连接
    const connected = await initConnection();
    if (!connected) {
      throw new Error('无法连接到 Solana 网络');
    }
    console.log('连接初始化成功');
    
    // 初始化保存的钱包
    const hasWallet = await initSavedWallet();
    if (!hasWallet) {
      console.log('未找到已保存的钱包，创建新钱包');
      const created = await createNewWallet();
      if (!created) {
        throw new Error('创建新钱包失败');
      }
    }

    // 绑定按钮事件
    const buttons = {
      'import-wallet': importWallet,
      'refresh-balance': refreshBalance,
      'create-giveaway': createGiveaway,
      'test-connection': async () => {
        try {
          await connection.getVersion();
          showSuccess('连接测试成功！');
        } catch (error) {
          showError('连接测试失败：' + error.message);
        }
      }
    };

    for (const [id, handler] of Object.entries(buttons)) {
      const button = document.getElementById(id);
      if (button) {
        button.addEventListener('click', handler);
        console.log(`已绑定 ${id} 按钮事件`);
      } else {
        console.error(`未找到 ${id} 按钮`);
      }
    }

    // 添加自动刷新余额的定时器
    setInterval(async () => {
      if (wallet && connection) {
        await refreshBalance();
      }
    }, 30000); // 每30秒自动刷新一次

  } catch (error) {
    console.error('初始化失败:', error);
    showError('初始化失败：' + error.message);
  }
});