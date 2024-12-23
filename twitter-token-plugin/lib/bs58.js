/* bs58 library */
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.bs58 = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'
// base-x encoding / decoding
// Copyright (c) 2018 base-x contributors
// Copyright (c) 2014-2018 The Bitcoin Core developers (base58.cpp)
// Distributed under the MIT software license, see the accompanying
// file LICENSE or http://www.opensource.org/licenses/mit-license.php.
var bs58 = (function() {
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const ALPHABET_MAP = {};
  const BASE = ALPHABET.length;
  
  // 创建字母表映射
  for (let i = 0; i < ALPHABET.length; i++) {
    ALPHABET_MAP[ALPHABET.charAt(i)] = i;
  }

  function encode(buffer) {
    if (buffer.length === 0) return '';
    
    // 转换为数字
    let digits = [0];
    for (let i = 0; i < buffer.length; i++) {
      let carry = buffer[i];
      for (let j = 0; j < digits.length; j++) {
        carry += digits[j] << 8;
        digits[j] = carry % BASE;
        carry = (carry / BASE) | 0;
      }
      while (carry > 0) {
        digits.push(carry % BASE);
        carry = (carry / BASE) | 0;
      }
    }
    
    // 处理前导零
    let string = '';
    for (let i = 0; buffer[i] === 0 && i < buffer.length - 1; i++) {
      string += ALPHABET[0];
    }
    
    // 转换为字符串
    for (let i = digits.length - 1; i >= 0; i--) {
      string += ALPHABET[digits[i]];
    }
    
    return string;
  }

  function decode(string) {
    if (string.length === 0) return new Uint8Array(0);
    
    // 转换为数字
    let bytes = [0];
    for (let i = 0; i < string.length; i++) {
      let value = ALPHABET_MAP[string[i]];
      if (value === undefined) {
        throw new Error('Non-base58 character');
      }
      
      let carry = value;
      for (let j = 0; j < bytes.length; j++) {
        carry += bytes[j] * BASE;
        bytes[j] = carry & 0xff;
        carry >>= 8;
      }
      
      while (carry > 0) {
        bytes.push(carry & 0xff);
        carry >>= 8;
      }
    }
    
    // 处理前导零
    for (let i = 0; string[i] === ALPHABET[0] && i < string.length - 1; i++) {
      bytes.push(0);
    }
    
    return new Uint8Array(bytes.reverse());
  }

  return {
    encode: encode,
    decode: decode
  };
})();
module.exports = bs58;
},{}],2:[function(require,module,exports){
'use strict'
var bs58 = require('./base')
module.exports = bs58
},{"./base":1}]},{},[2])(2)
});
