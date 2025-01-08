// 初始化 buffer
(function() {
  'use strict';
  
  // 确保 buffer 全局变量存在
  window.buffer = window.buffer || {};
  
  // 等待 browser-buffer.js 加载完成
  function initBuffer() {
    if (typeof buffer !== 'undefined' && buffer.Buffer) {
      window.Buffer = buffer.Buffer;
      console.log('Buffer 初始化成功');
    } else {
      console.log('等待 Buffer 加载...');
      setTimeout(initBuffer, 10);
    }
  }
  
  // 开始初始化
  initBuffer();
})();
