// 初始化 Solana Web3
(function() {
  if (typeof solanaWeb3 !== 'undefined') {
    window.solanaWeb3 = solanaWeb3;
    console.log('Solana Web3.js 初始化成功');
  } else {
    console.error('Solana Web3.js 未找到');
  }
})();
