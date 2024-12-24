// 处理插件消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkGiveawayStatus') {
    // 检查该推文是否已经设置了赠送
    chrome.storage.local.get(`giveaway_${request.tweetId}`, (result) => {
      sendResponse({
        exists: !!result[`giveaway_${request.tweetId}`],
        data: result[`giveaway_${request.tweetId}`]
      });
    });
    return true; // 保持消息通道开放
  }
  
  if (request.action === 'openGiveawayPopup') {
    // 存储当前推文ID
    chrome.storage.local.set({ currentTweetId: request.tweetId });
  }

  if (request.action === 'updateBalance') {
    // 通知所有打开的 popup 更新余额
    chrome.runtime.sendMessage({
      action: 'balanceUpdated',
      balance: request.balance
    });
  }
});

// 监听存储变化
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.currentTweetId) {
    // 可以在这里添加额外的处理逻辑
  }

  if (changes.memeBalance) {
    // 当代币余额变化时，通知所有打开的 popup
    chrome.runtime.sendMessage({
      action: 'balanceUpdated',
      balance: changes.memeBalance.newValue
    });
  }
});

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && (tab.url.includes('twitter.com') || tab.url.includes('x.com'))) {
    // 重新注入内容脚本
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    }).catch(console.error);
  }
});

// 监听来自内容脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CONTENT_SCRIPT_READY') {
    sendResponse({ success: true });
  }
});

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'UPDATE_PENDING_BALANCE') {
    // 更新插件中显示的待提取余额
    chrome.storage.local.set({ 
      pendingBalance: message.balance 
    });
    
    // 更新插件图标上的badge显示待提取数量
    if (message.balance > 0) {
      chrome.action.setBadgeText({ 
        text: message.balance.toString() 
      });
      chrome.action.setBadgeBackgroundColor({ 
        color: '#4CAF50' 
      });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  }
});
