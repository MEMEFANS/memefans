// 开始加载 solana-init.js

// 检查全局变量
function checkGlobalVariables() {
  console.log('检查 solanaWeb3:', typeof window.solanaWeb3);
  console.log('检查 Buffer:', typeof window.Buffer);
  
  // 检查 solanaWeb3
  if (typeof window.solanaWeb3 === 'undefined') {
    console.error('solanaWeb3 未定义');
    return false;
  }
  
  // 检查 Buffer
  if (typeof window.Buffer === 'undefined') {
    console.error('Buffer 未定义');
    return false;
  }
  
  return true;
}

// 创建 Solana 连接
function createConnection() {
  try {
    console.log('创建 Solana 连接...');
    const conn = new window.solanaWeb3.Connection(
      'https://api.devnet.solana.com',
      {
        commitment: 'confirmed',
        wsEndpoint: 'wss://api.devnet.solana.com/',
        confirmTransactionInitialTimeout: 60000
      }
    );
    console.log('Solana 连接创建成功');
    return conn;
  } catch (error) {
    console.error('创建 Solana 连接失败:', error);
    throw error;
  }
}

// 测试连接
async function testConnection(connection, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`尝试测试连接 (${i + 1}/${maxRetries})...`);
      const version = await connection.getVersion();
      console.log('Solana 版本信息:', version);
      
      // 测试获取最新区块
      const slot = await connection.getSlot();
      console.log('当前区块:', slot);
      
      return true;
    } catch (error) {
      console.error(`连接测试失败 (尝试 ${i + 1}/${maxRetries}):`, error);
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return false;
}

// 初始化 Solana 连接
async function initializeSolana() {
  try {
    console.log('开始初始化 Solana 连接...');
    
    // 创建连接
    const connection = createConnection();
    
    // 测试连接
    await testConnection(connection);
    
    // 设置全局连接对象
    window.connection = connection;
    
    // 初始化常量
    window.TOKEN_PROGRAM_ID = new window.solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    window.ASSOCIATED_TOKEN_PROGRAM_ID = new window.solanaWeb3.PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
    window.FANS_TOKEN_MINT = new window.solanaWeb3.PublicKey('6xfa7wnrsNR3DsK5xHuSGWjYLayFQUiemb8FmnvLBwes');
    
    console.log('常量初始化完成');
    console.log('TOKEN_PROGRAM_ID:', window.TOKEN_PROGRAM_ID.toString());
    console.log('ASSOCIATED_TOKEN_PROGRAM_ID:', window.ASSOCIATED_TOKEN_PROGRAM_ID.toString());
    console.log('FANS_TOKEN_MINT:', window.FANS_TOKEN_MINT.toString());
    
    // 发出初始化完成事件
    window.dispatchEvent(new Event('solana-initialized'));
    console.log('Solana 初始化完成');
    
    return true;
  } catch (error) {
    console.error('Solana 初始化失败:', error);
    window.dispatchEvent(new CustomEvent('solana-init-failed', { detail: error }));
    throw error;
  }
}

// 等待依赖加载
function waitForDependencies(maxAttempts = 50) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const check = () => {
      attempts++;
      console.log(`检查依赖项 (${attempts}/${maxAttempts})...`);
      
      if (checkGlobalVariables()) {
        console.log('所有依赖项已加载');
        resolve();
      } else if (attempts >= maxAttempts) {
        reject(new Error('等待依赖项超时'));
      } else {
        setTimeout(check, 100);
      }
    };
    
    check();
  });
}

// 主初始化函数
async function initialize() {
  try {
    console.log('开始初始化过程...');
    await waitForDependencies();
    await initializeSolana();
    return true;
  } catch (error) {
    console.error('初始化失败:', error);
    window.dispatchEvent(new CustomEvent('solana-init-failed', { detail: error }));
    throw error;
  }
}

// 开始初始化
initialize().catch(error => {
  console.error('初始化过程中发生错误:', error);
});
