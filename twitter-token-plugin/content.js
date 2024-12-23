// ====================
// 存储和数据管理
// ====================

/**
 * 从URL中提取推文ID
 */
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

/**
 * 创建代币赠送
 */
async function createGiveaway(tweetUrl, numPackages, tokenAmount = 100, isRandom = false) {
  try {
    const tweetId = getTweetIdFromUrl(tweetUrl);
    if (!tweetId) {
      throw new Error('推文链接无效');
    }

    console.log('正在为推文创建赠送:', tweetId);

    const result = await chrome.storage.local.get(['giveaways']);
    const giveaways = result.giveaways || {};
    
    giveaways[tweetId] = {
      tweetUrl,
      numPackages,
      tokenAmount,
      tokenSymbol: 'FANS',
      mintAddress: 'EViQB8r2we14B4sA6jEg5Ujb85WepzKUcf7YwGeGpump',
      network: 'solana',
      cluster: 'mainnet-beta',
      decimals: 6,
      createdAt: new Date().toISOString(),
      remainingPackages: numPackages,
      claims: [],
      isRandom
    };

    await chrome.storage.local.set({ giveaways });
    console.log('赠送创建成功');

    await sendAirdropComment(tweetUrl, giveaways[tweetId]);
    return true;
  } catch (error) {
    console.error('创建赠送时出错:', error);
    return false;
  }
}

/**
 * 检查推文是否有代币赠送
 */
async function checkTweetGiveaway(tweetId) {
  try {
    const result = await chrome.storage.local.get(['giveaways']);
    const giveaways = result.giveaways || {};
    return giveaways[tweetId];
  } catch (error) {
    console.error('检查推文赠送状态时出错:', error);
    return null;
  }
}

/**
 * 记录领取意向
 */
async function recordClaimIntent(tweetId, userInfo) {
  try {
    const result = await chrome.storage.local.get(['giveaways']);
    const giveaways = result.giveaways || {};
    const giveaway = giveaways[tweetId];
    
    if (!giveaway) {
      throw new Error('找不到赠送记录');
    }

    if (giveaway.claims.some(claim => claim.address === userInfo.address)) {
      throw new Error('已经领取过了');
    }

    if (giveaway.remainingPackages <= 0) {
      throw new Error('已经被领完了');
    }

    const amount = giveaway.isRandom
      ? Math.floor(Math.random() * (giveaway.tokenAmount / giveaway.numPackages * 2))
      : Math.floor(giveaway.tokenAmount / giveaway.numPackages);

    giveaway.claims.push({
      address: userInfo.address,
      amount,
      timestamp: new Date().toISOString()
    });

    giveaway.remainingPackages--;
    
    await chrome.storage.local.set({ giveaways });
    return { success: true, amount };
  } catch (error) {
    console.error('记录领取意向时出错:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 处理代币赠送领取
 */
async function handleGiveawayClaim(giveaway) {
  try {
    // 获取当前用户信息
    const userInfo = await getCurrentUser();
    if (!userInfo) {
      alert('请先连接钱包');
      return;
    }

    // 检查是否已领取
    const claimed = await hasUserClaimed(giveaway.tweetId, userInfo.address);
    if (claimed) {
      alert('您已经领取过这个赠送了');
      return;
    }

    // 记录领取
    await recordClaimIntent(giveaway.tweetId, userInfo);

    // 获取最新余额
    const balance = await getUserBalance(userInfo.address);
    
    // 更新插件中的待提取余额
    await chrome.runtime.sendMessage({
      type: 'UPDATE_PENDING_BALANCE',
      balance: balance.pendingAmount
    });

    // 显示领取成功消息
    alert(`Claimed Successfully!\n\nAmount: ${giveaway.tokenAmount} ${giveaway.tokenSymbol}\nTotal Pending: ${balance.pendingAmount} ${giveaway.tokenSymbol}\n\nYou can withdraw anytime in the plugin (gas fee required)`);
    
  } catch (error) {
    console.error('领取赠送时出错:', error);
    alert('Claim failed, please try again.');
  }
}

// UI 相关函数
function addGiveawayButton(tweet, giveaway) {
  // 检查是否已经存在按钮
  if (tweet.querySelector('.giveaway-button')) {
    return;
  }

  // 查找操作栏
  const actionBarSelectors = [
    '[role="group"]',
    'div[data-testid="tweet-actions"]',
    '.tweet-actions'
  ];
  
  let actionBar;
  for (const selector of actionBarSelectors) {
    actionBar = tweet.querySelector(selector);
    if (actionBar) break;
  }
  
  if (!actionBar) {
    console.log('没有找到操作栏');
    return;
  }

  // 创建按钮容器
  const buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.style.alignItems = 'center';
  buttonContainer.style.marginLeft = '8px';

  // 创建按钮
  const button = document.createElement('button');
  button.className = 'giveaway-button';
  
  // 检查是否已安装插件
  if (window.chrome && chrome.runtime && chrome.runtime.id) {
    button.innerHTML = '🎁 Claim';  // 已安装插件显示一个礼物和Claim
    button.title = 'Click to claim tokens';
    
    // 检查是否已领取
    checkClaimHistory(getTweetIdFromUrl(giveaway.tweetUrl), getCurrentUser())
      .then(hasClaimed => {
        if (hasClaimed) {
          button.innerHTML = '✅ Already Claimed';
          button.style.backgroundColor = '#e8f5e9';
          button.style.color = '#2e7d32';
          button.disabled = true;
        }
      });

    // 添加领取点击事件
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleGiveawayClaim(giveaway);
    });
  } else {
    // 未安装插件显示一个礼物和安装提示
    button.innerHTML = '🎁 Install to Claim';
    button.title = 'Install plugin to claim tokens';
    
    // 添加安装插件点击事件
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // 跳转到插件安装页面
      window.open('https://chrome.google.com/webstore/detail/your-plugin-id', '_blank');
    });
  }

  button.style.backgroundColor = 'transparent';
  button.style.border = 'none';
  button.style.padding = '4px';
  button.style.fontSize = '16px';
  button.style.cursor = 'pointer';
  button.style.display = 'flex';

  // 将按钮添加到容器中
  buttonContainer.appendChild(button);
  actionBar.appendChild(buttonContainer);
}

// 添加评论函数
async function addGiveawayComment(tweet, giveaway) {
  try {
    // 检查是否已经添加过评论
    const tweetId = getTweetIdFromUrl(giveaway.tweetUrl);
    const result = await chrome.storage.local.get(['giveawayComments']);
    const giveawayComments = result.giveawayComments || {};
    
    if (giveawayComments[tweetId]) {
      console.log('已经添加过评论');
      return;
    }

    // 找到评论按钮并点击
    const commentButton = tweet.querySelector('[data-testid="reply"]');
    if (!commentButton) {
      console.log('未找到评论按钮');
      return;
    }
    
    commentButton.click();
    
    // 等待评论框出现
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 找到评论输入框
    const commentBox = document.querySelector('[data-testid="tweetTextarea_0"]');
    if (!commentBox) {
      console.log('未找到评论输入框');
      return;
    }

    // 生成唯一的追踪参数
    const trackingId = `${tweetId}_${Date.now()}`;
    
    // 构建评论内容，添加追踪参数
    let commentText = `\n\n🎁`;  // 单独一行显示大emoji
    commentText += `**${giveaway.tokenAmount} $${giveaway.tokenSymbol} Tokens Available!**\n\n`;
    
    if (giveaway.numPackages > 1) {
      commentText += `💫 Random amounts for ${giveaway.numPackages} lucky people\n`;
    } else {
      commentText += `💫 ${giveaway.tokenAmount} $${giveaway.tokenSymbol} for everyone\n`;
    }
    
    commentText += `\n👉 Click to claim: [Get Plugin](https://chrome.google.com/webstore/detail/your-plugin-id?tid=${trackingId})\n`;
    commentText += `⚡️ Fast & Free • No gas fees\n`;
    commentText += `✨ ${giveaway.remainingPackages} tokens remaining`;
    
    // 输入评论内容
    const inputEvent = new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      data: commentText
    });
    
    commentBox.textContent = commentText;
    commentBox.dispatchEvent(inputEvent);
    
    // 等待评论内容输入完成
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 点击发送按钮
    const tweetButton = document.querySelector('[data-testid="tweetButton"]');
    if (tweetButton) {
      tweetButton.click();
      
      // 记录已评论和追踪信息
      giveawayComments[tweetId] = {
        timestamp: new Date().toISOString(),
        trackingId,
        giveawayInfo: {
          tokenAmount: giveaway.tokenAmount,
          tokenSymbol: giveaway.tokenSymbol,
          mintAddress: giveaway.mintAddress,
          network: giveaway.network,
          cluster: giveaway.cluster,
          decimals: giveaway.decimals
        }
      };
      await chrome.storage.local.set({ giveawayComments });
      
      console.log('评论发送成功');
    } else {
      console.log('未找到发送按钮');
    }
  } catch (error) {
    console.error('添加评论时出错:', error);
  }
}

// 处理从评论安装后的领取
async function handleInstallClaim(trackingId) {
  try {
    // 获取评论记录
    const result = await chrome.storage.local.get(['giveawayComments']);
    const giveawayComments = result.giveawayComments || {};
    
    // 查找对应的赠送信息
    let targetComment = null;
    let tweetId = null;
    
    for (const [id, comment] of Object.entries(giveawayComments)) {
      if (comment.trackingId === trackingId) {
        targetComment = comment;
        tweetId = id;
        break;
      }
    }
    
    if (!targetComment) {
      console.log('未找到对应的赠送信息');
      return;
    }
    
    // 获取用户信息
    const userInfo = await getCurrentUser();
    if (!userInfo) {
      alert('请先连接钱包');
      return;
    }
    
    // 检查是否已领取
    const claimed = await hasUserClaimed(tweetId, userInfo.address);
    if (claimed) {
      alert('您已经领取过这个赠送了');
      return;
    }
    
    // 记录领取
    await recordClaimIntent(tweetId, userInfo);
    
    // 获取最新余额
    const balance = await getUserBalance(userInfo.address);
    
    // 更新插件中的待提取余额
    await chrome.runtime.sendMessage({
      type: 'UPDATE_PENDING_BALANCE',
      balance: balance.pendingAmount
    });
    
    // 显示领取成功消息
    alert(`Welcome! You've successfully claimed:\n\n${targetComment.giveawayInfo.tokenAmount} ${targetComment.giveawayInfo.tokenSymbol}\n\nTotal Pending: ${balance.pendingAmount} ${targetComment.giveawayInfo.tokenSymbol}\n\nYou can withdraw anytime in the plugin (gas fee required)`);
    
  } catch (error) {
    console.error('处理安装后领取时出错:', error);
    alert('Claim failed, please try again.');
  }
}

// 在插件初始化时检查是否是从评论安装的
async function checkInstallSource() {
  try {
    // 获取当前标签页的 URL
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentUrl = tabs[0].url;
    
    // 检查 URL 是否包含追踪参数
    const urlParams = new URLSearchParams(currentUrl.split('?')[1]);
    const trackingId = urlParams.get('tid');
    
    if (trackingId) {
      // 是从评论安装的，处理领取
      await handleInstallClaim(trackingId);
    }
  } catch (error) {
    console.error('检查安装来源时出错:', error);
  }
}

// 监听评论和引用的逻辑
function initTokenSending() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // 查找评论框和引用框
          const commentBox = node.querySelector('[data-testid="tweetCompose"]');
          const quoteBox = node.querySelector('[data-testid="quoteTweetCompose"]');
          
          if (commentBox) {
            console.log('找到评论框，添加发送按钮');
            addSendTokenButton(commentBox);
          }
          
          if (quoteBox) {
            console.log('找到引用框，添加发送按钮');
            addSendTokenButton(quoteBox);
          }
        }
      }
    }
  });

  // 开始监听页面变化
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// 在页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  console.log('页面加载完成，初始化代币发送功能');
  initTokenSending();
});

// 添加发送按钮到评论框
function addSendTokenButton(container) {
  // 检查是否已经添加过按钮
  if (container.querySelector('.token-send-panel')) {
    return;
  }

  const panel = document.createElement('div');
  panel.className = 'token-send-panel';
  panel.style.cssText = `
    margin: 8px 0;
    padding: 12px;
    border: 1px solid #ccc;
    border-radius: 12px;
    background: #f8f9fa;
  `;

  const header = document.createElement('div');
  header.style.marginBottom = '12px';
  header.innerHTML = '🎁 Send Tokens';
  header.style.fontWeight = 'bold';
  panel.appendChild(header);

  // 创建表单容器
  const form = document.createElement('div');
  form.style.cssText = `
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  `;

  // 代币总量输入
  const amountContainer = createInputGroup('代币总量', 'number', '100', '$FANS');
  
  // 礼包数量输入
  const packagesContainer = createInputGroup('礼包数量', 'number', '1', '个');
  
  // 发送方式选择
  const distributionContainer = createDistributionSelector();

  // 发送按钮
  const sendButton = document.createElement('button');
  sendButton.innerHTML = '🎁 Send Tokens';
  sendButton.style.cssText = `
    grid-column: 1 / -1;
    background-color: #1da1f2;
    color: white;
    border: none;
    border-radius: 9999px;
    padding: 8px 16px;
    cursor: pointer;
    font-weight: bold;
    transition: background-color 0.2s;
  `;
  sendButton.onmouseover = () => sendButton.style.backgroundColor = '#1991db';
  sendButton.onmouseout = () => sendButton.style.backgroundColor = '#1da1f2';

  sendButton.addEventListener('click', async () => {
    try {
      const totalAmount = parseInt(amountContainer.querySelector('input').value);
      const numPackages = parseInt(packagesContainer.querySelector('input').value);
      const isRandom = distributionContainer.querySelector('#random-radio').checked;
      
      if (!validateInputs(totalAmount, numPackages)) return;
      
      const userInfo = await getCurrentUser();
      if (!userInfo) {
        alert('请先连接钱包');
        return;
      }

      const balance = await getUserBalance(userInfo.address);
      if (totalAmount > balance.amount) {
        alert('余额不足');
        return;
      }

      // 构建评论文本
      const commentText = `\n\n🎁`;  // 单独一行显示大emoji
      commentText += `**${totalAmount} $FANS Tokens Available!**\n\n`;
      
      if (numPackages > 1) {
        commentText += `💫 Random amounts for ${numPackages} lucky people\n`;
      } else {
        commentText += `💫 ${totalAmount} $FANS for everyone\n`;
      }
      
      commentText += `\n👉 Click to claim: [Get Plugin](https://chrome.google.com/webstore/detail/your-plugin-id)\n`;
      commentText += `⚡️ Fast & Free • No gas fees\n`;
      
      // 将代币发送信息添加到评论框
      const textbox = container.querySelector('[contenteditable="true"]');
      if (textbox) {
        textbox.textContent = commentText;
        // 触发输入事件以激活发送按钮
        textbox.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      // 记录发送信息
      await createGiveaway(window.location.href, numPackages, totalAmount, isRandom);
      
    } catch (error) {
      console.error('发送代币时出错:', error);
      alert('发送失败，请重试');
    }
  });

  // 组装UI
  form.appendChild(amountContainer);
  form.appendChild(packagesContainer);
  form.appendChild(distributionContainer);
  form.appendChild(sendButton);
  
  panel.appendChild(form);
  
  // 找到合适的插入位置
  const insertTarget = container.querySelector('[role="presentation"]');
  if (insertTarget) {
    insertTarget.parentNode.insertBefore(panel, insertTarget.nextSibling);
  } else {
    container.appendChild(panel);
  }
}

// 创建输入组
function createInputGroup(label, type, defaultValue, unit) {
  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.gap = '8px';
  
  const input = document.createElement('input');
  input.type = type;
  input.value = defaultValue;
  input.min = '1';
  input.style.cssText = `
    width: 80px;
    padding: 6px;
    border: 1px solid #ccc;
    border-radius: 4px;
  `;
  
  const unitSpan = document.createElement('span');
  unitSpan.textContent = unit;
  
  const labelSpan = document.createElement('span');
  labelSpan.textContent = label;
  labelSpan.style.color = '#536471';
  
  container.appendChild(labelSpan);
  container.appendChild(input);
  container.appendChild(unitSpan);
  
  return container;
}

// 创建发送方式选择器
function createDistributionSelector() {
  const container = document.createElement('div');
  container.style.cssText = `
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    gap: 16px;
  `;
  
  const createOption = (id, label, checked = false) => {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.alignItems = 'center';
    wrapper.style.gap = '4px';
    
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.id = id;
    radio.name = 'distribution';
    radio.checked = checked;
    
    const labelEl = document.createElement('label');
    labelEl.htmlFor = id;
    labelEl.textContent = label;
    
    wrapper.appendChild(radio);
    wrapper.appendChild(labelEl);
    return wrapper;
  };
  
  container.appendChild(createOption('fixed-radio', '固定金额', true));
  container.appendChild(createOption('random-radio', '随机金额'));
  
  return container;
}

// 验证输入
function validateInputs(totalAmount, numPackages) {
  if (isNaN(totalAmount) || totalAmount < 1 || isNaN(numPackages) || numPackages < 1) {
    alert('请输入有效的数量');
    return false;
  }
  
  if (numPackages > totalAmount) {
    alert('礼包数量不能大于代币总量');
    return false;
  }
  
  return true;
}

// 构建评论文本
function buildCommentText(totalAmount, numPackages, isRandom) {
  // 使用多个emoji让礼物图标更大更显眼
  let text = `\n\n🎁`;  // 单独一行显示大emoji
  text += `${totalAmount} $FANS Available!\n\n`;
  
  // 礼包信息
  if (numPackages > 1) {
    if (isRandom) {
      text += `🎯 ${numPackages} lucky winners\n`;
      text += `🎲 Random amounts\n`;
    } else {
      const perPackage = Math.floor(totalAmount / numPackages);
      text += `🎯 ${numPackages} winners\n`;
      text += `💰 ${perPackage} $FANS each\n`;
    }
  }
  
  // 领取说明
  text += `\n✨ Click to Claim:\n`;
  text += `👉 [Install Plugin](https://chrome.google.com/webstore/detail/your-plugin-id)\n`;
  text += `⚡️ Instant • Free • No gas fees\n`;
  
  return text;
}

// ====================
// Tweet Processing and Event Listening
// ====================

/**
 * Process a single tweet element
 * @param {Element} tweet - The tweet DOM element
 */
async function processTweet(tweet) {
  try {
    const tweetUrl = findTweetUrl(tweet);
    if (!tweetUrl) return;
    
    const tweetId = getTweetIdFromUrl(tweetUrl);
    if (!tweetId) return;

    const actionBar = findActionBar(tweet);
    if (!actionBar) return;

    const giveaway = await checkTweetGiveaway(tweetId);
    
    if (giveaway && !tweet.querySelector('.giveaway-button')) {
      await addGiveawayButton(tweet, giveaway);
    }
  } catch (error) {
    console.error('Error processing tweet:', error);
  }
}

/**
 * Find tweet URL from tweet element
 * @param {Element} tweet - The tweet DOM element
 * @returns {string|null} The tweet URL or null if not found
 */
function findTweetUrl(tweet) {
  const linkSelectors = [
    'a[href*="/status/"]',
    'a[href*="/tweets/"]',
    'div[data-testid="tweet"] a[href*="/status/"]'
  ];
  
  for (const selector of linkSelectors) {
    const link = tweet.querySelector(selector);
    if (link?.href) return link.href;
  }
  return null;
}

/**
 * Find action bar in tweet element
 * @param {Element} tweet - The tweet DOM element
 * @returns {Element|null} The action bar element or null if not found
 */
function findActionBar(tweet) {
  const actionBarSelectors = [
    '[role="group"]',
    'div[data-testid="tweet-actions"]',
    '.tweet-actions'
  ];
  
  for (const selector of actionBarSelectors) {
    const actionBar = tweet.querySelector(selector);
    if (actionBar) return actionBar;
  }
  return null;
}

/**
 * Process all tweets on the page
 */
async function processAllTweets() {
  const tweets = findTweets();
  await Promise.all(tweets.map(processTweet));
}

/**
 * Find all tweets on the page
 * @returns {Element[]} Array of tweet elements
 */
function findTweets() {
  const tweetSelectors = [
    'article[data-testid="tweet"]',
    'div[data-testid="tweet"]',
    'div[data-testid="tweetDetail"]',
    'div.tweet'
  ];
  
  for (const selector of tweetSelectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      return Array.from(elements);
    }
  }
  return [];
}

/**
 * Create tweet observer for dynamic content
 * @returns {MutationObserver} The mutation observer instance
 */
function createTweetObserver() {
  const observer = new MutationObserver((mutations) => {
    if (shouldProcessMutations(mutations)) {
      processAllTweets();
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  return observer;
}

/**
 * Check if mutations contain new tweets that need processing
 * @param {MutationRecord[]} mutations - The mutation records
 * @returns {boolean} True if mutations should be processed
 */
function shouldProcessMutations(mutations) {
  return mutations.some(mutation => 
    Array.from(mutation.addedNodes).some(node => 
      node.nodeType === Node.ELEMENT_NODE && (
        node.matches('article') ||
        node.matches('[data-testid="tweet"]') ||
        node.matches('[data-testid="tweetDetail"]') ||
        node.querySelector('article') ||
        node.querySelector('[data-testid="tweet"]')
      )
    )
  );
}

/**
 * Create comment box observer for dynamic content
 * @returns {MutationObserver} The mutation observer instance
 */
function createCommentBoxObserver() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const commentBox = node.querySelector('[data-testid="tweetCompose"]');
          const quoteBox = node.querySelector('[data-testid="quoteTweetCompose"]');
          
          if (commentBox) addSendTokenButton(commentBox);
          if (quoteBox) addSendTokenButton(quoteBox);
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  return observer;
}

/**
 * Initialize token sending functionality
 */
function initTokenSending() {
  createCommentBoxObserver();
  console.log('Token sending functionality initialized');
}

/**
 * Initialize plugin
 */
function initializePlugin() {
  console.log('Initializing plugin...');
  
  // Process existing tweets
  processAllTweets();
  
  // Set up tweet observer
  createTweetObserver();
  
  // Initialize token sending
  initTokenSending();
  
  // Check installation source
  checkInstallSource();
  
  // Periodic check for missed tweets
  setInterval(processAllTweets, 5000);
  
  console.log('Plugin initialization complete');
}

/**
 * Handle plugin messages
 * @param {Object} message - The message object
 * @param {Object} sender - The sender object
 * @param {Function} sendResponse - The response callback
 * @returns {boolean} True if response is async
 */
function handlePluginMessage(message, sender, sendResponse) {
  if (message.type === 'CREATE_GIVEAWAY') {
    createGiveaway(message.tweetUrl, message.numPackages, message.tokenAmount, message.isRandom)
      .then(success => {
        if (success) {
          setTimeout(processAllTweets, 1000);
        }
        sendResponse({ success });
      })
      .catch(error => {
        console.error('Error creating giveaway:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
}

// Set up message listener
chrome.runtime.onMessage.addListener(handlePluginMessage);

// Initialize plugin when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePlugin);
} else {
  initializePlugin();
                                                                                                                }
