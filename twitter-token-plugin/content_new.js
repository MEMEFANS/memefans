// 存储总计代币数量和已领取状态
let totalTokens = 0;
let claimedTweetsCache = {};

// 从Chrome存储中加载状态
async function loadState() {
  try {
    const result = await chrome.storage.local.get(['claimedTweets', 'memeBalance']);
    claimedTweetsCache = result.claimedTweets || {};
    totalTokens = parseInt(result.memeBalance || '0');
    return true;
  } catch (error) {
    console.error('Failed to load state:', error);
    return false;
  }
}

// 更新代币余额
async function updateTokenBalance(amount) {
  try {
    // 获取当前余额
    const result = await chrome.storage.local.get(['memeBalance']);
    const currentBalance = parseInt(result.memeBalance || '0');
    const newBalance = currentBalance + parseInt(amount);
    
    // 更新存储中的余额
    await chrome.storage.local.set({
      memeBalance: newBalance
    });
    
    // 更新内存中的余额
    totalTokens = newBalance;
    
    // 通知后台脚本更新 popup
    chrome.runtime.sendMessage({
      action: 'updateBalance',
      balance: newBalance
    });

    console.log('Balance updated:', {
      currentBalance,
      amount,
      newBalance
    });

    return newBalance;
  } catch (error) {
    console.error('Failed to update token balance:', error);
    throw error;
  }
}

// 保存已领取状态
async function saveClaimedState(tweetId) {
  try {
    claimedTweetsCache[tweetId] = true;
    await chrome.storage.local.set({
      claimedTweets: claimedTweetsCache
    });
    return true;
  } catch (error) {
    console.error('Failed to save claimed state:', error);
    throw error;
  }
}

// 检查推文是否已被领取
async function isTwitterClaimed(tweetId) {
  return !!claimedTweetsCache[tweetId];
}

// 模拟领取代币的函数
async function claimTokens(tweetId) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const tokens = Math.floor(Math.random() * 20) + 5; // 随机5-25个代币
      resolve(tokens);
    }, 1000);
  });
}

// 显示提示消息
function showNotification(message, isSuccess = true) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 10px 20px;
    border-radius: 4px;
    background-color: ${isSuccess ? '#4CAF50' : '#f44336'};
    color: white;
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}

// 检查推文是否是赠送推文
async function isGiveawayTweet(tweetId) {
  try {
    // 从Chrome存储中获取赠送信息
    const result = await chrome.storage.local.get(`giveaway_${tweetId}`);
    const giveaway = result[`giveaway_${tweetId}`];
    return !!giveaway;
  } catch (error) {
    console.error('检查赠送推文失败:', error);
    return false;
  }
}

// 添加Claim按钮
async function addClaimButtons() {
  const actionGroups = document.querySelectorAll('div[role="group"]');
  
  for (const group of actionGroups) {
    // 检查是否已经存在礼物按钮
    const existingButtons = group.querySelectorAll('.claim-button');
    if (existingButtons.length > 0) {
      continue;
    }
    
    const tweetId = group.id?.split('id__')[1];
    if (!tweetId) continue;

    // 检查是否是赠送推文
    const isGiveaway = await isGiveawayTweet(tweetId);
    if (!isGiveaway) continue;

    // 检查是否在同一条推文上已经添加了按钮
    const tweetContainer = group.closest('article');
    if (tweetContainer) {
      const otherGroups = tweetContainer.querySelectorAll('div[role="group"]');
      let hasButton = false;
      for (const otherGroup of otherGroups) {
        if (otherGroup !== group && otherGroup.querySelector('.claim-button')) {
          hasButton = true;
          break;
        }
      }
      if (hasButton) continue;
    }
    
    const isClaimed = await isTwitterClaimed(tweetId);

    // 创建按钮容器
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: inline-flex;
      align-items: center;
      margin-left: 12px;
    `;

    if (isClaimed) {
      // 已领取状态
      const claimedText = document.createElement('span');
      claimedText.style.cssText = `
        display: inline-flex;
        align-items: center;
        color: rgb(0, 186, 124);
        font-size: 13px;
        font-family: TwitterChirp, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      `;
      claimedText.innerHTML = '&#10003; Claimed';
      buttonContainer.appendChild(claimedText);
    } else {
      // 未领取状态 - 显示礼物按钮
      const claimButton = document.createElement('button');
      claimButton.className = 'claim-button';
      claimButton.style.cssText = `
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 0 12px;
        height: 32px;
        background: none;
        border: none;
        cursor: pointer;
        color: rgb(83, 100, 113);
        font-size: 13px;
        font-family: TwitterChirp, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        transition: color 0.2s;
      `;
      claimButton.innerHTML = '&#127873; Claim';

      claimButton.addEventListener('mouseover', () => {
        claimButton.style.color = 'rgb(29, 155, 240)';
      });

      claimButton.addEventListener('mouseout', () => {
        claimButton.style.color = 'rgb(83, 100, 113)';
      });

      claimButton.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        if (claimButton.classList.contains('claiming')) {
          return;
        }
        
        try {
          if (await isTwitterClaimed(tweetId)) {
            showNotification('该推文已经领取过了', false);
            return;
          }
          
          claimButton.classList.add('claiming');
          claimButton.style.cursor = 'wait';
          claimButton.style.opacity = '0.7';
          claimButton.innerHTML = '&#127873; Claiming...';
          
          const tokens = await claimTokens(tweetId);
          const newBalance = await updateTokenBalance(tokens);
          await saveClaimedState(tweetId);
          
          // 替换为已领取状态
          const claimedText = document.createElement('span');
          claimedText.style.cssText = `
            display: inline-flex;
            align-items: center;
            color: rgb(0, 186, 124);
            font-size: 13px;
            font-family: TwitterChirp, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          `;
          claimedText.innerHTML = '&#10003; Claimed';
          buttonContainer.innerHTML = '';
          buttonContainer.appendChild(claimedText);
          
          showNotification(`成功领取 ${tokens} 个代币！余额: ${newBalance} FANS`, true);
        } catch (error) {
          console.error('领取失败:', error);
          showNotification('领取失败，请稍后重试', false);
          
          claimButton.classList.remove('claiming');
          claimButton.style.cursor = 'pointer';
          claimButton.style.opacity = '1';
          claimButton.innerHTML = '&#127873; Claim';
        }
      });

      buttonContainer.appendChild(claimButton);
    }

    // 添加到操作栏
    const lastChild = group.lastElementChild;
    if (lastChild) {
      group.insertBefore(buttonContainer, lastChild.nextSibling);
    } else {
      group.appendChild(buttonContainer);
    }
  }
}

// 添加CSS规则来隐藏默认按钮
function addCustomStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* 隐藏默认按钮 */
    div[role="group"] div[role="button"]:not(.claim-button) {
      display: none !important;
    }
    
    /* 确保按钮组对齐 */
    div[role="group"] {
      justify-content: flex-end !important;
      padding-right: 16px !important;
    }
  `;
  document.head.appendChild(style);
}

// 监听页面变化
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.addedNodes) {
      addClaimButtons();
    }
  }
});

// 开始观察页面变化
observer.observe(document.body, {
  childList: true,
  subtree: true
});

// 初始化
async function init() {
  try {
    await loadState();
    addCustomStyles();
    // 初始化时添加按钮
    addClaimButtons();
    // 每隔一段时间检查并添加按钮
    setInterval(addClaimButtons, 2000);
  } catch (error) {
    console.error('Initialization failed:', error);
  }
}

// 启动扩展
init();
