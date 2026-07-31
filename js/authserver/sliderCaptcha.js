// PotatoPlus — authserver 滑块验证码处理（无 UI，纯协议复现）
// 参考 D:\Code\NJUlogin\NJUlogin\sliderCaptcha.py
// 不渲染滑块 UI，直接走 toSliderCaptcha / openSliderCaptcha / verifySliderCaptcha 接口。
(function () {
  "use strict";

  const CANVAS_WIDTH = 280;
  const BACKGROUND_DRAW_WIDTH = 278;
  const MAX_SLIDER_DISTANCE = 240;
  const DEFAULT_ATTEMPTS = 5;
  const MIN_VERIFY_DELAY = 1.82; // 秒，模拟人类拖动耗时
  const MAX_VERIFY_DELAY = 2.08;
  const PASSWORD_CHARS = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678";
  // 与网页事件采样规则一致的位置比例序列
  const MOVE_PROFILE = [
    0.0667, 0.122, 0.211, 0.367, 0.5, 0.622, 0.733, 0.778,
    0.822, 0.867, 0.889, 0.911, 0.944, 0.967, 1.0,
  ];

  const AUTHSERVER = location.origin + "/authserver";
  const TO_SLIDER = AUTHSERVER + "/common/toSliderCaptcha.htl";
  const OPEN_SLIDER = AUTHSERVER + "/common/openSliderCaptcha.htl";
  const VERIFY_SLIDER = AUTHSERVER + "/common/verifySliderCaptcha.htl";

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function ajaxHeaders() {
    return {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "X-Requested-With": "XMLHttpRequest",
    };
  }

  // ---- base64 / 字节 ----
  function base64ToBytes(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  function bytesToBase64(bytes) {
    let s = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(s);
  }
  const utf8Encode = (str) => new TextEncoder().encode(str);

  // ---- AES-CBC（PKCS7 自动补齐）via Web Crypto ----
  async function aesCbcEncrypt(keyBytes, ivBytes, plainBytes) {
    if (!window.crypto || !crypto.subtle) throw new Error("Web Crypto 不可用");
    const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-CBC" }, false, ["encrypt"]);
    const buf = await crypto.subtle.encrypt({ name: "AES-CBC", iv: ivBytes }, key, plainBytes);
    return new Uint8Array(buf);
  }

  function randomChars(n) {
    const rnd = new Uint32Array(n);
    crypto.getRandomValues(rnd);
    let s = "";
    for (let i = 0; i < n; i++) s += PASSWORD_CHARS[rnd[i] % PASSWORD_CHARS.length];
    return s;
  }

  // 复现统一认证前端签名：prefix(64) + payload，AES-CBC，输出 base64
  async function encryptSign(payload, keyBytes) {
    const prefix = utf8Encode(randomChars(64));
    const iv = utf8Encode(randomChars(16));
    const serialized = utf8Encode(JSON.stringify(payload));
    const plain = new Uint8Array(prefix.length + serialized.length);
    plain.set(prefix, 0);
    plain.set(serialized, prefix.length);
    return bytesToBase64(await aesCbcEncrypt(keyBytes, iv, plain));
  }

  // 密码加密（与 NJUlogin pwdEncrypt 一致：64 随机字符 + 明文密码，盐作 key）
  async function encryptPassword(password, salt) {
    const keyBytes = utf8Encode(salt);
    const ivBytes = utf8Encode(randomChars(16));
    const plainBytes = utf8Encode(randomChars(64) + password);
    return bytesToBase64(await aesCbcEncrypt(keyBytes, ivBytes, plainBytes));
  }

  // ---- 图片解码（原始字节 -> RGBA）----
  async function decodeRgba(bytes) {
    const blob = new Blob([bytes]);
    const bmp = await createImageBitmap(blob);
    const w = bmp.width, h = bmp.height;
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(bmp, 0, 0);
    const { data } = ctx.getImageData(0, 0, w, h);
    bmp.close();
    return { data, w, h };
  }

  // 取出某矩形区域的灰度（Float32），stride 为原图宽
  function extractGrayRegion(rgba, stride, x0, y0, rw, rh) {
    const out = new Float32Array(rw * rh);
    for (let y = 0; y < rh; y++) {
      for (let x = 0; x < rw; x++) {
        const si = ((y0 + y) * stride + (x0 + x)) * 4;
        out[y * rw + x] = 0.299 * rgba[si] + 0.587 * rgba[si + 1] + 0.114 * rgba[si + 2];
      }
    }
    return out;
  }

  // Canny 边缘（Sobel + 非极大值抑制 + 双阈值滞回），与 cv2.Canny(gray, 50, 150) 对齐
  function cannyEdges(gray, w, h, low, high) {
    const gx = new Float32Array(w * h), gy = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const a00 = gray[(y - 1) * w + x - 1], a01 = gray[(y - 1) * w + x], a02 = gray[(y - 1) * w + x + 1];
        const a10 = gray[y * w + x - 1],                         a12 = gray[y * w + x + 1];
        const a20 = gray[(y + 1) * w + x - 1], a21 = gray[(y + 1) * w + x], a22 = gray[(y + 1) * w + x + 1];
        gx[y * w + x] = (a02 + 2 * a12 + a22) - (a00 + 2 * a10 + a20);
        gy[y * w + x] = (a20 + 2 * a21 + a22) - (a00 + 2 * a01 + a02);
      }
    }
    const mag = new Float32Array(w * h);
    const bin = new Uint8Array(w * h); // 0:水平 1:45 2:90 3:135（梯度方向）
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        mag[i] = Math.abs(gx[i]) + Math.abs(gy[i]); // L1（L2gradient=False）
        let t = Math.atan2(gy[i], gx[i]) * 180 / Math.PI;
        if (t < 0) t += 180;
        if (t < 22.5 || t >= 157.5) bin[i] = 0;
        else if (t < 67.5) bin[i] = 1;
        else if (t < 112.5) bin[i] = 2;
        else bin[i] = 3;
      }
    }
    const nms = new Float32Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x, m = mag[i];
        let n1, n2;
        switch (bin[i]) {
          case 0: n1 = mag[i - 1]; n2 = mag[i + 1]; break;                       // 左 / 右
          case 1: n1 = mag[(y + 1) * w + x + 1]; n2 = mag[(y - 1) * w + x - 1]; break; // SE / NW
          case 2: n1 = mag[(y - 1) * w + x]; n2 = mag[(y + 1) * w + x]; break;   // 上 / 下
          default: n1 = mag[(y + 1) * w + x - 1]; n2 = mag[(y - 1) * w + x + 1]; break; // SW / NE
        }
        if (m >= n1 && m >= n2) nms[i] = m;
      }
    }
    const out = new Uint8Array(w * h);
    const stack = [];
    for (let i = 0; i < w * h; i++) {
      if (nms[i] >= high) { out[i] = 255; stack.push(i); }
      else if (nms[i] >= low) { out[i] = 75; }
    }
    while (stack.length) { // 滞回：连接到强边缘的弱边缘保留
      const i = stack.pop(), x = i % w, y = (i / w) | 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const ni = ny * w + nx;
          if (out[ni] === 75) { out[ni] = 255; stack.push(ni); }
        }
      }
    }
    return out;
  }

  // TM_CCOEFF_NORMED，模板高度 == 搜索高度时退化为沿 x 的 1D 搜索
  function matchTemplateHorizontal(search, templ, sw, tw, th) {
    const n = tw * th;
    let tSum = 0;
    for (let i = 0; i < n; i++) tSum += templ[i];
    const tMean = tSum / n;
    let tVar = 0;
    for (let i = 0; i < n; i++) { const d = templ[i] - tMean; tVar += d * d; }
    let bestX = 0, bestScore = -Infinity;
    for (let ox = 0; ox + tw <= sw; ox++) {
      let pSum = 0;
      for (let y = 0; y < th; y++) {
        const row = y * sw + ox;
        for (let x = 0; x < tw; x++) pSum += search[row + x];
      }
      const pMean = pSum / n;
      let num = 0, pVar = 0;
      for (let y = 0; y < th; y++) {
        const sRow = y * sw + ox, tRow = y * tw;
        for (let x = 0; x < tw; x++) {
          const pd = search[sRow + x] - pMean;
          num += pd * (templ[tRow + x] - tMean);
          pVar += pd * pd;
        }
      }
      const denom = Math.sqrt(pVar * tVar);
      const score = denom > 0 ? num / denom : 0;
      if (score > bestScore) { bestScore = score; bestX = ox; }
    }
    return { left: bestX, confidence: bestScore };
  }

  // 用边缘模板匹配定位拼图缺口（对应 locate_gap）
  function locateGap(bg, piece) {
    const { data: bgRgba, w: bgW, h: bgH } = bg;
    const { data: pcRgba, w: pcW, h: pcH } = piece;
    // 拼图 alpha 通道的外接矩形
    let minX = pcW, minY = pcH, maxX = -1, maxY = -1;
    for (let y = 0; y < pcH; y++) {
      for (let x = 0; x < pcW; x++) {
        if (pcRgba[(y * pcW + x) * 4 + 3] > 0) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) throw new Error("拼图完全透明");
    const px = minX, py = minY, pw = maxX - minX + 1, ph = maxY - minY + 1;
    if (py + ph > bgH) throw new Error("拼图尺寸超出背景");

    const templGray = extractGrayRegion(pcRgba, pcW, px, py, pw, ph);
    const searchGray = extractGrayRegion(bgRgba, bgW, 0, py, bgW, ph);
    const templEdges = cannyEdges(templGray, pw, ph, 50, 150);
    const searchEdges = cannyEdges(searchGray, bgW, ph, 50, 150);
    const { left, confidence } = matchTemplateHorizontal(searchEdges, templEdges, bgW, pw, ph);
    return { left, confidence, piece: { x: px, y: py, w: pw, h: ph }, bgWidth: bgW };
  }

  // 原图缺口坐标 -> 网页 280px 滑块坐标
  function scaleMoveLength(left, bgWidth) {
    const moveLength = Math.floor(left * BACKGROUND_DRAW_WIDTH / bgWidth + 0.5) + 2;
    if (!(moveLength > 0 && moveLength <= MAX_SLIDER_DISTANCE)) {
      throw new Error("滑块距离超出有效范围: " + moveLength);
    }
    return moveLength;
  }

  // RNG（Math.random 即可，服务端不校验轨迹随机性）
  const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const randint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const uniform = (a, b) => a + Math.random() * (b - a);

  // 生成与网页事件采样一致的平滑拖动轨迹
  function generateTracks(moveLength) {
    let vertical = choice([-1, 0, 1]);
    const tracks = [
      { a: 0, b: 0, c: 0 },
      { a: 0, b: choice([-1, 0, 0, 1]), c: randint(28, 48) },
    ];
    let last = 0;
    for (const prop of MOVE_PROFILE) {
      const jitter = prop < 1 ? uniform(-0.008, 0.008) : 0;
      const position = Math.min(moveLength, Math.max(last, Math.floor(moveLength * (prop + jitter) + 0.5)));
      if (position - last < 2 && prop < 1) continue;
      if (Math.random() < 0.18) vertical = Math.max(-2, Math.min(2, vertical + choice([-1, 0, 1])));
      tracks.push({ a: position, b: vertical, c: randint(21, 36) });
      last = position;
    }
    if (tracks[tracks.length - 1].a !== moveLength) {
      tracks.push({ a: moveLength, b: vertical, c: randint(45, 90) });
    } else {
      tracks[tracks.length - 1].c = randint(45, 90);
    }
    tracks.push({ a: moveLength, b: vertical, c: randint(220, 390) });
    return tracks;
  }

  async function solveChallenge(challenge) {
    const bgBytes = base64ToBytes(challenge.bigImage);
    const pieceBytes = base64ToBytes(challenge.smallImage);
    if (pieceBytes.length < 16) throw new Error("拼图数据缺少加密密钥");
    const [bg, piece] = await Promise.all([decodeRgba(bgBytes), decodeRgba(pieceBytes)]);
    const gap = locateGap(bg, piece);
    const moveLength = scaleMoveLength(gap.left, gap.bgWidth);
    const proof = { canvasLength: CANVAS_WIDTH, moveLength, tracks: generateTracks(moveLength) };
    return { proof, key: pieceBytes.slice(-16), moveLength, confidence: gap.confidence };
  }

  // 主入口：识别并验证滑块，失败自动换图重试
  async function verifySliderCaptcha(options) {
    const attempts = (options && options.attempts) || DEFAULT_ATTEMPTS;
    const headers = ajaxHeaders();
    for (let i = 0; i < attempts; i++) {
      const openedAt = performance.now();
      try {
        await fetch(TO_SLIDER, { method: "GET", headers, credentials: "include" });
        const openResp = await fetch(OPEN_SLIDER + "?_=" + Date.now(), { method: "GET", headers, credentials: "include" });
        if (!openResp.ok) continue;
        const challenge = await openResp.json();
        if (!challenge || !challenge.bigImage || !challenge.smallImage) continue;
        const solved = await solveChallenge(challenge);
        const sign = await encryptSign(solved.proof, solved.key);

        const remaining = uniform(MIN_VERIFY_DELAY, MAX_VERIFY_DELAY) - (performance.now() - openedAt) / 1000;
        if (remaining > 0) await sleep(remaining * 1000);

        const verifyResp = await fetch(VERIFY_SLIDER, {
          method: "POST",
          headers: Object.assign({}, headers, { "Content-Type": "application/x-www-form-urlencoded" }),
          body: "sign=" + encodeURIComponent(sign),
          credentials: "include",
        });
        if (!verifyResp.ok) continue;
        const result = await verifyResp.json();
        if (result && (result.errorCode === 1 || result.errorCode === "1")) return true;
      } catch (_) {
        continue; // 单次失败则换图重试
      }
    }
    return false;
  }

  window.pjwVerifySliderCaptcha = verifySliderCaptcha;
  window.pjwEncryptAuthserverPassword = encryptPassword;
})();
