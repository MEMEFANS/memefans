// 常量定义
const ENV = 'development'; // 设置为开发环境
const FANS_TOKEN_MINT = ENV === 'development' 
  ? '6xfa7wnrsNR3DsK5xHuSGWjYLayFQUiemb8FmnvLBwes'  // 开发环境
  : 'FANSXnVq6k3R9buRNBJ5kP3xFVKHNkgC5yYvZsHgiZ9f'; // 生产环境
const MEME_TOKEN_MINT = 'METAmTMXwdb8gYzyCPfXXFmZZw4rUsXX58PNsDg7zjL';
const USDC_TOKEN_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const RAYDIUM_FANS_USDC_POOL = '2yN5KZa6zJdFo8wbXZjPcUQhptw8yZHVH8Ycr6LnLGJV';
const POOL_ADDRESS = 'YOUR_POOL_ADDRESS';  // 需要替换为实际的存储池地址
const FEE_ADDRESS = 'YOUR_FEE_ADDRESS';    // 需要替换为实际的手续费地址
const FEE_PERCENTAGE = 0.01;               // 1% 手续费
const TOKEN_PROGRAM_ID = 'Gg6F31mmNziJW1s1qpqjKg5akw4N3B3j4XQ2knjV4J5';

// 初始化连接和钱包
let connection = null;
let wallet = null;

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
    // 去掉前缀，解码 bs58 格式
    const privateKey = bs58.decode(privateKeyString);
    
    // 验证私钥长度
    if (privateKey.length !== 64) {
      throw new Error('无效的私钥长度');
    }
    
    // 创建钱包
    wallet = solanaWeb3.Keypair.fromSecretKey(privateKey);
    const walletKey = Array.from(wallet.secretKey);
    
    // 保存钱包
    await chrome.storage.local.set({ walletKey: JSON.stringify(walletKey) });
    
    // 更新显示
    const walletAddressElement = document.getElementById('wallet-address');
    if (walletAddressElement) {
      walletAddressElement.textContent = wallet.publicKey.toString();
      walletAddressElement.classList.remove('empty-wallet');
    }
    
    // 刷新余额
    await refreshBalance();
    
    console.log('私钥已导入');
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
    console.log('开始创建新钱包...');
    const walletAddressElement = document.getElementById('wallet-address');
    
    // 生成新钱包
    wallet = solanaWeb3.Keypair.generate();
    const walletKey = Array.from(wallet.secretKey);
    
    // 保存钱包
    await chrome.storage.local.set({ walletKey: JSON.stringify(walletKey) });
    
    // 显示钱包地址
    const publicKeyString = wallet.publicKey.toString();
    console.log('新钱包已创建:', publicKeyString);
    walletAddressElement.textContent = publicKeyString;
    walletAddressElement.classList.remove('empty-wallet');
    
    // 刷新余额
    await refreshBalance();
    return true;
  } catch (error) {
    console.error('创建新钱包失败:', error);
    showError('创建新钱包失败: ' + error.message);
    return false;
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

// 刷新余额
async function refreshBalance() {
  console.log('==================== 开始刷新余额 ====================');
  try {
    // 确保连接已初始化
    const conn = await initConnection();
    console.log('连接状态:', conn ? '已连接' : '未连接');
    
    // 获取钱包信息
    const walletAddress = wallet ? wallet.publicKey.toString() : null;
    console.log('钱包地址:', walletAddress);
    
    if (!wallet || !conn) {
      throw new Error('钱包未连接');
    }

    // 更新代币价格
    await updateTokenPrices();
    console.log('代币价格:', tokenPrices);

    // 获取 SOL 余额
    const solBalance = await conn.getBalance(wallet.publicKey);
    console.log('SOL 余额 (lamports):', solBalance);
    const solBalanceDisplay = solBalance / solanaWeb3.LAMPORTS_PER_SOL;
    
    // 获取 FANS 代币账户
    const fansTokenAccount = await conn.getTokenAccountsByOwner(wallet.publicKey, {
      mint: new solanaWeb3.PublicKey(FANS_TOKEN_MINT)
    });
    console.log('FANS 代币账户:', fansTokenAccount);
    
    // 更新余额显示
    document.getElementById('sol-balance').textContent = `${solBalanceDisplay.toFixed(4)} SOL`;
    
    if (fansTokenAccount.value.length > 0) {
      const tokenBalance = await conn.getTokenAccountBalance(fansTokenAccount.value[0].pubkey);
      console.log('FANS 代币余额:', tokenBalance);
      document.getElementById('fans-balance').textContent = `${parseFloat(tokenBalance.value.amount) / Math.pow(10, tokenBalance.value.decimals)} FANS`;
    } else {
      console.log('未找到 FANS 代币账户');
      document.getElementById('fans-balance').textContent = '0.00 FANS';
    }
    
  } catch (error) {
    console.error('刷新余额失败:', error);
    document.getElementById('sol-balance').textContent = '获取失败';
    document.getElementById('fans-balance').textContent = '获取失败';
  }
  console.log('==================== 余额刷新结束 ====================\n');
}

// 初始化连接
async function initConnection() {
  try {
    if (!connection) {
      // 使用配置文件中的RPC URL
      const rpcUrl = ENV === 'development' 
        ? 'https://api.devnet.solana.com'
        : 'https://white-empty-shard.solana-mainnet.quiknode.pro/ff813f8ec04d7e6eb1879195a437da9dc36aeeac/';
      
      connection = new solanaWeb3.Connection(rpcUrl);
      console.log('已连接到Solana网络:', rpcUrl);
      console.log('当前环境:', ENV);
    }
    return connection;
  } catch (error) {
    console.error('连接Solana网络失败:', error);
    throw error;
  }
}

// 设置自动刷新
function setupAutoRefresh() {
  // 立即刷新一次
  refreshBalance();
  
  // 每30秒自动刷新一次
  setInterval(() => {
    refreshBalance();
  }, 30000);
}

// 存储池相关函数
async function createStoragePool(totalAmount) {
  try {
    if (!wallet) {
      throw new Error('请先连接钱包');
    }

    // 创建新的存储池账户
    const poolKeypair = solanaWeb3.Keypair.generate();
    const poolAccount = poolKeypair.publicKey;

    // 创建交易
    const transaction = new solanaWeb3.Transaction();

    // 获取用户的代币账户
    const userTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      new solanaWeb3.PublicKey(FANS_TOKEN_MINT),
      wallet.publicKey
    );

    // 获取存储池的代币账户
    const poolTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      new solanaWeb3.PublicKey(FANS_TOKEN_MINT),
      poolAccount
    );

    // 获取手续费账户
    const feeTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      new solanaWeb3.PublicKey(FANS_TOKEN_MINT),
      new solanaWeb3.PublicKey(FEE_ADDRESS)
    );

    // 计算手续费
    const feeAmount = Math.floor(totalAmount * FEE_PERCENTAGE);
    const poolAmount = totalAmount - feeAmount;

    // 添加转账到存储池的指令
    transaction.add(
      createTransferInstruction(
        userTokenAccount.address,
        poolTokenAccount.address,
        wallet.publicKey,
        poolAmount,
        [],
        TOKEN_PROGRAM_ID
      )
    );

    // 添加转账手续费的指令
    transaction.add(
      createTransferInstruction(
        userTokenAccount.address,
        feeTokenAccount.address,
        wallet.publicKey,
        feeAmount,
        [],
        TOKEN_PROGRAM_ID
      )
    );

    // 发送交易
    const signature = await connection.sendTransaction(transaction, [wallet]);
    await connection.confirmTransaction(signature);

    // 返回存储池信息
    return {
      success: true,
      poolAddress: poolAccount.toString(),
      signature,
      poolAmount,
      feeAmount
    };
  } catch (error) {
    console.error('创建存储池失败:', error);
    throw error;
  }
}

// 修改创建赠送函数，添加存储池交互
async function createAirdrop(tweetUrl, totalTokens, numPackages, isRandom, tokensPerPackage, minTokens, maxTokens, requirements) {
  console.log('开始创建代币赠送...');
  console.log('参数:', {
    tweetUrl,
    totalTokens,
    numPackages,
    isRandom,
    tokensPerPackage,
    minTokens,
    maxTokens,
    requirements
  });

  try {
    if (!wallet) {
      console.error('钱包未初始化');
      throw new Error('请先导入钱包');
    }

    if (!tweetUrl) {
      console.error('缺少推文链接');
      throw new Error('请输入推文链接');
    }

    if (totalTokens <= 0) {
      console.error('总代币数量无效:', totalTokens);
      throw new Error('总代币数量必须大于0');
    }

    if (numPackages <= 0) {
      console.error('礼物包数量无效:', numPackages);
      throw new Error('礼物包数量必须大于0');
    }

    console.log('创建存储池...');
    // 创建存储池
    const poolResult = await createStoragePool(totalTokens * 1e9);
    console.log('存储池创建成功:', poolResult);
    
    // 创建赠送记录
    const airdrop = {
      id: generateUniqueId(),
      tweetUrl,
      totalTokens,
      numPackages,
      isRandom,
      tokensPerPackage: isRandom ? { min: minTokens, max: maxTokens } : tokensPerPackage,
      requirements,
      createdAt: new Date().toISOString(),
      status: 'active',
      creator: wallet.publicKey.toString(),
      poolAccount: poolResult.poolAddress,
      remainingPackages: numPackages,
      claimedBy: []
    };
    console.log('赠送记录创建成功:', airdrop);

    // 保存赠送记录
    console.log('保存赠送记录...');
    const { airdrops = [] } = await chrome.storage.local.get('airdrops');
    airdrops.push(airdrop);
    await chrome.storage.local.set({ airdrops });
    console.log('赠送记录已保存');

    // 发送交易
    console.log('发送交易...');
    const transaction = new solanaWeb3.Transaction();
    // TODO: 添加实际的交易指令
    const signature = await connection.sendTransaction(transaction, [wallet]);
    console.log('交易已发送，等待确认...');
    await connection.confirmTransaction(signature);
    console.log('交易确认成功，签名:', signature);

    // 刷新余额
    console.log('刷新余额...');
    await refreshBalance();
    console.log('余额已刷新');

    return { success: true, signature, airdropId: airdrop.id };
  } catch (error) {
    console.error('创建赠送失败:', error);
    throw error;
  }
}

// 导入钱包按钮点击事件
document.addEventListener('DOMContentLoaded', () => {
  // 导入钱包按钮点击事件
  document.getElementById('import-wallet').addEventListener('click', () => {
    const privateKeyInput = document.getElementById('private-key-input');
    privateKeyInput.style.display = 'block';
    document.getElementById('confirm-import').style.display = 'block';
    document.getElementById('cancel-import').style.display = 'block';
    document.getElementById('private-key-display').style.display = 'none';
    privateKeyInput.focus();
  });

  // 取消导入按钮点击事件
  document.getElementById('cancel-import').addEventListener('click', () => {
    const privateKeyInput = document.getElementById('private-key-input');
    privateKeyInput.style.display = 'none';
    document.getElementById('confirm-import').style.display = 'none';
    document.getElementById('cancel-import').style.display = 'none';
    privateKeyInput.value = '';
  });

  // 确认导入按钮点击事件
  document.getElementById('confirm-import').addEventListener('click', async () => {
    try {
      const privateKeyInput = document.getElementById('private-key-input');
      let privateKeyString = privateKeyInput.value.trim();
      if (!privateKeyString) {
        showError('请输入私钥');
        return;
      }

      try {
        // 尝试解码私钥
        const privateKey = bs58.decode(privateKeyString);
        
        // 验证私钥长度
        if (privateKey.length !== 64) {
          throw new Error('私钥长度不正确');
        }
        
        // 创建钱包
        wallet = solanaWeb3.Keypair.fromSecretKey(privateKey);
        const walletKey = Array.from(wallet.secretKey);
        
        // 保存钱包
        await chrome.storage.local.set({ walletKey: JSON.stringify(walletKey) });
        
        // 更新界面显示
        const walletAddressElement = document.getElementById('wallet-address');
        if (walletAddressElement) {
          walletAddressElement.textContent = wallet.publicKey.toString();
          walletAddressElement.classList.remove('empty-wallet');
        }
        
        // 清理输入并隐藏
        privateKeyInput.style.display = 'none';
        document.getElementById('confirm-import').style.display = 'none';
        document.getElementById('cancel-import').style.display = 'none';
        privateKeyInput.value = '';
        
        // 刷新余额
        await refreshBalance();
        
        showSuccess('钱包导入成功');
      } catch (error) {
        console.error('私钥格式错误:', error);
        showError('私钥格式不正确');
        return;
      }
    } catch (error) {
      console.error('导入钱包失败:', error);
      showError('导入失败: ' + error.message);
    }
  });
});

// 导出钱包按钮点击事件
document.getElementById('export-wallet').addEventListener('click', async () => {
  try {
    if (!wallet) {
      throw new Error('钱包未初始化');
    }

    const privateKeyDisplay = document.getElementById('private-key-display');
    
    // 生成私钥字符串
    const privateKey = bs58.encode(wallet.secretKey);
    
    // 显示私钥
    privateKeyDisplay.textContent = privateKey;
    privateKeyDisplay.style.display = 'block';
    
    // 复制到剪贴板
    await navigator.clipboard.writeText(privateKey);
    showSuccess('私钥已复制到剪贴板');
  } catch (error) {
    console.error('导出钱包失败:', error);
    showError('导出失败: ' + error.message);
  }
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

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', async () => {
  console.log('页面加载完成，开始初始化...');
  
  try {
    // 初始化界面状态
    const walletAddressElement = document.getElementById('wallet-address');
    const privateKeyInput = document.getElementById('private-key-input');
    const privateKeyDisplay = document.getElementById('private-key-display');
    const createAirdropButton = document.getElementById('create-airdrop');
    
    if (!walletAddressElement || !privateKeyInput || !privateKeyDisplay) {
      throw new Error('找不到必要的界面元素');
    }
    
    // 设置初始状态
    walletAddressElement.textContent = '正在初始化...';
    walletAddressElement.classList.add('empty-wallet');
    privateKeyInput.style.display = 'none';
    privateKeyDisplay.style.display = 'none';
    
    // 初始化连接
    await initConnection();
    console.log('连接初始化成功');
    
    // 初始化保存的钱包
    await initSavedWallet();
    
    // 代币计算相关
    initializeTokenCalculation();
    
    // 设置自动刷新
    setupAutoRefresh();

    // 添加创建赠送按钮点击事件
    if (createAirdropButton) {
      createAirdropButton.addEventListener('click', async () => {
        try {
          const tweetUrl = document.getElementById('tweet-url').value;
          const totalTokens = parseFloat(document.getElementById('total-tokens').value);
          const numPackages = parseInt(document.getElementById('num-packages').value);
          const distributionType = document.getElementById('distribution-type').value;
          const tokensPerPackage = document.getElementById('token-result').textContent;
          
          // 获取领取要求
          const requirements = {
            follow: document.getElementById('require-follow').checked,
            like: document.getElementById('require-like').checked,
            retweet: document.getElementById('require-retweet').checked,
            comment: document.getElementById('require-comment').checked
          };
          
          // 验证输入
          if (!tweetUrl) throw new Error('请输入推文链接');
          if (!totalTokens || totalTokens <= 0) throw new Error('请输入有效的代币数量');
          if (!numPackages || numPackages <= 0) throw new Error('请输入有效的礼物包数量');
          
          console.log('创建赠送参数:', {
            tweetUrl,
            totalTokens,
            numPackages,
            distributionType,
            tokensPerPackage,
            requirements
          });

          // 调用创建赠送函数
          const result = await createAirdrop(
            tweetUrl,
            totalTokens,
            numPackages,
            distributionType === 'random',
            parseFloat(tokensPerPackage),
            distributionType === 'random' ? parseFloat(document.getElementById('min-tokens').value) : null,
            distributionType === 'random' ? parseFloat(document.getElementById('max-tokens').value) : null,
            requirements
          );

          if (result.success) {
            alert('赠送创建成功！');
            // 清空输入
            document.getElementById('tweet-url').value = '';
            document.getElementById('total-tokens').value = '';
            document.getElementById('num-packages').value = '1';
            document.getElementById('token-result').textContent = '0.0000';
            // 刷新余额
            await refreshBalance();
          }
        } catch (error) {
          console.error('创建赠送失败:', error);
          showError(error.message);
        }
      });
      console.log('创建赠送按钮事件已绑定');
    } else {
      console.error('找不到创建赠送按钮');
    }

  } catch (error) {
    console.error('初始化失败:', error);
    showError('初始化失败：' + error.message);
  }
});

// 格式化 USD 金额
function formatUSD(amount) {
  if (amount === null || amount === undefined) return '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// 格式化代币余额和 USD 价值
function formatTokenBalance(balance, symbol = 'FANS') {
  const formattedBalance = balance.toLocaleString('en-US', {
    minimumFractionDigits: symbol === 'SOL' ? 4 : 2,
    maximumFractionDigits: symbol === 'SOL' ? 4 : 2
  });
  
  const price = tokenPrices[symbol];
  console.log(`${symbol} 价格:`, price); // 调试日志
  
  let usdValue = '';
  if (price !== null && price !== undefined) {
    const usdAmount = balance * price;
    usdValue = ` (${formatUSD(usdAmount)})`;
  }
  
  return `${formattedBalance} ${symbol}${usdValue}`;
}

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

// 创建代币赠送
async function createAirdrop(tweetUrl, totalTokens, numPackages, isRandom, tokensPerPackage, minTokens, maxTokens, requirements) {
  console.log('开始创建代币赠送...');
  console.log('参数:', {
    tweetUrl,
    totalTokens,
    numPackages,
    isRandom,
    tokensPerPackage,
    minTokens,
    maxTokens,
    requirements
  });

  try {
    if (!wallet) {
      console.error('钱包未初始化');
      throw new Error('请先导入钱包');
    }

    if (!tweetUrl) {
      console.error('缺少推文链接');
      throw new Error('请输入推文链接');
    }

    if (totalTokens <= 0) {
      console.error('总代币数量无效:', totalTokens);
      throw new Error('总代币数量必须大于0');
    }

    if (numPackages <= 0) {
      console.error('礼物包数量无效:', numPackages);
      throw new Error('礼物包数量必须大于0');
    }

    console.log('创建存储池...');
    // 创建存储池
    const poolResult = await createStoragePool(totalTokens * 1e9);
    console.log('存储池创建成功:', poolResult);
    
    // 创建赠送记录
    const airdrop = {
      id: generateUniqueId(),
      tweetUrl,
      totalTokens,
      numPackages,
      isRandom,
      tokensPerPackage: isRandom ? { min: minTokens, max: maxTokens } : tokensPerPackage,
      requirements,
      createdAt: new Date().toISOString(),
      status: 'active',
      creator: wallet.publicKey.toString(),
      poolAccount: poolResult.poolAddress,
      remainingPackages: numPackages,
      claimedBy: []
    };
    console.log('赠送记录创建成功:', airdrop);

    // 保存赠送记录
    console.log('保存赠送记录...');
    const { airdrops = [] } = await chrome.storage.local.get('airdrops');
    airdrops.push(airdrop);
    await chrome.storage.local.set({ airdrops });
    console.log('赠送记录已保存');

    // 发送交易
    console.log('发送交易...');
    const transaction = new solanaWeb3.Transaction();
    // TODO: 添加实际的交易指令
    const signature = await connection.sendTransaction(transaction, [wallet]);
    console.log('交易已发送，等待确认...');
    await connection.confirmTransaction(signature);
    console.log('交易确认成功，签名:', signature);

    // 刷新余额
    console.log('刷新余额...');
    await refreshBalance();
    console.log('余额已刷新');

    return { success: true, signature, airdropId: airdrop.id };
  } catch (error) {
    console.error('创建赠送失败:', error);
    throw error;
  }
}

// 生成唯一ID
function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
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

import { getOrCreateAssociatedTokenAccount } from '@solana/spl_token';

// 定义 showError 函数
window.showError = function(message) {
  console.error(message);
  const statusMessage = document.getElementById('status-message');
  if (statusMessage) {
    statusMessage.textContent = message;
    statusMessage.className = 'status-message error';
    setTimeout(() => {
      statusMessage.className = 'status-message';
    }, 3000);
  }
};

window.createAirdrop = async function(tweetUrl, totalTokens, numPackages, isRandom, tokensPerPackage, minTokens, maxTokens, requirements) {
  console.log('开始创建代币赠送...');
  console.log('参数:', {
    tweetUrl,
    totalTokens,
    numPackages,
    isRandom,
    tokensPerPackage,
    minTokens,
    maxTokens,
    requirements
  });

  try {
    if (!wallet) {
      console.error('钱包未初始化');
      throw new Error('请先导入钱包');
    }

    if (!tweetUrl) {
      console.error('缺少推文链接');
      throw new Error('请输入推文链接');
    }

    if (totalTokens <= 0) {
      console.error('总代币数量无效:', totalTokens);
      throw new Error('总代币数量必须大于0');
    }

    if (numPackages <= 0) {
      console.error('礼物包数量无效:', numPackages);
      throw new Error('礼物包数量必须大于0');
    }

    console.log('创建存储池...');
    // 创建存储池
    const poolResult = await createStoragePool(totalTokens * 1e9);
    console.log('存储池创建成功:', poolResult);
    
    // 创建赠送记录
    const airdrop = {
      id: generateUniqueId(),
      tweetUrl,
      totalTokens,
      numPackages,
      isRandom,
      tokensPerPackage: isRandom ? { min: minTokens, max: maxTokens } : tokensPerPackage,
      requirements,
      createdAt: new Date().toISOString(),
      status: 'active',
      creator: wallet.publicKey.toString(),
      poolAccount: poolResult.poolAddress,
      remainingPackages: numPackages,
      claimedBy: []
    };
    console.log('赠送记录创建成功:', airdrop);

    // 保存赠送记录
    console.log('保存赠送记录...');
    const { airdrops = [] } = await chrome.storage.local.get('airdrops');
    airdrops.push(airdrop);
    await chrome.storage.local.set({ airdrops });
    console.log('赠送记录已保存');

    // 发送交易
    console.log('发送交易...');
    const transaction = new solanaWeb3.Transaction();
    // TODO: 添加实际的交易指令
    const signature = await connection.sendTransaction(transaction, [wallet]);
    console.log('交易已发送，等待确认...');
    await connection.confirmTransaction(signature);
    console.log('交易确认成功，签名:', signature);

    // 刷新余额
    console.log('刷新余额...');
    await refreshBalance();
    console.log('余额已刷新');

    return { success: true, signature, airdropId: airdrop.id };
  } catch (error) {
    console.error('创建赠送失败:', error);
    throw error;
  }
};