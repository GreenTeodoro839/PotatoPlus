// pjw-crypto.js - AES-128-ECB encryption for xk.nju.edu.cn API parameters
(function() {
  "use strict";

  var XK_AES_KEY = "wHm1xj3afURghi0c";

  // AES S-Box
  var SBOX = [
    0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
    0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
    0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
    0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
    0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
    0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
    0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
    0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
    0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
    0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
    0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
    0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
    0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
    0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
    0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
    0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16
  ];

  // Round constants
  var RCON = [0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36];

  // Galois field multiply by 2
  function xtime(a) {
    return ((a << 1) ^ (((a >> 7) & 1) * 0x1b)) & 0xff;
  }

  // Key expansion for AES-128
  function expandKey(keyBytes) {
    var w = new Array(176);
    var i;
    for (i = 0; i < 16; i++) w[i] = keyBytes[i];
    for (i = 16; i < 176; i += 4) {
      var t0 = w[i-4], t1 = w[i-3], t2 = w[i-2], t3 = w[i-1];
      if (i % 16 === 0) {
        var tmp = t0;
        t0 = SBOX[t1] ^ RCON[(i / 16) - 1];
        t1 = SBOX[t2];
        t2 = SBOX[t3];
        t3 = SBOX[tmp];
      }
      w[i]   = w[i-16] ^ t0;
      w[i+1] = w[i-15] ^ t1;
      w[i+2] = w[i-14] ^ t2;
      w[i+3] = w[i-13] ^ t3;
    }
    return w;
  }

  // AES-128 encrypt one 16-byte block
  function encryptBlock(block, expKey) {
    var s = new Array(16);
    var i, j, round, tmp;

    // Copy input and initial AddRoundKey
    for (i = 0; i < 16; i++) s[i] = block[i] ^ expKey[i];

    for (round = 1; round <= 10; round++) {
      // SubBytes
      for (i = 0; i < 16; i++) s[i] = SBOX[s[i]];

      // ShiftRows
      // Row 1: shift left 1
      tmp = s[1]; s[1] = s[5]; s[5] = s[9]; s[9] = s[13]; s[13] = tmp;
      // Row 2: shift left 2
      tmp = s[2]; s[2] = s[10]; s[10] = tmp;
      tmp = s[6]; s[6] = s[14]; s[14] = tmp;
      // Row 3: shift left 3
      tmp = s[3]; s[3] = s[15]; s[15] = s[11]; s[11] = s[7]; s[7] = tmp;

      // MixColumns (skip in last round)
      if (round < 10) {
        for (j = 0; j < 16; j += 4) {
          var a0 = s[j], a1 = s[j+1], a2 = s[j+2], a3 = s[j+3];
          s[j]   = xtime(a0) ^ (xtime(a1) ^ a1) ^ a2 ^ a3;
          s[j+1] = a0 ^ xtime(a1) ^ (xtime(a2) ^ a2) ^ a3;
          s[j+2] = a0 ^ a1 ^ xtime(a2) ^ (xtime(a3) ^ a3);
          s[j+3] = (xtime(a0) ^ a0) ^ a1 ^ a2 ^ xtime(a3);
        }
      }

      // AddRoundKey
      var rkOffset = round * 16;
      for (i = 0; i < 16; i++) s[i] ^= expKey[rkOffset + i];
    }

    return s;
  }

  // UTF-8 encode string to byte array
  function utf8Encode(str) {
    var bytes = [];
    for (var i = 0; i < str.length; i++) {
      var c = str.charCodeAt(i);
      if (c < 0x80) {
        bytes.push(c);
      } else if (c < 0x800) {
        bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
      } else if (c >= 0xd800 && c < 0xe000) {
        // Surrogate pair
        var hi = c, lo = str.charCodeAt(++i);
        c = 0x10000 + ((hi - 0xd800) << 10) + (lo - 0xdc00);
        bytes.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 0x3f), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
      } else {
        bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
      }
    }
    return bytes;
  }

  // PKCS7 padding
  function pkcs7Pad(data, blockSize) {
    var padLen = blockSize - (data.length % blockSize);
    var padded = data.slice();
    for (var i = 0; i < padLen; i++) padded.push(padLen);
    return padded;
  }

  // AES-128-ECB encrypt (full message)
  function aesEcbEncrypt(data, keyBytes) {
    var expKey = expandKey(keyBytes);
    var result = [];
    for (var i = 0; i < data.length; i += 16) {
      var block = data.slice(i, i + 16);
      var encrypted = encryptBlock(block, expKey);
      for (var j = 0; j < 16; j++) result.push(encrypted[j]);
    }
    return result;
  }

  // Byte array to Base64
  function toBase64(bytes) {
    var binary = '';
    for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  /**
   * Encrypt parameter object for xk.nju.edu.cn API.
   * Matches the server-side AES-ECB encryption with key "wHm1xj3afURghi0c",
   * appending ?timestrap=<timestamp> before encrypting.
   * @param {Object} payloadObj - The payload to encrypt (e.g. {data: {...}})
   * @returns {string} Base64 encoded AES-ECB encrypted string
   */
  window.pjwEncryptParam = function(payloadObj) {
    var jsonStr = JSON.stringify(payloadObj);

    // Try page's aesUtil first (it handles ?timestrap= internally)
    if (typeof aesUtil !== 'undefined' && typeof aesUtil.encrypt === 'function') {
      try {
        return aesUtil.encrypt(jsonStr);
      } catch(e) {
        console.warn("PotatoPlus: aesUtil.encrypt failed, using fallback", e);
      }
    }

    var timestamp = Date.now();
    var textToEncrypt = jsonStr + "?timestrap=" + timestamp;

    // Try CryptoJS (may be available from page scripts)
    if (typeof CryptoJS !== 'undefined' && CryptoJS.AES && CryptoJS.mode && CryptoJS.mode.ECB) {
      try {
        var key = CryptoJS.enc.Utf8.parse(XK_AES_KEY);
        return CryptoJS.AES.encrypt(textToEncrypt, key, {
          mode: CryptoJS.mode.ECB,
          padding: CryptoJS.pad.Pkcs7
        }).toString();
      } catch(e) {
        console.warn("PotatoPlus: CryptoJS failed, using built-in AES", e);
      }
    }

    // Fallback: built-in AES-128-ECB
    var keyBytes = utf8Encode(XK_AES_KEY);
    var plainBytes = utf8Encode(textToEncrypt);
    var padded = pkcs7Pad(plainBytes, 16);
    var encrypted = aesEcbEncrypt(padded, keyBytes);
    return toBase64(encrypted);
  };
})();
