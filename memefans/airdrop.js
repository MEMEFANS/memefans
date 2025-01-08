// 显示错误信息
function showError(message, isSuccess = false) {
  console.log(isSuccess ? message : 'Error: ' + message);
  const statusMessage = document.getElementById('status-message');
  if (statusMessage) {
    statusMessage.textContent = message;
    statusMessage.className = 'status-message ' + (isSuccess ? 'success' : 'error');
    setTimeout(() => {
      statusMessage.className = 'status-message';
    }, 3000);
  }
}

// 生成唯一ID
function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 检查钱包是否已连接
async function checkWalletConnection() {
  try {
    // 检查钱包是否已连接
    if (!window.wallet?.publicKey) {
      showError('请先导入钱包');
      throw new Error('钱包未连接');
    }
    return window.wallet.publicKey;
  } catch (err) {
    showError('请先导入钱包');
    throw new Error('钱包未连接');
  }
}

// 签名交易
async function signTransaction(transaction) {
  try {
    if (!window.wallet?.publicKey) {
      showError('请先导入钱包');
      throw new Error('钱包未连接');
    }

    // 使用内置钱包签名
    const signedTx = await window.wallet.signTransaction(transaction);
    return signedTx;
  } catch (err) {
    showError('签名失败: ' + err.message);
    throw err;
  }
}

// 创建存储池
async function createStoragePool(totalAmount) {
  try {
    // 使用测试网部署的程序地址
    const PROGRAM_ID = '2GGiVEZcSpRRKx4CCCr12HXEsnfdY96u6GNjEAnqougx'; // 测试网程序地址
    const programId = new window.solanaWeb3.PublicKey(PROGRAM_ID);
    
    // 使用当前用户的公钥和时间戳作为种子
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const [poolAddress] = await window.solanaWeb3.PublicKey.findProgramAddress(
      [
        new TextEncoder().encode('giveaway'),
        window.publicKey.toBytes(),
        new TextEncoder().encode(timestamp)
      ],
      programId
    );
    
    console.log('创建存储池:', {
      programId: PROGRAM_ID,
      poolAddress: poolAddress.toString(),
      timestamp
    });

    return {
      poolAddress: poolAddress.toString(),
      amount: totalAmount,
      programId: PROGRAM_ID,
      timestamp,
      programTokenAccount: 'programTokenAccount' // 新增 programTokenAccount 字段
    };
  } catch (error) {
    console.error('创建存储池失败:', error);
    throw new Error('创建存储池失败: ' + error.message);
  }
}

// 初始化 BN
const BN = window.BN;

// 初始化 SPL Token
const splToken = window.splToken;

// 从推文URL中提取推文ID
function getTweetIdFromUrl(url) {
  try {
    console.log('解析推文URL:', url);
    const tweetUrl = new URL(url);
    const pathParts = tweetUrl.pathname.split('/');
    const statusIndex = pathParts.indexOf('status');
    if (statusIndex === -1 || statusIndex + 1 >= pathParts.length) {
      console.error('无效的推文URL格式');
      return null;
    }
    const tweetId = pathParts[statusIndex + 1];
    console.log('提取到推文ID:', tweetId);
    return tweetId;
  } catch (error) {
    console.error('解析推文URL失败:', error);
    return null;
  }
}

// 创建代币赠送
async function createAirdrop(tweetUrl, totalTokens, numPackages, isRandom, tokensPerPackage, minTokens, maxTokens, requirements) {
  try {
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

    // 检查钱包是否已连接
    if (!window.wallet) {
      console.error('钱包未初始化');
      throw new Error('请先导入钱包');
    }

    // 从URL中提取推文ID
    const tweetId = getTweetIdFromUrl(tweetUrl);
    if (!tweetId) {
      console.error('无效的推文链接');
      throw new Error('请输入有效的推文链接');
    }

    // 计算每个用户的代币数量
    const amountPerUser = isRandom ? maxTokens : tokensPerPackage;
    const maxUsers = numPackages;

    // 调用合约创建赠送
    console.log('调用合约创建赠送...');
    const result = await window.contract.createGiveaway(
      window.wallet,
      tweetId,
      new window.BN(amountPerUser),
      new window.BN(maxUsers)
    );

    if (!result.success) {
      console.error('合约调用失败:', result.error);
      throw new Error(result.error || '创建赠送失败');
    }

    // 保存赠送记录
    console.log('保存赠送记录...');
    const airdrop = {
      id: result.giveawayPda,
      tweetId,
      tweetUrl,
      totalTokens,
      numPackages,
      isRandom,
      tokensPerPackage: isRandom ? { min: minTokens, max: maxTokens } : tokensPerPackage,
      requirements,
      createdAt: new Date().toISOString(),
      status: 'active',
      creator: window.wallet.publicKey.toString(),
      signature: result.signature,
      remainingPackages: numPackages,
      claimedBy: []
    };

    const { airdrops = [] } = await chrome.storage.local.get('airdrops');
    airdrops.push(airdrop);
    await chrome.storage.local.set({ airdrops });
    console.log('赠送记录已保存');

    // 刷新余额
    console.log('刷新余额...');
    await refreshBalance();
    console.log('余额已刷新');

    return { success: true, signature: result.signature, airdropId: airdrop.id };
  } catch (error) {
    console.error('创建赠送失败:', error);
    throw error;
  }
}

// 刷新余额
async function refreshBalance() {
  console.log('刷新余额...');
  // TODO: 实现实际的余额刷新逻辑
  console.log('余额已刷新');
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  console.log('初始化赠送功能...');
  
  // 获取创建赠送按钮
  const createButton = document.getElementById('create-airdrop');
  console.log('创建赠送按钮元素:', createButton);
  
  if (createButton) {
    console.log('为创建赠送按钮添加点击事件...');
    createButton.addEventListener('click', async () => {
      console.log('创建赠送按钮被点击！');
      try {
        const tweetUrl = document.getElementById('tweet-url').value;
        const totalTokens = parseFloat(document.getElementById('total-tokens').value);
        const numPackages = parseInt(document.getElementById('num-packages').value);
        const distributionType = document.getElementById('distribution-type').value;
        const isRandom = distributionType === 'random';
        const tokensPerPackage = totalTokens / numPackages;
        const minTokens = parseFloat(document.getElementById('min-tokens').value || '0');
        const maxTokens = parseFloat(document.getElementById('max-tokens').value || tokensPerPackage.toString());
        const requirements = {
          follow: document.getElementById('require-follow').checked,
          like: document.getElementById('require-like').checked,
          retweet: document.getElementById('require-retweet').checked,
          comment: document.getElementById('require-comment').checked
        };

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

        if (result.success) {
          showError('赠送创建成功！', true);
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
    console.log('创建赠送按钮事件绑定完成');
  } else {
    console.error('找不到创建赠送按钮');
  }
});
