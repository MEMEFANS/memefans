// 显示错误信息
function showError(message) {
  console.error(message);
  const statusMessage = document.getElementById('status-message');
  if (statusMessage) {
    statusMessage.textContent = message;
    statusMessage.className = 'status-message error';
    setTimeout(() => {
      statusMessage.className = 'status-message';
    }, 3000);
  }
}

// 生成唯一ID
function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 创建存储池
async function createStoragePool(totalAmount) {
  // 模拟创建存储池的过程
  return {
    poolAddress: 'simulated_pool_' + generateUniqueId(),
    amount: totalAmount
  };
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
    if (!window.wallet) {
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
      creator: window.wallet.publicKey.toString(),
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
    const signature = await window.connection.sendTransaction(transaction, [window.wallet]);
    console.log('交易已发送，等待确认...');
    await window.connection.confirmTransaction(signature);
    console.log('交易确认成功，签名:', signature);

    // 刷新余额
    console.log('刷新余额...');
    if (typeof window.refreshBalance === 'function') {
      await window.refreshBalance();
      console.log('余额已刷新');
    } else {
      console.warn('refreshBalance 函数不可用');
    }

    return { success: true, signature, airdropId: airdrop.id };
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
  const createAirdropButton = document.getElementById('create-airdrop');
  console.log('创建赠送按钮元素:', createAirdropButton);
  
  if (createAirdropButton) {
    console.log('为创建赠送按钮添加点击事件...');
    createAirdropButton.addEventListener('click', async () => {
      console.log('创建赠送按钮被点击！');
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
        
        console.log('收集到的表单数据:', {
          tweetUrl,
          totalTokens,
          numPackages,
          distributionType,
          tokensPerPackage,
          requirements
        });
        
        // 验证输入
        if (!tweetUrl) throw new Error('请输入推文链接');
        if (!totalTokens || totalTokens <= 0) throw new Error('请输入有效的代币数量');
        if (!numPackages || numPackages <= 0) throw new Error('请输入有效的礼物包数量');
        
        console.log('开始调用 createAirdrop 函数...');
        
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
        
        console.log('createAirdrop 函数返回结果:', result);
        
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
    console.log('创建赠送按钮事件绑定完成');
  } else {
    console.error('找不到创建赠送按钮');
  }
});
