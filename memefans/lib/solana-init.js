// 初始化 Solana Web3
(function() {
  // 确保 Buffer 正确初始化
  if (typeof window.Buffer === 'undefined') {
    window.Buffer = function(arg) {
      if (typeof arg === 'number') {
        const buf = new Uint8Array(arg);
        buf._isBuffer = true;
        return buf;
      }
      if (Array.isArray(arg)) {
        return new Uint8Array(arg);
      }
      throw new Error('不支持的 Buffer 参数类型');
    };
    window.Buffer.from = function(array) {
      if (Array.isArray(array)) {
        return new Uint8Array(array);
      }
      throw new Error('Buffer.from 仅支持数组');
    };
    window.Buffer.alloc = function(size) {
      return new Uint8Array(size);
    };
    window.Buffer.isBuffer = function(obj) {
      return obj != null && obj._isBuffer === true;
    };
    console.log('Buffer 初始化成功');
  }

  // 确保 solanaWeb3 正确初始化
  if (typeof solanaWeb3 !== 'undefined') {
    window.solanaWeb3 = solanaWeb3;
    console.log('Solana Web3.js 初始化成功');
  } else {
    console.error('Solana Web3.js 未找到，请确保已加载 solana-web3.js');
  }
})();
