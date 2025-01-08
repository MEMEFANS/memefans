// 浏览器环境的 Buffer 实现
(function(global) {
  'use strict';
  
  // 如果已经有 Buffer 定义，直接返回
  if (global.Buffer && global.buffer) return;
  
  // 创建 Buffer 类
  function Buffer(arg, encodingOrOffset, length) {
    // 处理各种构造函数参数
    if (typeof arg === 'number') {
      return allocUnsafe(arg);
    }
    return from(arg, encodingOrOffset, length);
  }

  // 从各种格式创建 Buffer
  function from(value, encodingOrOffset, length) {
    if (typeof value === 'string') {
      return fromString(value, encodingOrOffset);
    }
    if (Array.isArray(value)) {
      return fromArray(value);
    }
    if (value instanceof ArrayBuffer) {
      return fromArrayBuffer(value, encodingOrOffset, length);
    }
    throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.');
  }

  // 创建指定大小的 Buffer
  function allocUnsafe(size) {
    return new Uint8Array(size);
  }

  // 从字符串创建 Buffer
  function fromString(string, encoding) {
    if (typeof string !== 'string') {
      throw new TypeError('First argument must be a string');
    }
    
    // 简单实现：仅支持 UTF-8
    const arr = new Uint8Array(string.length * 4);
    let pos = 0;
    
    for (let i = 0; i < string.length; i++) {
      const code = string.charCodeAt(i);
      
      if (code < 0x80) {
        arr[pos++] = code;
      } else if (code < 0x800) {
        arr[pos++] = 0xc0 | (code >> 6);
        arr[pos++] = 0x80 | (code & 0x3f);
      } else if (code < 0xd800 || code >= 0xe000) {
        arr[pos++] = 0xe0 | (code >> 12);
        arr[pos++] = 0x80 | ((code >> 6) & 0x3f);
        arr[pos++] = 0x80 | (code & 0x3f);
      }
    }
    
    return arr.subarray(0, pos);
  }

  // 从数组创建 Buffer
  function fromArray(array) {
    return new Uint8Array(array);
  }

  // 从 ArrayBuffer 创建 Buffer
  function fromArrayBuffer(arrayBuffer, byteOffset, length) {
    byteOffset = byteOffset || 0;
    length = length || arrayBuffer.byteLength - byteOffset;
    return new Uint8Array(arrayBuffer, byteOffset, length);
  }

  // 设置 Buffer 的静态方法
  Buffer.from = from;
  Buffer.allocUnsafe = allocUnsafe;
  
  // 导出到全局
  global.Buffer = Buffer;
  global.buffer = { Buffer: Buffer };
})(typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
