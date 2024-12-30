// 常量定义
const QUICKNODE_RPC_URL = 'https://special-fluent-dust.solana-mainnet.quiknode.pro/6e0fc13eb7512bc5c4ed3c311e778ac9739c0025';
const FANS_TOKEN_MINT = 'EViQB8r2we14B4sA6jEg5Ujb85WepzKUcf7YwGeGpump';
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
  try {
    if (!wallet || !connection) {
      console.error(' 钱包或连接未初始化');
      return;
    }

    console.log('==================== 余额刷新开始 ====================');
    
    // 获取 UI 元素
    const solBalanceElement = document.getElementById('sol-balance');
    const fansBalanceElement = document.getElementById('fans-balance');
    const accumulatedBalanceElement = document.getElementById('accumulated-balance');
    
    if (!solBalanceElement || !fansBalanceElement || !accumulatedBalanceElement) {
      console.error(' 找不到余额显示元素');
      return;
    }

    // 先更新代币价格
    await updateTokenPrices();

    // 获取 SOL 余额
    const balance = await connection.getBalance(wallet.publicKey);
    const solBalance = balance / solanaWeb3.LAMPORTS_PER_SOL;
    
    // 计算 SOL 的 USD 价值
    const solUsdValue = solBalance * tokenPrices.SOL;
    console.log(' SOL 余额计算:');
    console.log('   原始余额:', balance);
    console.log('   SOL 余额:', solBalance);
    console.log('   SOL 价格:', tokenPrices.SOL);
    console.log('   USD 价值:', solUsdValue);
    
    // 更新 SOL 余额显示
    solBalanceElement.textContent = `${solBalance.toFixed(4)} SOL ($${solUsdValue.toFixed(2)})`;

    // 获取 FANS 代币余额
    try {
      const mintPubkey = new solanaWeb3.PublicKey(FANS_TOKEN_MINT);
      const tokenAccounts = await connection.getTokenAccountsByOwner(
        wallet.publicKey,
        { mint: mintPubkey }
      );
      
      let tokenBalance = 0;
      if (tokenAccounts.value.length > 0) {
        const tokenAccount = tokenAccounts.value[0];
        const tokenBalanceResponse = await connection.getTokenAccountBalance(
          tokenAccount.pubkey
        );
        
        if (tokenBalanceResponse.value.uiAmountString) {
          tokenBalance = parseFloat(tokenBalanceResponse.value.uiAmountString);
          
          // 计算 FANS 的 USD 价值
          const fansUsdValue = tokenBalance * tokenPrices.FANS;
          console.log(' FANS 余额计算:');
          console.log('   代币余额:', tokenBalance);
          console.log('   FANS 价格:', tokenPrices.FANS);
          console.log('   USD 价值:', fansUsdValue);
          
          // 更新 FANS 余额显示
          fansBalanceElement.textContent = `${tokenBalance.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })} FANS ($${fansUsdValue.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })})`;
        }
      }
      
      // 获取待提现金额
      const { pendingAmount } = await BalanceManager.getUserBalance();
      const pendingUsdValue = pendingAmount * tokenPrices.FANS;
      console.log(' 待提现金额计算:');
      console.log('   待提现数量:', pendingAmount);
      console.log('   FANS 价格:', tokenPrices.FANS);
      console.log('   USD 价值:', pendingUsdValue);
      
      // 更新待提现金额显示
      accumulatedBalanceElement.textContent = `${pendingAmount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })} FANS ($${pendingUsdValue.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })})`;
      
    } catch (error) {
      console.error(' 获取FANS余额失败:', error);
      fansBalanceElement.textContent = '获取失败';
      accumulatedBalanceElement.textContent = '获取失败';
    }

    console.log('==================== 余额刷新结束 ====================\n');
    showSuccess('余额已更新');
  } catch (error) {
    console.error(' 刷新余额失败:', error);
    showError('刷新余额失败：' + error.message);
  }
}

// 初始化连接
async function initConnection() {
  try {
    if (!connection) {
      console.log('正在初始化连接...');
      connection = new solanaWeb3.Connection(QUICKNODE_RPC_URL);
      console.log('连接初始化成功');
    }
  } catch (error) {
    console.error('初始化连接失败:', error);
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
  try {
    if (!wallet) {
      throw new Error('请先连接钱包');
    }

    if (!tweetUrl) {
      throw new Error('请输入推文链接');
    }

    if (totalTokens <= 0) {
      throw new Error('总代币数量必须大于0');
    }

    if (numPackages <= 0) {
      throw new Error('礼物包数量必须大于0');
    }

    // 创建存储池
    const poolResult = await createStoragePool(totalTokens * 1e9);
    
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

    // 保存赠送记录
    const { airdrops = [] } = await chrome.storage.local.get('airdrops');
    airdrops.push(airdrop);
    await chrome.storage.local.set({ airdrops });

    // 发送交易
    const signature = await connection.sendTransaction(new solanaWeb3.Transaction(), [wallet]);
    await connection.confirmTransaction(signature);
    console.log('赠送创建成功，交易签名:', signature);

    // 刷新余额
    await refreshBalance();

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
document.addEventListener('DOMContentLoaded', () => {
  const totalTokensInput = document.getElementById('total-tokens');
  const numPackagesInput = document.getElementById('num-packages');
  const tokensPerPackageInput = document.getElementById('tokens-per-package');
  const distributionTypeSelect = document.getElementById('distribution-type');
  const fixedAmountDiv = document.getElementById('fixed-amount');
  const randomRangeDiv = document.getElementById('random-range');
  const minTokensInput = document.getElementById('min-tokens');
  const maxTokensInput = document.getElementById('max-tokens');

  // 监听分发类型的变化
  distributionTypeSelect.addEventListener('change', () => {
    const isRandom = distributionTypeSelect.value === 'random';
    fixedAmountDiv.style.display = isRandom ? 'none' : 'block';
    randomRangeDiv.style.display = isRandom ? 'block' : 'none';
    
    if (!isRandom) {
      // 切换到固定数量时，重新计算每个包的数量
      updateTokensPerPackage();
    } else {
      // 切换到随机数量时，设置默认的最小最大值
      const avgTokens = parseFloat(tokensPerPackageInput.value) || 0;
      if (avgTokens > 0) {
        minTokensInput.value = (avgTokens * 0.5).toFixed(4);
        maxTokensInput.value = (avgTokens * 1.5).toFixed(4);
      }
    }
  });

  // 监听总代币数量和礼物包数量的变化
  function updateTokensPerPackage() {
    const totalTokens = parseFloat(totalTokensInput.value) || 0;
    const numPackages = parseInt(numPackagesInput.value) || 1;
    
    if (totalTokens > 0 && numPackages > 0) {
      // 计算每个礼物包的代币数量（保留4位小数）
      const tokensPerPackage = (totalTokens / numPackages).toFixed(4);
      tokensPerPackageInput.value = tokensPerPackage;

      // 如果是随机模式，也更新最小最大值
      if (distributionTypeSelect.value === 'random') {
        minTokensInput.value = (tokensPerPackage * 0.5).toFixed(4);
        maxTokensInput.value = (tokensPerPackage * 1.5).toFixed(4);
      }
    }
  }

  // 添加输入事件监听器
  totalTokensInput.addEventListener('input', updateTokensPerPackage);
  numPackagesInput.addEventListener('input', updateTokensPerPackage);

  // 监听最小最大值的变化
  minTokensInput.addEventListener('input', () => {
    const min = parseFloat(minTokensInput.value) || 0;
    const max = parseFloat(maxTokensInput.value) || 0;
    if (min > max && max > 0) {
      minTokensInput.value = max;
    }
  });

  maxTokensInput.addEventListener('input', () => {
    const min = parseFloat(minTokensInput.value) || 0;
    const max = parseFloat(maxTokensInput.value) || 0;
    if (max < min && min > 0) {
      maxTokensInput.value = min;
    }
  });
});

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', async () => {
  console.log('页面加载完成，开始初始化...');
  
  try {
    // 初始化界面状态
    const walletAddressElement = document.getElementById('wallet-address');
    const privateKeyInput = document.getElementById('private-key-input');
    const privateKeyDisplay = document.getElementById('private-key-display');
    
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
    
    // 设置自动刷新
    setupAutoRefresh();

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
  try {
    if (!wallet) {
      throw new Error('请先导入钱包');
    }

    if (!tweetUrl) {
      throw new Error('请输入推文链接');
    }

    if (totalTokens <= 0) {
      throw new Error('总代币数量必须大于0');
    }

    if (numPackages <= 0) {
      throw new Error('礼物包数量必须大于0');
    }

    // 创建存储池
    const poolResult = await createStoragePool(totalTokens * 1e9);
    
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

    // 保存赠送记录
    const { airdrops = [] } = await chrome.storage.local.get('airdrops');
    airdrops.push(airdrop);
    await chrome.storage.local.set({ airdrops });

    // 发送交易
    const signature = await connection.sendTransaction(new solanaWeb3.Transaction(), [wallet]);
    await connection.confirmTransaction(signature);
    console.log('赠送创建成功，交易签名:', signature);

    // 刷新余额
    await refreshBalance();

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

// 创建赠送按钮点击事件
document.getElementById('create-airdrop').addEventListener('click', async () => {
  try {
    const tweetUrl = document.getElementById('tweet-url').value.trim();
    const totalTokens = parseFloat(document.getElementById('total-tokens').value);
    const numPackages = parseInt(document.getElementById('num-packages').value);
    const isRandom = document.getElementById('distribution-type').value === 'random';
    
    let tokensPerPackage = 0;
    let minTokens = 0;
    let maxTokens = 0;
    
    if (isRandom) {
      minTokens = parseFloat(document.getElementById('min-tokens').value);
      maxTokens = parseFloat(document.getElementById('max-tokens').value);
    } else {
      tokensPerPackage = parseFloat(document.getElementById('tokens-per-package').value);
    }

    // 收集领取要求
    const requirements = {
      follow: document.getElementById('require-follow').checked,
      like: document.getElementById('require-like').checked,
      retweet: document.getElementById('require-retweet').checked,
      comment: document.getElementById('require-comment').checked
    };

    // 创建赠送
    await createAirdrop(
      tweetUrl,
      totalTokens,
      numPackages,
      isRandom,
      tokensPerPackage,
      minTokens,
      maxTokens,
      requirements
    );

    showSuccess('赠送创建成功');
    
    // 清空输入
    document.getElementById('tweet-url').value = '';
    document.getElementById('total-tokens').value = '';
    document.getElementById('num-packages').value = '1';
    document.getElementById('tokens-per-package').value = '';
    document.getElementById('min-tokens').value = '';
    document.getElementById('max-tokens').value = '';
    
  } catch (error) {
    console.error('创建赠送失败:', error);
    showError(error.message);
  }
});