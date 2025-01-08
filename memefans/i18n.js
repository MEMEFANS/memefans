// 语言配置
(() => {
  // 初始化 i18n 对象
  const i18nConfig = {
    en: {
      walletAddress: 'Wallet Address',
      solBalance: 'SOL Balance',
      fansBalance: 'FANS Balance',
      pendingWithdraw: 'Pending Withdrawal',
      claim: 'Claim',
      importWallet: 'Import Wallet',
      exportKey: 'Export Key',
      enterPrivateKey: 'Enter Private Key',
      confirm: 'Confirm',
      cancel: 'Cancel',
      claimHistory: 'Claim History',
      withdrawHistory: 'Withdrawal History',
      createGiveaway: 'Create Token Giveaway',
      tweetUrl: 'Tweet URL',
      enterTweetUrl: 'Please enter tweet URL',
      totalTokens: 'Total Tokens',
      enterTokenAmount: 'Enter Token Amount',
      numPackages: 'Number of Packages',
      enterNumPackages: 'Enter Number of Packages',
      distribution: 'Tokens Per Package',
      fixed: 'Fixed Amount',
      random: 'Random Amount',
      tokenPerPackage: 'Tokens Per Package:',
      minTokens: 'Minimum Tokens',
      maxTokens: 'Maximum Tokens',
      requirements: 'Requirements',
      requireFollow: 'Require Follow',
      requireLike: 'Require Like',
      requireRetweet: 'Require Retweet',
      requireComment: 'Require Comment',
      feeNotice: 'Note: Each giveaway will be charged 1% fee',
      createButton: 'Create Giveaway',
      creating: 'Creating...',
      success: 'Created Successfully!',
      error: 'Creation Failed',
      minTokensError: 'Minimum tokens must be less than maximum tokens',
      enterValidTokens: 'Please enter valid token amount',
      enterValidPackages: 'Please enter valid package number',
      switchLang: 'Switch to Chinese'
    },
    zh: {
      walletAddress: '钱包地址',
      solBalance: 'SOL 余额',
      fansBalance: 'FANS 余额',
      pendingWithdraw: '待提现',
      claim: '领取',
      importWallet: '导入钱包',
      exportKey: '导出私钥',
      enterPrivateKey: '输入私钥',
      confirm: '确认',
      cancel: '取消',
      claimHistory: '领取记录',
      withdrawHistory: '提现记录',
      createGiveaway: '创建代币赠送',
      tweetUrl: '推文链接',
      enterTweetUrl: '请输入推文链接',
      totalTokens: '总代币数量',
      enterTokenAmount: '输入代币数量',
      numPackages: '红包数量',
      enterNumPackages: '输入红包数量',
      distribution: '每个红包代币数量',
      fixed: '固定金额',
      random: '随机金额',
      tokenPerPackage: '每个红包代币数量：',
      minTokens: '最小代币数量',
      maxTokens: '最大代币数量',
      requirements: '领取要求',
      requireFollow: '需要关注',
      requireLike: '需要点赞',
      requireRetweet: '需要转发',
      requireComment: '需要评论',
      feeNotice: '注意：每个赠送将收取1%手续费',
      createButton: '创建赠送',
      creating: '创建中...',
      success: '创建成功！',
      error: '创建失败',
      minTokensError: '最小代币数量必须小于最大代币数量',
      enterValidTokens: '请输入有效的代币数量',
      enterValidPackages: '请输入有效的红包数量',
      switchLang: '切换到英文'
    }
  };

  // 在 DOM 加载完成后初始化
  function initializeI18n() {
    window.i18n = i18nConfig;
    console.log('i18n 初始化完成');
    
    // 触发自定义事件，通知其他脚本 i18n 已加载完成
    const event = new Event('i18nLoaded');
    window.dispatchEvent(event);
  }

  // 如果 DOM 已加载完成，立即初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeI18n);
  } else {
    initializeI18n();
  }
})();
