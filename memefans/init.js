// 刷新余额
async function refreshBalance() {
  try {
    console.log('开始刷新余额...');
    // 获取钱包
    const result = await chrome.storage.local.get(['walletKey']);
    console.log('获取到的钱包数据:', result);
    
    if (!result.walletKey) {
      console.error('未找到钱包');
      return;
    }

    // 导入钱包
    let secretKey;
    try {
      if (typeof result.walletKey === 'string') {
        secretKey = Uint8Array.from(JSON.parse(result.walletKey));
      } else if (Array.isArray(result.walletKey)) {
        secretKey = Uint8Array.from(result.walletKey);
      } else {
        throw new Error('无效的钱包数据格式');
      }
    } catch (error) {
      console.error('处理钱包数据失败:', error);
      return;
    }

    const wallet = solanaWeb3.Keypair.fromSecretKey(secretKey);
    console.log('钱包地址:', wallet.publicKey.toString());

    // 显示钱包地址
    document.getElementById('wallet-address').textContent = wallet.publicKey.toString();

    // 获取 SOL 余额
    const solBalance = await window.connection.getBalance(wallet.publicKey);
    const solBalanceDisplay = solBalance / solanaWeb3.LAMPORTS_PER_SOL;
    console.log('SOL 余额:', solBalanceDisplay);
    document.getElementById('sol-balance').textContent = `${solBalanceDisplay.toFixed(4)} SOL`;

    // 获取 FANS 代币余额
    const FANS_TOKEN_MINT = '6xfa7wnrsNR3DsK5xHuSGWjYLayFQUiemb8FmnvLBwes';
    const fansTokenAccount = await window.connection.getTokenAccountsByOwner(wallet.publicKey, {
      mint: new solanaWeb3.PublicKey(FANS_TOKEN_MINT),
      programId: solanaWeb3.TOKEN_PROGRAM_ID
    });

    if (fansTokenAccount.value.length > 0) {
      const tokenBalance = await window.connection.getTokenAccountBalance(fansTokenAccount.value[0].pubkey);
      const fansBalance = parseFloat(tokenBalance.value.amount) / Math.pow(10, tokenBalance.value.decimals);
      console.log('FANS 余额:', fansBalance);
      document.getElementById('fans-balance').textContent = `${fansBalance.toLocaleString()} FANS`;
    } else {
      console.log('未找到 FANS 代币账户');
      document.getElementById('fans-balance').textContent = '0.00 FANS';
    }

  } catch (error) {
    console.error('刷新余额失败:', error);
    console.error('错误堆栈:', error.stack);
  }
}

// 初始化页面
function initializePage() {
  console.log('开始初始化页面...');
  
  // 获取钱包信息
  chrome.storage.local.get(['walletKey'], function(result) {
    console.log('获取到的存储钱包信息:', result);
    
    if (result.walletKey) {
      try {
        let secretKey;
        if (typeof result.walletKey === 'string') {
          secretKey = Uint8Array.from(JSON.parse(result.walletKey));
        } else if (Array.isArray(result.walletKey)) {
          secretKey = Uint8Array.from(result.walletKey);
        } else {
          throw new Error('无效的钱包数据格式');
        }

        const wallet = solanaWeb3.Keypair.fromSecretKey(secretKey);
        console.log('已生成钱包:', wallet.publicKey.toString());
        
        // 保存钱包到 window 对象
        window.wallet = wallet;
        window.connection = new solanaWeb3.Connection('https://api.devnet.solana.com', 'confirmed');
        
        // 显示钱包地址
        document.getElementById('wallet-address').textContent = wallet.publicKey.toString();
        console.log('已更新钱包地址显示:', wallet.publicKey.toString());
        
        // 刷新余额
        refreshBalance();
      } catch (error) {
        console.error('处理钱包数据时出错:', error);
      }
    } else {
      console.log('未找到已保存的钱包信息');
    }
  });

  // 绑定导入钱包按钮事件
  const importButton = document.getElementById('import-wallet');
  if (importButton) {
    importButton.addEventListener('click', async function() {
      const privateKey = document.getElementById('private-key-input').value;
      if (!privateKey) {
        alert('请输入私钥');
        return;
      }

      try {
        console.log('开始导入钱包...');
        const secretKey = bs58.decode(privateKey);
        const wallet = solanaWeb3.Keypair.fromSecretKey(secretKey);
        console.log('已生成钱包:', wallet.publicKey.toString());
        
        // 保存钱包信息
        await chrome.storage.local.set({ walletKey: Array.from(secretKey) });
        console.log('已保存钱包信息');
        
        // 保存钱包到 window 对象
        window.wallet = wallet;
        window.connection = new solanaWeb3.Connection('https://api.devnet.solana.com', 'confirmed');
        
        // 显示钱包地址
        document.getElementById('wallet-address').textContent = wallet.publicKey.toString();
        console.log('已更新显示的钱包地址');
        
        // 刷新余额
        refreshBalance();
        
        // 清空输入
        document.getElementById('private-key-input').value = '';
        
      } catch (error) {
        console.error('导入钱包失败:', error);
        alert('导入钱包失败，请检查私钥是否正确');
      }
    });
  }
}

// 绑定事件
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM加载完成，开始初始化...');
  initializePage();
});
