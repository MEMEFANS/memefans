// 等待 Solana 初始化完成
function waitForSolanaInit() {
  return new Promise((resolve, reject) => {
    if (window.connection) {
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      reject(new Error('等待 Solana 初始化超时'));
    }, 10000); // 10 秒超时

    window.addEventListener('solana-initialized', () => {
      clearTimeout(timeout);
      resolve();
    });

    window.addEventListener('solana-init-failed', (event) => {
      clearTimeout(timeout);
      reject(event.detail);
    });
  });
}

// 初始化钱包
async function initializeWallet() {
  try {
    console.log('开始初始化钱包...');
    const result = await chrome.storage.local.get(['walletKey']);
    if (result.walletKey) {
      console.log('找到钱包密钥');
      const secretKey = Uint8Array.from(Array.isArray(result.walletKey) ? result.walletKey : JSON.parse(result.walletKey));
      const wallet = window.solanaWeb3.Keypair.fromSecretKey(secretKey);
      window.publicKey = wallet.publicKey;
      const address = wallet.publicKey.toString();
      console.log('钱包地址:', address);
      document.getElementById('wallet-address').textContent = address;
      return true;
    } else {
      console.log('未找到钱包');
      document.getElementById('wallet-address').textContent = '请先创建或导入钱包';
      return false;
    }
  } catch (error) {
    console.error('初始化钱包失败:', error);
    return false;
  }
}

// 刷新 SOL 余额
async function refreshSolBalance() {
  try {
    if (!window.publicKey) {
      console.log('未找到钱包地址');
      return;
    }

    if (!window.connection) {
      console.error('Solana 连接未初始化');
      return;
    }

    console.log('开始获取 SOL 余额...');
    console.log('钱包地址:', window.publicKey.toString());
    console.log('使用的网络:', window.connection._rpcEndpoint);

    // 获取 SOL 余额
    const balance = await window.connection.getBalance(window.publicKey);
    console.log('原始 SOL 余额 (lamports):', balance);
    
    const solBalance = balance / window.solanaWeb3.LAMPORTS_PER_SOL;
    console.log('转换后的 SOL 余额:', solBalance);
    
    document.getElementById('sol-balance').textContent = solBalance.toFixed(4) + ' SOL';
  } catch (error) {
    console.error('获取 SOL 余额失败:', error);
    document.getElementById('sol-balance').textContent = '获取失败';
  }
}

// 刷新 FANS 代币余额
async function refreshFansBalance() {
  try {
    if (!window.publicKey || !window.FANS_TOKEN_MINT) {
      console.log('未找到钱包地址或代币 Mint 地址');
      return;
    }

    console.log('开始获取 FANS 余额...');
    console.log('钱包地址:', window.publicKey.toString());
    console.log('FANS Token Mint:', window.FANS_TOKEN_MINT.toString());

    // 获取代币账户
    const accounts = await window.connection.getParsedTokenAccountsByOwner(
      window.publicKey,
      { mint: window.FANS_TOKEN_MINT }
    );
    console.log('找到的代币账户:', accounts);

    if (accounts.value.length > 0) {
      // 获取代币余额
      const accountInfo = await window.connection.getTokenAccountBalance(accounts.value[0].pubkey);
      console.log('代币账户信息:', accountInfo);
      
      const fansBalance = accountInfo.value.uiAmount;
      console.log('FANS 余额:', fansBalance);
      
      document.getElementById('fans-balance').textContent = fansBalance.toFixed(2) + ' FANS';
      document.getElementById('accumulated-balance').textContent = fansBalance.toFixed(2) + ' FANS';
    } else {
      console.log('未找到 FANS 代币账户，可能需要创建');
      document.getElementById('fans-balance').textContent = '0.00 FANS';
      document.getElementById('accumulated-balance').textContent = '0.00 FANS';
    }
  } catch (error) {
    console.error('获取 FANS 余额失败:', error);
    document.getElementById('fans-balance').textContent = '获取失败';
    document.getElementById('accumulated-balance').textContent = '获取失败';
  }
}

// 刷新所有余额
async function refreshAllBalances() {
  await refreshSolBalance();
  await refreshFansBalance();
}

// 监听 Solana 初始化完成事件
window.addEventListener('solana-initialized', async () => {
  try {
    console.log('Solana 初始化完成，开始初始化钱包');
    // 初始化钱包
    const hasWallet = await initializeWallet();
    if (hasWallet) {
      console.log('钱包初始化成功，开始获取余额');
      // 初始刷新余额
      await refreshAllBalances();
      // 每 30 秒刷新一次余额
      setInterval(refreshAllBalances, 30000);
    }
  } catch (error) {
    console.error('钱包初始化或余额刷新失败:', error);
  }
});

// 开始初始化页面
async function initializePage() {
  try {
  } catch (error) {
    console.error('初始化页面失败:', error);
  }
}

// 开始初始化页面
initializePage();
