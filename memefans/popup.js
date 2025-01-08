// 常量定义
const ENV = 'development'; // 设置为开发环境
const FANS_TOKEN_MINT = ENV === 'development' 
  ? '6xfa7wnrsNR3DsK5xHuSGWjYLayFQUiemb8FmnvLBwes'  // 开发环境
  : 'FANSXnVq6k3R9buRNBJ5kP3xFVKHNkgC5yYvZsHgiZ9f'; // 生产环境
const MEME_TOKEN_MINT = 'METAmTMXwdb8gYzyCPfXXFmZZw4rUsXX58PNsDg7zjL';
const USDC_TOKEN_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const RAYDIUM_FANS_USDC_POOL = '2yN5KZa6zJdFo8wbXZjPcUQhptw8yZHVH8Ycr6LnLGJV';
const POOL_ADDRESS = '2GGiVEZcSpRRKx4CCCr12HXEsnfdY96u6GNjEAnqougx';  // 开发环境地址
const FEE_ADDRESS = '2GGiVEZcSpRRKx4CCCr12HXEsnfdY96u6GNjEAnqougx';    // 开发环境地址
const FEE_PERCENTAGE = 0.01;               // 1% 手续费
const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const ASSOCIATED_TOKEN_PROGRAM_ID = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';
const PROGRAM_ID = '2GGiVEZcSpRRKx4CCCr12HXEsnfdY96u6GNjEAnqougx';

// 初始化连接和钱包
let connection = null;
let wallet = null;

// 全局变量用于跟踪库的加载状态
let isLoadingLibraries = false;
let librariesLoaded = false;

// 初始化所有必要的库
async function initializeLibraries() {
  try {
    if (librariesLoaded) {
      console.log('库已加载，跳过初始化');
      return;
    }

    console.log('开始初始化库...');

    // 加载 Solana Web3.js
    if (!window.solanaWeb3) {
      console.error('未找到 solanaWeb3，请确保已加载 solana-web3.js');
      throw new Error('solanaWeb3 未加载');
    }

    // 加载 buffer
    if (!window.buffer) {
      console.error('未找到 buffer，请确保已加载 buffer.js');
      throw new Error('buffer 未加载');
    }

    // 加载 SPL Token
    if (!window.splToken) {
      console.error('未找到 splToken，请确保已加载 spl-token.js');
      throw new Error('splToken 未加载');
    }

    // 初始化 SPL Token
    window.splToken.initialize();

    // 初始化连接
    if (!window.connection) {
      const endpoint = 'https://api.devnet.solana.com';
      window.connection = new window.solanaWeb3.Connection(endpoint, 'confirmed');
      console.log('Solana 连接初始化成功');
      
      // 初始化常用的 PublicKey 对象
      window.tokenProgramId = window.splToken.TOKEN_PROGRAM_ID();
      window.associatedTokenProgramId = window.splToken.ASSOCIATED_TOKEN_PROGRAM_ID();
      window.programId = window.tokenProgramId;
      window.fansTokenMint = new window.solanaWeb3.PublicKey(FANS_TOKEN_MINT);
      
      console.log('Solana 版本信息:', {
        TOKEN_PROGRAM_ID: window.tokenProgramId.toString(),
        ASSOCIATED_TOKEN_PROGRAM_ID: window.associatedTokenProgramId.toString(),
        PROGRAM_ID: window.programId.toString(),
        FANS_TOKEN_MINT: window.fansTokenMint.toString()
      });
    }

    librariesLoaded = true;
    console.log('所有库初始化完成');
  } catch (error) {
    console.error('加载库失败:', error);
    throw error;
  }
}

// 加载单个脚本的辅助函数
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = resolve;
    script.onerror = () => reject(new Error('加载脚本失败: ' + src));
    document.head.appendChild(script);
  });
}

// 检查钱包连接状态
async function checkWalletConnection() {
  try {
    if (!window.wallet || !window.wallet.publicKey) {
      document.getElementById('wallet-address').textContent = 'Not Connected';
      document.getElementById('sol-balance').textContent = '0';
      document.getElementById('fans-balance').textContent = '0';
      return false;
    }

    const walletAddress = window.wallet.publicKey.toString();
    document.getElementById('wallet-address').textContent = walletAddress;
    
    // 立即刷新余额
    await refreshBalance();
    return true;
  } catch (error) {
    console.error('检查钱包连接失败:', error);
    return false;
  }
}

// 刷新余额
async function refreshBalance() {
  try {
    if (!window.wallet || !window.wallet.publicKey || !window.connection) {
      console.log('钱包或连接未初始化，显示 0 余额');
      document.getElementById('sol-balance').textContent = '0';
      document.getElementById('fans-balance').textContent = '0';
      return;
    }

    console.log('正在刷新余额...');
    
    // 获取 SOL 余额
    const solBalance = await window.connection.getBalance(window.wallet.publicKey);
    const newSolBalance = (solBalance / 1e9).toFixed(4);
    console.log('SOL 余额:', newSolBalance);
    document.getElementById('sol-balance').textContent = newSolBalance;
    
    // 获取 FANS 余额
    try {
      if (!window.fansTokenMint) {
        console.error('FANS_TOKEN_MINT 未初始化');
        document.getElementById('fans-balance').textContent = '0';
        return;
      }

      const accounts = await window.connection.getTokenAccountsByOwner(
        window.wallet.publicKey,
        { mint: window.fansTokenMint }
      );
      
      if (accounts.value.length > 0) {
        const tokenAccount = accounts.value[0];
        const accountInfo = await window.connection.getTokenAccountBalance(tokenAccount.pubkey);
        const newFansBalance = accountInfo.value.uiAmount.toFixed(4);
        console.log('FANS 余额:', newFansBalance);
        document.getElementById('fans-balance').textContent = newFansBalance;
      } else {
        console.log('未找到 FANS 代币账户，显示 0 余额');
        document.getElementById('fans-balance').textContent = '0';
      }
    } catch (error) {
      console.error('获取 FANS 余额失败:', error);
      document.getElementById('fans-balance').textContent = '0';
    }
  } catch (error) {
    console.error('刷新余额失败:', error);
    document.getElementById('sol-balance').textContent = '0';
    document.getElementById('fans-balance').textContent = '0';
  }
}

// 页面加载时初始化
async function initialize() {
  try {
    console.log('开始初始化...');
    
    // 等待 i18n 加载完成
    await waitForI18n();
    
    // 初始化必要的库
    await initializeLibraries();
    console.log('库初始化完成');
    
    // 初始化钱包
    const hasWallet = await initializeWallet();
    if (!hasWallet) {
      console.log('没有找到已保存的钱包，创建新钱包');
      await createNewWallet();
    }
    
    // 检查钱包连接状态并更新余额
    await checkWalletConnection();
    
    // 初始化其他功能
    await Promise.all([
      updateTokenPrices(),
      initializeTokenCalculation(),
      initializeLanguage(),
      initializeEventListeners()
    ]);

    // 设置自动刷新
    setupAutoRefresh();
    
    console.log('初始化完成');
  } catch (error) {
    console.error('初始化失败:', error);
    showError('初始化失败: ' + error.message);
  }
}

// 设置自动刷新函数
function setupAutoRefresh() {
  console.log('设置自动刷新...');
  let checkWalletInterval = null;

  // 设置定时刷新
  checkWalletInterval = setInterval(async () => {
    // 只在钱包已连接时才刷新余额
    if (window.wallet && window.wallet.publicKey) {
      await refreshBalance();
    }
  }, 60000); // 每60秒刷新一次
  
  // 清理定时器
  window.addEventListener('unload', () => {
    if (checkWalletInterval) {
      clearInterval(checkWalletInterval);
    }
  });
}

// 导出私钥
async function exportPrivateKey() {
  try {
    if (!wallet) {
      throw new Error('钱包未初始化');
    }
    // 转换为 bs58 格式
    const privateKey = bs58.encode(wallet.secretKey);
    console.log('私钥已导出');
    return privateKey;
  } catch (error) {
    console.error('导出私钥失败:', error);
    throw error;
  }
}

// 导入私钥
async function importPrivateKey(privateKeyString) {
  try {
    console.log('开始导入私钥...');
    
    // 确保库已加载
    await initializeLibraries();
    
    // 去掉前缀，解码 bs58 格式
    const privateKey = bs58.decode(privateKeyString);
    console.log('解码后的私钥长度:', privateKey.length);
    
    // 验证私钥长度
    if (privateKey.length !== 64) {
      throw new Error('无效的私钥长度');
    }
    
    // 创建钱包
    const importedWallet = window.solanaWeb3.Keypair.fromSecretKey(privateKey);
    const walletKey = Array.from(importedWallet.secretKey);
    
    // 保存钱包
    console.log('保存导入的钱包到存储...');
    await chrome.storage.local.clear(); // 清除旧的钱包数据
    await chrome.storage.local.set({ walletKey: JSON.stringify(walletKey) });
    
    // 设置为当前钱包
    window.wallet = importedWallet;
    
    // 更新显示
    const walletAddress = window.wallet.publicKey.toString();
    console.log('导入的钱包地址:', walletAddress);
    
    const walletElem = document.getElementById('wallet-address');
    if (walletElem) {
      walletElem.textContent = walletAddress;
      walletElem.classList.remove('empty-wallet');
    }
    
    // 立即刷新余额
    await refreshBalance();
    
    return true;
  } catch (error) {
    console.error('导入私钥失败:', error);
    showError('导入私钥失败: ' + error.message);
    return false;
  }
}

// 创建新钱包
async function createNewWallet() {
  try {
    console.log('正在创建新钱包...');
    const newWallet = window.solanaWeb3.Keypair.generate();
    const walletKey = Array.from(newWallet.secretKey);
    
    // 保存钱包
    console.log('保存新钱包到存储...');
    await chrome.storage.local.set({ walletKey: JSON.stringify(walletKey) });
    
    // 设置为当前钱包
    window.wallet = newWallet;
    
    // 更新显示
    const walletAddress = window.wallet.publicKey.toString();
    console.log('新钱包地址:', walletAddress);
    
    const walletElem = document.getElementById('wallet-address');
    if (walletElem) {
      walletElem.textContent = walletAddress;
      walletElem.classList.remove('empty-wallet');
    }
    
    // 立即刷新余额
    await refreshBalance();
    
    return true;
  } catch (error) {
    console.error('创建新钱包失败:', error);
    showError('创建新钱包失败: ' + error.message);
    return false;
  }
}

// 初始化保存的钱包
async function initializeWallet() {
  try {
    console.log('开始初始化钱包...');
    
    // 尝试从本地存储加载钱包
    const result = await chrome.storage.local.get(['walletKey']);
    console.log('从存储中读取到的钱包数据:', result);
    
    if (result.walletKey) {
      console.log('找到保存的钱包，正在恢复...');
      const secretKey = new Uint8Array(JSON.parse(result.walletKey));
      console.log('解析后的私钥长度:', secretKey.length);
      
      window.wallet = window.solanaWeb3.Keypair.fromSecretKey(secretKey);
      const walletAddress = window.wallet.publicKey.toString();
      console.log('钱包已恢复:', walletAddress);
      
      // 更新显示
      const walletElem = document.getElementById('wallet-address');
      if (walletElem) {
        walletElem.textContent = walletAddress;
        walletElem.classList.remove('empty-wallet');
      }
      
      // 立即刷新余额
      await refreshBalance();
      
      return true;
    }
    
    console.log('未找到保存的钱包');
    return false;
  } catch (error) {
    console.error('初始化钱包失败:', error);
    return false;
  }
}

// 存储池相关函数
async function createStoragePool() {
  try {
    // 确保已初始化
    if (!librariesLoaded) {
      await initializeLibraries();
    }
    
    // 获取程序代币账户
    const [programTokenAccount] = await window.solanaWeb3.PublicKey.findProgramAddress(
      [Buffer.from('token_account')],
      window.programId
    );

    // 检查程序代币账户是否存在
    const programTokenAccountInfo = await window.connection.getAccountInfo(programTokenAccount);
    
    if (!programTokenAccountInfo) {
      const payer = window.wallet.publicKey;
      
      // 创建关联代币账户的指令
      const createATAInstruction = await window.splToken.Token.createAssociatedTokenAccountInstruction(
        window.associatedTokenProgramId,
        window.tokenProgramId,
        window.fansTokenMint,
        programTokenAccount,
        payer,
        payer
      );

      // 创建交易
      const transaction = new window.solanaWeb3.Transaction().add(createATAInstruction);
      
      // 获取最新的 blockhash
      const { blockhash } = await window.connection.getLatestBlockhash('confirmed');
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = payer;

      console.log('创建存储池参数:', {
        programId: window.programId.toString(),
        tokenProgramId: window.tokenProgramId.toString(),
        associatedTokenProgramId: window.associatedTokenProgramId.toString(),
        mint: window.fansTokenMint.toString(),
        programTokenAccount: programTokenAccount.toString(),
        payer: payer.toString()
      });

      // 签名并发送交易
      const signedTransaction = await window.wallet.signTransaction(transaction);
      const signature = await window.connection.sendRawTransaction(signedTransaction.serialize());
      
      // 等待交易确认
      await window.connection.confirmTransaction(signature);
      console.log('存储池创建成功:', signature);
    }

    return {
      programId: PROGRAM_ID,
      programTokenAccount: programTokenAccount.toString()
    };
  } catch (error) {
    console.error('创建存储池失败:', error);
    throw error;
  }
}

// 创建空投
async function createAirdrop(tweetUrl, totalTokens, numPackages, isRandom, tokensPerPackage, minTokens, maxTokens, requirements) {
  try {
    console.log('开始创建空投...');
    console.log('Tweet URL:', tweetUrl);
    console.log('总代币数:', totalTokens);
    console.log('包数量:', numPackages);
    console.log('是否随机:', isRandom);
    
    // 获取 Tweet ID
    const tweetId = getTweetIdFromUrl(tweetUrl);
    if (!tweetId) {
      throw new Error('无效的推文 URL');
    }
    console.log('Tweet ID:', tweetId);

    // 计算每个包的代币数量
    const amountPerUser = isRandom ? 0 : Math.floor(totalTokens / numPackages);
    console.log('每个包的代币数量:', amountPerUser);

    // 检查钱包连接
    if (!window.wallet) {
      throw new Error('钱包未连接');
    }

    // 调用合约创建赠送
    console.log('调用合约创建赠送...');
    const result = await window.contract.createGiveaway(
      window.wallet,
      tweetId,
      new BN(amountPerUser),
      new BN(numPackages)
    );

    if (result.success) {
      console.log('赠送创建成功:', result);
      return {
        success: true,
        signature: result.signature,
        giveawayPda: result.giveawayPda
      };
    } else {
      throw new Error(result.error || '创建赠送失败');
    }
  } catch (error) {
    console.error('创建空投失败:', error);
    throw error;
  }
}

// 从URL中提取推文ID
function getTweetIdFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const statusIndex = pathParts.indexOf('status');
    if (statusIndex !== -1 && pathParts[statusIndex + 1]) {
      return pathParts[statusIndex + 1];
    }
    return null;
  } catch (error) {
    console.error('解析推文URL时出错:', error);
    return null;
  }
}

// 导入钱包按钮点击事件
document.getElementById('import-wallet')?.addEventListener('click', () => {
  document.getElementById('import-dialog').style.display = 'block';
});

// 取消导入按钮点击事件
document.getElementById('cancel-import')?.addEventListener('click', () => {
  document.getElementById('import-dialog').style.display = 'none';
  document.getElementById('private-key').value = '';
});

// 确认导入按钮点击事件
document.getElementById('confirm-import')?.addEventListener('click', async () => {
  try {
    const privateKeyInput = document.getElementById('private-key');
    const privateKeyString = privateKeyInput.value.trim();
    
    if (!privateKeyString) {
      showError('请输入私钥');
      return;
    }

    // 导入私钥
    const success = await importPrivateKey(privateKeyString);
    if (success) {
      // 隐藏对话框并清空输入
      document.getElementById('import-dialog').style.display = 'none';
      privateKeyInput.value = '';
      showSuccess('钱包导入成功');
    }
  } catch (error) {
    console.error('导入钱包失败:', error);
    showError('导入失败: ' + error.message);
  }
});

// 导出钱包按钮点击事件
document.getElementById('export-wallet')?.addEventListener('click', async () => {
  try {
    if (!wallet) {
      throw new Error('钱包未初始化');
    }

    // 导出私钥
    const privateKey = await exportPrivateKey();
    
    // 显示私钥
    const privateKeyDisplay = document.getElementById('private-key-display');
    const privateKeyText = privateKeyDisplay.querySelector('.private-key-text');
    privateKeyText.textContent = privateKey;
    privateKeyDisplay.style.display = 'block';
  } catch (error) {
    console.error('导出私钥失败:', error);
    showError('导出失败: ' + error.message);
  }
});

// 复制私钥按钮点击事件
document.getElementById('copy-key')?.addEventListener('click', async () => {
  try {
    const privateKeyText = document.querySelector('.private-key-text').textContent;
    await navigator.clipboard.writeText(privateKeyText);
    showSuccess('私钥已复制到剪贴板');
  } catch (error) {
    console.error('复制私钥失败:', error);
    showError('复制失败: ' + error.message);
  }
});

// 关闭私钥显示按钮点击事件
document.getElementById('close-key')?.addEventListener('click', () => {
  const privateKeyDisplay = document.getElementById('private-key-display');
  privateKeyDisplay.style.display = 'none';
  privateKeyDisplay.querySelector('.private-key-text').textContent = '';
});

// 代币计算相关
function initializeTokenCalculation() {
  const totalTokens = document.getElementById('total-tokens');
  const numPackages = document.getElementById('num-packages');
  const result = document.getElementById('token-result');
  const distributionType = document.getElementById('distribution-type');
  const randomRange = document.getElementById('random-range');
  const minTokens = document.getElementById('min-tokens');
  const maxTokens = document.getElementById('max-tokens');

  if (!totalTokens || !numPackages || !result || !distributionType || !randomRange || !minTokens || !maxTokens) {
    console.error('找不到必需的DOM元素');
    return;
  }

  function calculate() {
    const total = parseFloat(totalTokens.value) || 0;
    const packages = parseInt(numPackages.value) || 1;
    
    if (total > 0 && packages > 0) {
      const perPackage = (total / packages).toFixed(4);
      result.textContent = perPackage;
      
      if (distributionType.value === 'random') {
        randomRange.style.display = 'block';
        minTokens.value = (perPackage * 0.5).toFixed(4);
        maxTokens.value = (perPackage * 1.5).toFixed(4);
      } else {
        randomRange.style.display = 'none';
      }
    }
  }

  totalTokens.addEventListener('input', calculate);
  numPackages.addEventListener('input', calculate);
  distributionType.addEventListener('change', calculate);
  
  // 初始计算
  calculate();
}

// 监听发送方式变化
document.getElementById('distribution-type').addEventListener('change', function() {
  const randomRange = document.getElementById('random-range');
  if (this.value === 'random') {
    randomRange.style.display = 'block';
  } else {
    randomRange.style.display = 'none';
  }
  updateTokenResult();
});

// 监听输入变化
['total-tokens', 'num-packages', 'min-tokens', 'max-tokens'].forEach(id => {
  document.getElementById(id).addEventListener('input', updateTokenResult);
});

// 更新代币结果显示
function updateTokenResult() {
  const totalTokens = parseFloat(document.getElementById('total-tokens').value) || 0;
  const numPackages = parseInt(document.getElementById('num-packages').value) || 1;
  const distributionType = document.getElementById('distribution-type').value;
  const minTokens = parseFloat(document.getElementById('min-tokens').value) || 0;
  const maxTokens = parseFloat(document.getElementById('max-tokens').value) || 0;
  const resultElement = document.getElementById('token-result');

  if (distributionType === 'fixed') {
    const tokensPerPackage = totalTokens / numPackages;
    resultElement.textContent = tokensPerPackage.toFixed(4);
  } else {
    resultElement.textContent = `${minTokens.toFixed(4)} - ${maxTokens.toFixed(4)}`;
  }
}

// 创建赠送按钮点击事件
document.getElementById('create-airdrop').addEventListener('click', async () => {
  try {
    const tweetUrl = document.getElementById('tweet-url').value;
    const totalTokens = parseFloat(document.getElementById('total-tokens').value);
    const numPackages = parseInt(document.getElementById('num-packages').value);
    const distributionType = document.getElementById('distribution-type').value;
    const isRandom = distributionType === 'random';
    
    let tokensPerPackage = 0;
    let minTokens = 0;
    let maxTokens = 0;

    if (isRandom) {
      minTokens = parseFloat(document.getElementById('min-tokens').value);
      maxTokens = parseFloat(document.getElementById('max-tokens').value);
      if (minTokens >= maxTokens) {
        throw new Error('最小代币数量必须小于最大代币数量');
      }
    } else {
      tokensPerPackage = totalTokens / numPackages;
    }

    // 验证输入
    if (!tweetUrl) {
      throw new Error('请输入推文链接');
    }
    if (isNaN(totalTokens) || totalTokens <= 0) {
      throw new Error('请输入有效的代币数量');
    }
    if (isNaN(numPackages) || numPackages <= 0) {
      throw new Error('请输入有效的礼包数量');
    }

    const requirements = {
      follow: document.getElementById('require-follow').checked,
      like: document.getElementById('require-like').checked,
      retweet: document.getElementById('require-retweet').checked,
      comment: document.getElementById('require-comment').checked
    };

    // 禁用按钮
    const button = document.getElementById('create-airdrop');
    button.disabled = true;
    button.textContent = '创建中...';

    const result = await createAirdrop(
      tweetUrl,
      totalTokens,
      numPackages,
      isRandom,
      tokensPerPackage,
      minTokens,
      maxTokens,
      requirements
    );

    console.log('空投创建成功:', result);
    showSuccess('空投创建成功！');
  } catch (error) {
    console.error('创建空投失败:', error);
    showError(error.message || '创建空投失败');
  } finally {
    // 恢复按钮状态
    const button = document.getElementById('create-airdrop');
    button.disabled = false;
    button.textContent = '创建赠送';
  }
});

function showSuccess(message) {
  const connectionStatus = document.getElementById('connection-status');
  connectionStatus.textContent = message;
  connectionStatus.style.background = 'var(--success)';
  connectionStatus.style.display = 'block';
  setTimeout(() => {
    connectionStatus.style.display = 'none';
  }, 3000);
}

function showError(message) {
  console.error(message);
  const statusMessage = document.getElementById('status-message');
  if (statusMessage) {
    statusMessage.textContent = message;
    statusMessage.className = 'status-message error';
    statusMessage.style.display = 'block';
    setTimeout(() => {
      statusMessage.className = 'status-message';
    }, 3000);
  }
}

// 价格缓存
let tokenPrices = {
  SOL: null,
  FANS: null
};

// 从 Jupiter 获取 SOL 价格
async function getSolPrice() {
  try {
    const response = await fetch('https://price.jup.ag/v4/price?ids=SOL');
    const data = await response.json();
    const price = data?.data?.SOL?.price;
    console.log(' SOL 价格数据:', data);
    console.log(' 计算得到的 SOL 价格:', price);
    return price;
  } catch (error) {
    console.error(' 获取 SOL 价格失败:', error);
    return null;
  }
}

// 从 Jupiter 获取 FANS 价格
async function getFansPrice() {
  try {
    // 使用 Jupiter 的 quote API 获取 FANS/USDC 价格
    const response = await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${FANS_TOKEN_MINT}&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000000&slippageBps=50`);
    const data = await response.json();
    
    if (!data || !data.outAmount) {
      throw new Error('无法获取 FANS 价格数据');
    }

    // 计算价格 (USDC 有 6 位小数，FANS 有 9 位小数)
    const price = data.outAmount / Math.pow(10, 6) / Math.pow(10, 9);
    console.log(' FANS 价格原始数据:', data);
    console.log(' 计算得到的 FANS 价格:', price);
    return price;
  } catch (error) {
    console.error(' 获取 FANS 价格失败:', error);
    return null;
  }
}

// 更新所有代币价格
async function updateTokenPrices() {
  try {
    console.log('==================== 价格更新开始 ====================');
    
    // 并行获取价格
    const [solPrice, fansPrice] = await Promise.all([
      getSolPrice(),
      getFansPrice()
    ]);

    console.log(' 获取到的原始价格:');
    console.log('   SOL:', solPrice, 'USD');
    console.log('   FANS:', fansPrice, 'USD');

    // 更新价格缓存
    if (solPrice !== null && !isNaN(solPrice)) {
      tokenPrices.SOL = solPrice;
    } else {
      console.warn(' SOL 价格无效，使用默认价格');
      tokenPrices.SOL = 110.5;
    }

    if (fansPrice !== null && !isNaN(fansPrice)) {
      tokenPrices.FANS = fansPrice;
    } else {
      console.warn(' FANS 价格无效，使用默认价格');
      tokenPrices.FANS = 0.02;
    }

    console.log(' 最终使用的价格:');
    console.log('   SOL:', tokenPrices.SOL, 'USD');
    console.log('   FANS:', tokenPrices.FANS, 'USD');
    console.log('==================== 价格更新结束 ====================\n');
  } catch (error) {
    console.error(' 更新代币价格失败:', error);
    // 使用默认价格
    tokenPrices.SOL = 110.5;
    tokenPrices.FANS = 0.02;
  }
}

// BN 类用于处理大数
class BN {
  constructor(number) {
    if (typeof number === 'number') {
      this.number = BigInt(Math.floor(number * 1e9));
    } else if (typeof number === 'string') {
      this.number = BigInt(number);
    } else if (number instanceof BigInt) {
      this.number = number;
    } else {
      throw new Error('不支持的数字类型');
    }
  }

  toArray() {
    const buffer = Buffer.alloc(8);
    const value = this.number;
    buffer.writeBigInt64LE(value);
    return Array.from(buffer);
  }

  toString() {
    return this.number.toString();
  }
}

// 代币领取相关函数
async function claimAirdrop(airdropId, userAddress) {
  try {
    if (!wallet) {
      throw new Error('请先连接钱包');
    }

    // 获取赠送记录
    const { airdrops = [] } = await chrome.storage.local.get('airdrops');
    const airdrop = airdrops.find(a => a.id === airdropId);
    
    if (!airdrop) {
      throw new Error('找不到赠送记录');
    }

    if (airdrop.remainingPackages <= 0) {
      throw new Error('赠送已结束');
    }

    if (airdrop.claimedBy.includes(userAddress)) {
      throw new Error('您已经领取过了');
    }

    // 验证 Twitter 要求
    const tweetId = getTweetIdFromUrl(airdrop.tweetUrl);
    const verifyResult = await verifyTwitterRequirements(tweetId, userAddress, airdrop.requirements);
    
    if (!verifyResult.success) {
      const failed = Object.entries(verifyResult.details)
        .filter(([, success]) => !success)
        .map(([requirement]) => requirement);
      throw new Error(`请先完成以下要求: ${failed.join(', ')}`);
    }

    // 创建领取交易
    const transaction = new solanaWeb3.Transaction();
    
    // 获取用户的代币账户
    const userTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      new solanaWeb3.PublicKey(FANS_TOKEN_MINT),
      new solanaWeb3.PublicKey(userAddress)
    );

    // 获取存储池的代币账户
    const poolTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      new solanaWeb3.PublicKey(FANS_TOKEN_MINT),
      new solanaWeb3.PublicKey(airdrop.poolAccount)
    );

    // 计算领取数量
    let claimAmount;
    if (airdrop.isRandom) {
      const min = airdrop.tokensPerPackage.min * 1e9;
      const max = airdrop.tokensPerPackage.max * 1e9;
      claimAmount = Math.floor(Math.random() * (max - min + 1) + min);
    } else {
      claimAmount = Math.floor(airdrop.tokensPerPackage * 1e9);
    }

    // 添加转账指令
    transaction.add(
      createTransferInstruction(
        poolTokenAccount.address,
        userTokenAccount.address,
        new solanaWeb3.PublicKey(airdrop.poolAccount),
        claimAmount,
        [],
        TOKEN_PROGRAM_ID
      )
    );

    // 发送交易
    const signature = await connection.sendTransaction(transaction, [wallet]);
    await connection.confirmTransaction(signature);

    // 更新赠送记录
    airdrop.remainingPackages--;
    airdrop.claimedBy.push(userAddress);
    await chrome.storage.local.set({ airdrops });

    // 刷新余额
    await refreshBalance();

    return {
      success: true,
      signature,
      amount: claimAmount / 1e9
    };
  } catch (error) {
    console.error('领取代币失败:', error);
    throw error;
  }
}

// 添加领取按钮点击事件
document.addEventListener('DOMContentLoaded', () => {
  const claimButtons = document.querySelectorAll('.claim-button');
  claimButtons.forEach(button => {
    button.addEventListener('click', async () => {
      try {
        const airdropId = button.dataset.airdropId;
        const userAddress = wallet.publicKey.toString();
        
        // 显示加载状态
        button.disabled = true;
        button.textContent = '领取中...';
        
        // 领取代币
        const result = await claimAirdrop(airdropId, userAddress);
        
        // 显示成功消息
        showSuccess(`成功领取 ${result.amount} FANS`);
        
        // 刷新界面
        button.textContent = '已领取';
        button.disabled = true;
      } catch (error) {
        console.error('领取失败:', error);
        showError(error.message);
        
        // 恢复按钮状态
        button.disabled = false;
        button.textContent = '领取';
      }
    });
  });
});

// 定义 showError 函数
window.showError = function(message) {
  console.error(message);
  const statusMessage = document.getElementById('status-message');
  if (statusMessage) {
    statusMessage.textContent = message;
    statusMessage.className = 'status-message error';
    statusMessage.style.display = 'block';
    setTimeout(() => {
      statusMessage.className = 'status-message';
    }, 3000);
  }
};

// 当前语言
let currentLang = 'en'; // 默认英文

// 更新页面文本
function updateTexts() {
  console.log('更新文本，当前语言:', currentLang);
  if (!window.i18n || !window.i18n[currentLang]) {
    console.error('i18n 未正确初始化');
    return;
  }

  // 更新所有带有 data-i18n 属性的元素
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (window.i18n[currentLang] && window.i18n[currentLang][key]) {
      element.textContent = window.i18n[currentLang][key];
    }
  });

  // 更新所有带有 data-i18n-placeholder 属性的元素
  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    const key = element.getAttribute('data-i18n-placeholder');
    if (window.i18n[currentLang] && window.i18n[currentLang][key]) {
      element.placeholder = window.i18n[currentLang][key];
    }
  });

  // 更新语言切换按钮文本
  const switchLangBtn = document.getElementById('switch-lang');
  if (switchLangBtn) {
    switchLangBtn.textContent = window.i18n[currentLang].switchLang;
  }

  // 更新下拉框选项
  document.querySelectorAll('option[data-i18n]').forEach(option => {
    const key = option.getAttribute('data-i18n');
    if (window.i18n[currentLang] && window.i18n[currentLang][key]) {
      option.textContent = window.i18n[currentLang][key];
    }
  });
}

// 初始化语言设置
async function initializeLanguage() {
  try {
    // 强制设置默认语言为英文
    currentLang = 'en';
    localStorage.removeItem('language');
    await chrome.storage.local.remove(['language']);
    
    // 尝试从存储中获取语言设置
    const savedLang = localStorage.getItem('language');
    const result = await chrome.storage.local.get(['language']);
    
    console.log('已保存的语言设置:', { localStorage: savedLang, chromeStorage: result.language });
    
    // 只有当存储中的语言设置存在且为有效值时才使用它
    if (savedLang && ['en', 'zh'].includes(savedLang)) {
      currentLang = savedLang;
    } else if (result.language && ['en', 'zh'].includes(result.language)) {
      currentLang = result.language;
      localStorage.setItem('language', currentLang);
    } else {
      // 如果没有有效的语言设置，保存默认语言
      localStorage.setItem('language', currentLang);
      await chrome.storage.local.set({ language: currentLang });
    }
    
    console.log('当前使用的语言:', currentLang);
    updateTexts();
  } catch (error) {
    console.error('加载语言设置失败:', error);
    // 如果加载失败，使用默认语言
    currentLang = 'en';
    updateTexts();
  }
}

// 保存语言设置
async function saveLanguage(lang) {
  try {
    if (!['en', 'zh'].includes(lang)) {
      console.error('无效的语言设置:', lang);
      return;
    }
    
    localStorage.setItem('language', lang);
    await chrome.storage.local.set({ language: lang });
    console.log('语言设置已保存:', lang);
  } catch (error) {
    console.error('保存语言设置失败:', error);
    // 如果 chrome.storage 保存失败，至少保存到 localStorage
    localStorage.setItem('language', lang);
  }
}

// 初始化事件监听器
function initializeEventListeners() {
  // 语言切换按钮
  const switchLangBtn = document.getElementById('switch-lang');
  if (switchLangBtn) {
    switchLangBtn.addEventListener('click', async () => {
      console.log('切换语言 从', currentLang);
      currentLang = currentLang === 'zh' ? 'en' : 'zh';
      console.log('切换到', currentLang);
      await saveLanguage(currentLang);
      updateTexts();
    });
  }
}

// 等待 i18n 加载完成
function waitForI18n() {
  return new Promise((resolve) => {
    if (window.i18n) {
      resolve();
    } else {
      window.addEventListener('i18nLoaded', resolve);
    }
  });
}

// 当 DOM 加载完成时开始初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// 复制钱包地址
document.getElementById('copy-address').addEventListener('click', async () => {
  const address = document.getElementById('wallet-address').textContent;
  if (address && address !== 'Not Connected') {
    try {
      await navigator.clipboard.writeText(address);
      showSuccess('Address copied to clipboard');
    } catch (err) {
      console.error('Failed to copy address:', err);
      showError('Failed to copy address');
    }
  }
});