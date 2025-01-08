// 初始化 buffer
(function() {
  'use strict';
  
  let initialized = false;
  
  // 确保 buffer 全局变量存在
  window.buffer = window.buffer || {};
  
  // 等待 browser-buffer.js 加载完成
  function initBuffer() {
    if (!initialized && window.Buffer) {
      console.log('Buffer 初始化成功');
      initialized = true;
      return true;
    } else if (!initialized) {
      console.log('等待 Buffer 加载...');
      return false;
    }
    return true;
  }
  
  // 开始初始化
  function startInit() {
    if (!initBuffer()) {
      setTimeout(startInit, 10);
    }
  }
  
  startInit();
})();
