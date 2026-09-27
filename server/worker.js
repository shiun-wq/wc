/* 娃衣衣櫃 AI 後台（Cloudflare Worker）
   ------------------------------------------------------------
   網頁／App 不再直接連 API，而是把要做的事丟到這裡，由這裡帶上密鑰去問 AI。
   密鑰只存在 Cloudflare 的設定裡，使用者看不到，也不會出現在網頁原始碼。

   在 Cloudflare 後台 → 這個 Worker → Settings → Variables and Secrets 設定：
     API_BASE            API 地址，例如 https://api.example.com/v1           （Text）
     API_KEY             API 密鑰                                          （Secret，一定要選 Secret）
     MODEL_TEXT          文字／看圖分析用的模型                               （Text）
     MODEL_IMAGE         AI 出圖（貼圖）用的模型，留空 = 不開放 AI 出圖          （Text）
     IMAGE_API_BASE      出圖用的 API 地址，出圖在另一個地方才要填，留空 = 同上     （Text，選填）
     IMAGE_API_KEY       出圖用的 API 密鑰，留空 = 同上                        （Secret，選填）
     IMAGE_API_STYLE     出圖服務的格式：chat（對話格式）、task（ToAPIs 那種先上傳再送任務）、
                         studio（1route Studio）。留空 = 依地址自動判斷          （Text，選填）
     IMAGE_QUALITY       GPT Image 的品質：low / medium / high，留空 = 服務預設    （Text，選填）
     ALLOWED_ORIGINS     允許使用的網址，逗號分隔                               （Text）
                         例：https://shiun-wq.github.io,capacitor://localhost,https://localhost
     DAILY_LIMIT         每台裝置每天最多幾次，預設 30（需要綁 KV 才會生效）      （Text，選填）
     GLOBAL_DAILY_LIMIT  全部人加起來每天最多幾次，預設 300（需要綁 KV）         （Text，選填）
   選填的 KV 綁定：變數名稱 QUOTA → 用來記每天用了幾次，防止被刷爆帳單。

   路徑：
     GET  /health  看設定有沒有填好（不會顯示密鑰）
     POST /ai      { task, messages }  task 是 tag / buy / wearid / idea / img / test
*/

const TASKS = ['tag', 'buy', 'wearid', 'idea', 'img', 'test'];
const MAX_BODY = 12 * 1024 * 1024; // 12MB，照片都已經先壓過，正常遠低於這個
const MAX_IMAGES = 10;
const MAX_TOKENS = 8192;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const origin = req.headers.get('origin') || '';
    const allowed = originAllowed(origin, env);
    const cors = corsHeaders(allowed ? origin : '');

    if (req.method === 'OPTIONS') return new Response(null, { status: allowed ? 204 : 403, headers: cors });

    if (url.pathname === '/health' && req.method === 'GET') {
      return json({
        ok: !!(env.API_BASE && env.API_KEY && env.MODEL_TEXT),
        api: !!env.API_BASE, key: !!env.API_KEY,
        text: !!env.MODEL_TEXT, image: !!env.MODEL_IMAGE,
        imageApi: !!env.IMAGE_API_BASE, imageKey: !!env.IMAGE_API_KEY,
        imageStyle: imageStyle(env),
        limit: !!env.QUOTA, origins: !!(env.ALLOWED_ORIGINS || '').trim()
      }, 200, cors);
    }

    // 查詢出圖進度（網頁切到背景再回來也能接著拿結果）
    const jm = url.pathname.match(/^\/job\/([A-Za-z0-9_-]{4,100})$/);
    if (jm && req.method === 'GET') {
      if (!allowed) return json({ error: '這個網址沒有被允許使用 AI' }, 403, cors);
      return imageStyle(env) === 'studio' ? studioStatus(jm[1], env, cors) : jobStatus(jm[1], env, cors);
    }

    if (url.pathname !== '/ai' || req.method !== 'POST') return json({ error: '找不到這個功能' }, 404, cors);
    if (!allowed) return json({ error: '這個網址沒有被允許使用 AI' }, 403, cors);
    if (!env.API_BASE || !env.API_KEY || !env.MODEL_TEXT) return json({ error: 'AI 服務還沒設定好' }, 503, cors);

    const len = +req.headers.get('content-length') || 0;
    if (len > MAX_BODY) return json({ error: '照片太大了' }, 413, cors);
    let raw;
    try { raw = await req.text(); } catch (e) { return json({ error: '讀取失敗' }, 400, cors); }
    if (raw.length > MAX_BODY) return json({ error: '照片太大了' }, 413, cors);

    let body;
    try { body = JSON.parse(raw); } catch (e) { return json({ error: '格式錯誤' }, 400, cors); }
    const task = String(body.task || '');
    if (!TASKS.includes(task)) return json({ error: '不支援的功能' }, 400, cors);
    const messages = cleanMessages(body.messages);
    if (!messages) return json({ error: '格式錯誤' }, 400, cors);
    // 測試連線不算次數，所以只准一小段文字
    if (task === 'test' && (messages[0].content.length !== 1 || messages[0].content[0].type !== 'text' || messages[0].content[0].text.length > 100))
      return json({ error: '格式錯誤' }, 400, cors);

    const model = task === 'img' ? env.MODEL_IMAGE : env.MODEL_TEXT;
    if (!model) return json({ error: '目前沒有開放 AI 出圖' }, 503, cors);

    // 次數限制（有綁 KV 才會啟用）
    if (env.QUOTA && task !== 'test') {
      const device = (req.headers.get('x-device') || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'anon';
      const day = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10); // 台灣時間換日
      const perDevice = +env.DAILY_LIMIT || 30, global = +env.GLOBAL_DAILY_LIMIT || 300;
      const dKey = `d:${day}:${device}`, gKey = `g:${day}`;
      const [dUsed, gUsed] = await Promise.all([env.QUOTA.get(dKey), env.QUOTA.get(gKey)]).then(a => a.map(v => +v || 0));
      if (gUsed >= global) return json({ error: '今天大家用得太兇，AI 休息一下，明天再來' }, 429, cors);
      if (dUsed >= perDevice) return json({ error: '今天的 AI 次數用完了，明天再試' }, 429, cors);
      await Promise.all([
        env.QUOTA.put(dKey, String(dUsed + 1), { expirationTtl: 172800 }),
        env.QUOTA.put(gKey, String(gUsed + 1), { expirationTtl: 172800 })
      ]);
    }

    // 出圖可以用另一組地址／密鑰
    const isImg = task === 'img';
    const base = (isImg && env.IMAGE_API_BASE) || env.API_BASE;
    const key = (isImg && env.IMAGE_API_KEY) || env.API_KEY;
    if (isImg && imageStyle(env) === 'studio') return studioImage(base, key, model, messages, env, cors, req.headers.get('x-async') === '1');
    if (isImg && imageStyle(env) === 'task') return taskImage(base, key, model, messages, env, cors, req.headers.get('x-async') === '1');
    let up;
    try {
      up = await fetch(apiURL(base, '/chat/completions'), {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key },
        body: JSON.stringify({ model, max_tokens: task === 'test' ? 16 : MAX_TOKENS, stream: false, messages })
      });
    } catch (e) {
      return json({ error: 'AI 服務連不上，稍後再試' }, 502, cors);
    }
    if (!up.ok) {
      const t = await up.text().catch(() => '');
      const msg = up.status === 429 ? 'AI 服務忙碌中，稍後再試'
        : up.status === 401 || up.status === 403 ? 'AI 服務設定有誤（密鑰）'
        : up.status === 400 || up.status === 404 ? 'AI 服務設定有誤（模型或格式）'
        : 'AI 服務暫時有問題';
      // 上游錯誤細節只在 DEBUG=1 時回傳，平常不讓使用者看到上游是誰
      return json({ error: msg, status: up.status, ...(env.DEBUG === '1' ? { detail: t.slice(0, 300) } : {}) }, up.status === 429 ? 429 : 502, cors);
    }
    return new Response(up.body, { status: 200, headers: { ...cors, 'content-type': 'application/json; charset=utf-8' } });
  }
};

function imageStyle(env) {
  const s = (env.IMAGE_API_STYLE || '').trim().toLowerCase();
  if (s === 'task' || s === 'chat' || s === 'studio') return s;
  const b = env.IMAGE_API_BASE || env.API_BASE || '';
  return /1route\./i.test(b) ? 'studio' : /toapis\./i.test(b) ? 'task' : 'chat';
}

// 任務式出圖（ToAPIs 這類）：上傳照片拿網址 → 送出任務 → 每 2 秒查一次 → 把完成的圖直接轉給網頁
/* ---- 1route Studio：POST /api/v1/images/edits/jobs → GET /api/v1/images/jobs/{id} → GET .../result ---- */
const studioRoot = base => { try { return new URL(String(base).trim()).origin; } catch (e) { return 'https://api.1route.dev'; } };
function studioModel(m) {
  m = String(m || '').trim();
  if (m.includes('/')) return m;
  return (/^gemini|banana/i.test(m) ? 'google/' : 'openai/') + m;
}

async function studioImage(base, key, model, messages, env, cors, async) {
  const fail = (msg, detail, status = 502) =>
    json({ error: msg, ...(env.DEBUG === '1' && detail ? { detail: String(detail).slice(0, 300) } : {}) }, status, cors);
  const parts = messages[0].content;
  const images = parts.filter(p => p.type === 'image_url').map(p => ({ dataUrl: p.image_url.url }));
  const prompt = parts.filter(p => p.type === 'text').map(p => p.text).join('\n');
  if (!images.length) return fail('沒有收到照片', '', 400);
  const m = studioModel(model);
  const body = { model: m, prompt, images };
  if (m.startsWith('google/')) { body.resolution = '1K'; body.aspect_ratio = '1:1'; }
  else { body.size = '1K'; if (env.IMAGE_QUALITY) body.quality = env.IMAGE_QUALITY; }
  let j, r;
  try {
    r = await fetch(studioRoot(base) + '/api/v1/images/edits/jobs', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + key, 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() },
      body: JSON.stringify(body)
    });
    j = await r.json().catch(() => ({}));
  } catch (e) { return fail('AI 服務連不上，稍後再試', e.message); }
  if (!r.ok || !j.jobId) {
    const d = 'submit ' + r.status + ' ' + JSON.stringify(j);
    if (r.status === 401) return fail('AI 服務設定有誤（密鑰）', d);
    if (r.status === 429) return fail('AI 服務忙碌中，稍後再試', d, 429);
    if (r.status === 413) return fail('照片太大了', d, 413);
    return fail('AI 服務設定有誤（模型或格式）', d);
  }
  if (async) return json({ job: j.jobId }, 200, cors);
  for (let i = 0; i < 100; i++) {
    await new Promise(ok => setTimeout(ok, 2500));
    const res = await studioStatus(j.jobId, env, cors);
    if ((res.headers.get('content-type') || '').includes('json')) {
      const x = await res.clone().json().catch(() => ({}));
      if (x.pending) continue;
    }
    return res;
  }
  return fail('出圖太久了，稍後再試', 'timeout ' + j.jobId, 504);
}

async function studioStatus(id, env, cors) {
  const fail = (msg, detail, status = 502) =>
    json({ error: msg, ...(env.DEBUG === '1' && detail ? { detail: String(detail).slice(0, 300) } : {}) }, status, cors);
  const base = env.IMAGE_API_BASE || env.API_BASE, key = env.IMAGE_API_KEY || env.API_KEY;
  if (!base || !key) return fail('AI 服務還沒設定好', '', 503);
  const root = studioRoot(base), auth = { authorization: 'Bearer ' + key };
  let j;
  try {
    const r = await fetch(root + '/api/v1/images/jobs/' + encodeURIComponent(id), { headers: auth });
    j = await r.json().catch(() => ({}));
    if (r.status === 404) return fail('找不到這個出圖任務', JSON.stringify(j), 404);
    if (!r.ok) return json({ pending: true }, 200, cors); // 查詢本身暫時失敗就下一輪再問
  } catch (e) { return json({ pending: true }, 200, cors); }
  if (j.phase === 'queued' || j.phase === 'running') return json({ pending: true, phase: j.phase, queue: j.queuePosition || 0 }, 200, cors);
  if (j.phase === 'failed' || j.phase === 'cancelled') {
    const e = j.error || {};
    return fail(e.code === 'cancelled' ? '出圖已取消' : '出圖失敗，換張照片或稍後再試', JSON.stringify(e));
  }
  if (j.phase !== 'completed') return json({ pending: true }, 200, cors);
  let res;
  try {
    const r = await fetch(root + '/api/v1/images/jobs/' + encodeURIComponent(id) + '/result', { headers: auth });
    if (r.status === 410) return fail('圖片已經過期了', '', 410);
    res = await r.json();
  } catch (e) { return json({ pending: true }, 200, cors); }
  const img = res && res.images && res.images[0];
  if (!img) return fail('出圖完成但沒拿到圖片', JSON.stringify(res));
  // 有 base64 就直接包成對話格式回給網頁；網頁本來就會從裡面找 data:image
  if (img.base64) return json({ choices: [{ message: { content: 'data:' + (img.mimeType || 'image/png') + ';base64,' + img.base64 } }] }, 200, cors);
  if (img.url) {
    const same = img.url.startsWith(root);
    const r = await fetch(img.url, same ? { headers: auth } : {}).catch(() => null);
    if (r && r.ok) return new Response(r.body, { status: 200, headers: { ...cors, 'content-type': r.headers.get('content-type') || img.mimeType || 'image/png' } });
  }
  return fail('圖片下載失敗', JSON.stringify(img).slice(0, 200));
}

function imageRoot(base) {
  let root = String(base).trim().replace(/\/+$/, '').replace(/\/chat\/completions$/, '');
  if (!/\/v\d+$/.test(root)) root += '/v1'; // 地址忘了加 /v1 也能用
  return root;
}

async function jobStatus(id, env, cors) {
  const fail = (msg, detail, status = 502) =>
    json({ error: msg, ...(env.DEBUG === '1' && detail ? { detail: String(detail).slice(0, 300) } : {}) }, status, cors);
  const base = env.IMAGE_API_BASE || env.API_BASE, key = env.IMAGE_API_KEY || env.API_KEY;
  if (!base || !key) return fail('AI 服務還沒設定好', '', 503);
  let j;
  try {
    const r = await fetch(imageRoot(base) + '/images/generations/' + encodeURIComponent(id), { headers: { authorization: 'Bearer ' + key } });
    j = await r.json().catch(() => ({}));
    if (r.status === 404) return fail('找不到這個出圖任務', JSON.stringify(j), 404);
  } catch (e) { return json({ pending: true }, 200, cors); }
  const st = j.status || (j.data && j.data.status);
  if (st === 'failed') return fail('出圖失敗，換張照片或稍後再試', JSON.stringify(j.error || j.fail_reason || j));
  if (st !== 'completed') return json({ pending: true, progress: j.progress || 0 }, 200, cors);
  const outUrl = findUrl(j.result) || findUrl(j);
  if (!outUrl) return fail('出圖完成但沒拿到圖片', JSON.stringify(j));
  const r = await fetch(outUrl).catch(() => null);
  if (!r || !r.ok) return fail('圖片下載失敗', outUrl);
  const type = r.headers.get('content-type') || 'image/png';
  return new Response(r.body, { status: 200, headers: { ...cors, 'content-type': type.startsWith('image/') ? type : 'image/png' } });
}

async function taskImage(base, key, model, messages, env, cors, async) {
  const fail = (msg, detail, status = 502) =>
    json({ error: msg, ...(env.DEBUG === '1' && detail ? { detail: String(detail).slice(0, 300) } : {}) }, status, cors);
  const parts = messages[0].content;
  const img = parts.find(p => p.type === 'image_url');
  const prompt = parts.filter(p => p.type === 'text').map(p => p.text).join('\n').slice(0, 1000);
  if (!img) return fail('沒有收到照片', '', 400);
  const auth = { authorization: 'Bearer ' + key };
  const root = imageRoot(base);

  // 1. 上傳照片
  const m = img.image_url.url.match(/^data:(image\/[a-z+]+);base64,(.*)$/i);
  if (!m) return fail('照片格式不支援', '', 400);
  const bin = atob(m[2]), bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const ext = m[1].split('/')[1].replace('jpeg', 'jpg');
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: m[1] }), 'photo.' + ext);
  let photoUrl;
  try {
    const r = await fetch(root + '/uploads/images', { method: 'POST', headers: auth, body: form });
    const j = await r.json().catch(() => ({}));
    photoUrl = j && j.data && j.data.url;
    if (!r.ok || !photoUrl) return fail(r.status === 401 || r.status === 403 ? 'AI 服務設定有誤（密鑰）' : '照片上傳失敗（' + r.status + (j.message ? '，' + j.message : '') + '）', 'upload ' + r.status + ' ' + JSON.stringify(j));
  } catch (e) { return fail('AI 服務連不上，稍後再試', e.message); }

  // 2. 送出任務（文件有兩種 image_urls 寫法，第一種被拒就換第二種）
  let taskId, last = '';
  for (const urls of [[{ url: photoUrl }], [photoUrl]]) {
    try {
      const r = await fetch(root + '/images/generations', {
        method: 'POST', headers: { ...auth, 'content-type': 'application/json' },
        body: JSON.stringify({ model, prompt, n: 1, size: '1:1', image_urls: urls })
      });
      const j = await r.json().catch(() => ({}));
      taskId = j.id || j.task_id || (j.data && (j.data.id || j.data.task_id));
      if (r.ok && taskId) break;
      last = 'create ' + r.status + ' ' + JSON.stringify(j);
      taskId = null;
      if (r.status === 401 || r.status === 403) return fail('AI 服務設定有誤（密鑰）', last);
      if (r.status === 429) return fail('AI 服務忙碌中，稍後再試', last, 429);
      if (r.status !== 400 && r.status !== 422) break;
    } catch (e) { return fail('AI 服務連不上，稍後再試', e.message); }
  }
  if (!taskId) return fail('AI 服務設定有誤（模型或格式）', last);
  // 網頁要自己來查進度：直接回任務編號，這樣使用者切到別的 App 也不會斷
  if (async) return json({ job: taskId }, 200, cors);

  // 3. 等結果，最多約 2 分鐘
  let outUrl;
  for (let i = 0; i < 60 && !outUrl; i++) {
    await new Promise(r => setTimeout(r, 2000));
    try {
      const r = await fetch(root + '/images/generations/' + encodeURIComponent(taskId), { headers: auth });
      const j = await r.json().catch(() => ({}));
      const st = j.status || (j.data && j.data.status);
      if (st === 'failed') return fail('出圖失敗，換張照片或稍後再試', JSON.stringify(j.error || j.fail_reason || j));
      if (st === 'completed') {
        outUrl = findUrl(j.result) || findUrl(j);
        if (!outUrl) return fail('出圖完成但沒拿到圖片', JSON.stringify(j));
      }
    } catch (e) { /* 網路抖一下就下一輪再查 */ }
  }
  if (!outUrl) return fail('出圖太久了，稍後再試', 'timeout ' + taskId, 504);

  // 4. 把圖轉給網頁（直接串流，不在這裡轉 base64，省運算時間）
  const r = await fetch(outUrl).catch(() => null);
  if (!r || !r.ok) return fail('圖片下載失敗', outUrl);
  const type = r.headers.get('content-type') || 'image/png';
  return new Response(r.body, { status: 200, headers: { ...cors, 'content-type': type.startsWith('image/') ? type : 'image/png' } });
}

function findUrl(o) {
  if (!o) return null;
  if (typeof o === 'string') return /^https?:\/\//.test(o) ? o : null;
  if (Array.isArray(o)) { for (const x of o) { const u = findUrl(x); if (u) return u; } return null; }
  if (typeof o === 'object') {
    for (const k of ['data', 'url', 'image_url', 'images', 'output', 'urls']) if (k in o) { const u = findUrl(o[k]); if (u) return u; }
  }
  return null;
}

function originAllowed(origin, env) {
  const list = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean);
  if (!list.length) return true; // 沒設定 = 不限制（只建議測試時這樣）
  if (list.includes('*')) return true;
  return !!origin && list.includes(origin);
}

function corsHeaders(origin) {
  const h = {
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type, x-device, x-async',
    'access-control-max-age': '86400',
    vary: 'origin'
  };
  if (origin) h['access-control-allow-origin'] = origin;
  else h['access-control-allow-origin'] = '*';
  return h;
}

// 只接受一則 user 訊息，內容只能是文字和圖片，其他欄位一律丟掉
function cleanMessages(msgs) {
  if (!Array.isArray(msgs) || msgs.length !== 1) return null;
  const m = msgs[0];
  if (!m || m.role !== 'user') return null;
  let content = m.content;
  if (typeof content === 'string') content = [{ type: 'text', text: content }];
  if (!Array.isArray(content) || !content.length || content.length > MAX_IMAGES + 2) return null;
  let imgs = 0, text = 0;
  const out = [];
  for (const p of content) {
    if (p && p.type === 'text' && typeof p.text === 'string') {
      text += p.text.length;
      out.push({ type: 'text', text: p.text });
    } else if (p && p.type === 'image_url' && p.image_url && typeof p.image_url.url === 'string'
      && /^data:image\/(png|jpe?g|webp|gif);base64,/.test(p.image_url.url)) {
      imgs++;
      out.push({ type: 'image_url', image_url: { url: p.image_url.url } });
    } else return null;
  }
  if (imgs > MAX_IMAGES || text > 20000) return null;
  return [{ role: 'user', content: out }];
}

function apiURL(base, path) {
  base = String(base).trim().replace(/\/+$/, '');
  if (/\/chat\/completions$/.test(base)) base = base.replace(/\/chat\/completions$/, '');
  return base + path;
}

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers: { ...headers, 'content-type': 'application/json; charset=utf-8' } });
}
