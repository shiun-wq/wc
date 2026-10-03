/* 哇娃衣櫃 AI 後台（Cloudflare Worker）
   ------------------------------------------------------------
   App 不直接連 AI，而是把要做的事丟到這裡，由這裡帶上密鑰去問 AI。
   密鑰只存在 Cloudflare 的設定裡，使用者看不到，也不會出現在 App 裡。
   綁了 D1 資料庫之後，這裡也負責記帳：每台手機這個月用了幾次 AI、還有幾點、是不是會員。

   在 Cloudflare 後台 → 這個 Worker → Settings → Variables and Secrets 設定：
     API_BASE            API 地址，例如 https://api.example.com/v1（只填網域會自動補 /v1）（Text）
     API_KEY             API 密鑰                                          （Secret，一定要選 Secret）
     MODEL_TEXT          看圖分析用的模型                                     （Text）
     ALLOWED_ORIGINS     允許使用的網址，逗號分隔                               （Text）
                         例：https://shiun-wq.github.io,capacitor://localhost,https://localhost
     REASONING           AI 回答前「想多少」：low（預設，省錢）/ medium / high，
                         填 off = 不送這個設定（中轉站不支援時會自動改回不送）      （Text，選填）
     REDEEM_CODES        兌換碼，逗號分隔「代碼:內容」                          （Text，選填）
                         內容是數字 = 送點數；member 加天數 = 送會員幾天
                         後面再加 :數字 = 全部人加起來最多能換幾次（不寫 = 不限）
                         例：WAWA-7K3MQ9TX:20,WAWA-P4HN82CW:member30:100
                         每台手機每個代碼只能用一次；同一台手機或同一個網路一天最多輸錯 10 次
     TEST_DEVICES        測試用：這些裝置代碼直接當會員，逗號分隔                  （Text，選填）
                         裝置代碼在 App 的 設定 → 開發者模式 可以看到
     DAILY_LIMIT         每台裝置每天最多幾次，預設 30                           （Text，選填）
     GLOBAL_DAILY_LIMIT  全部人加起來每天最多幾次，預設 300                       （Text，選填）
     DEBUG               填 1 = 錯誤訊息附上中轉站的原因（查完記得刪掉）            （Text，選填）
   綁定（Settings → Bindings）：
     DB                  D1 資料庫（記帳用；沒綁的話不記帳，App 會用自己手機裡的紀錄）
     QUOTA               KV（選填，舊版的每日次數限制；有綁 DB 時改用 DB 記）

   路徑：
     GET  /health   看設定有沒有填好（不會顯示密鑰）
     GET  /account  這台手機的帳：方案、本月次數、點數、紀錄（標頭 x-device）
     POST /trial    開始免費試用（每台手機一次）
     POST /redeem   { code } 兌換點數或會員天數
     POST /ai       { task, messages }  task 是 tag / buy / wearid / idea / test
                    標頭 x-op：同一次操作（例如買前檢查會問兩次）只扣一次
                    標頭 x-points: 1：額度用完時同意改用點數
*/

const TASKS = ['tag', 'buy', 'wearid', 'idea', 'test'];
const MAX_BODY = 12 * 1024 * 1024; // 12MB，照片都已經先壓過，正常遠低於這個
const MAX_IMAGES = 10;
// 單張圖片上限：App 送的圖都先縮到最長邊 1800 以下，大約幾百 KB；擋掉不經過 App、直接送超大圖的
const MAX_IMAGE = 2.5 * 1024 * 1024;
const MAX_TOKENS = 8192;

// 每月 AI 次數和點數價格（App 畫面上的數字從 /account 拿，改這裡就好）
const QUOTA = {
  tag: { free: 10, member: 150, trial: 20 },
  buy: { free: 0, member: 30, trial: 5, memberOnly: true },
  wearid: { free: 3, member: 50, trial: 10 },
  idea: { free: 3, member: 50, trial: 10 }
};
const POINT_COST = { tag: 1, wearid: 1, buy: 3, idea: 1 };
const TRIAL_DAYS = 3;

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
        api: !!env.API_BASE, key: !!env.API_KEY, text: !!env.MODEL_TEXT,
        db: !!env.DB, limit: !!(env.DB || env.QUOTA), origins: !!(env.ALLOWED_ORIGINS || '').trim(),
        codes: codeList(env).length
      }, 200, cors);
    }

    if (!allowed) return json({ error: '這個網址沒有被允許使用 AI' }, 403, cors);
    const device = deviceOf(req);

    // ---- 帳戶 ----
    if (url.pathname === '/account' && req.method === 'GET') {
      if (!env.DB) return json({ error: '後台還沒綁資料庫' }, 404, cors);
      if (!device) return json({ error: '缺少裝置代碼' }, 400, cors);
      const a = await getAcct(env, device);
      return json({ ...view(env, a), log: await ledger(env, device) }, 200, cors);
    }
    if (url.pathname === '/trial' && req.method === 'POST') {
      if (!env.DB) return json({ error: '後台還沒綁資料庫' }, 404, cors);
      if (!device) return json({ error: '缺少裝置代碼' }, 400, cors);
      const a = await getAcct(env, device);
      if (a.trial_start) return json({ error: '免費試用已經用過了', ...view(env, a) }, 409, cors);
      a.trial_start = Date.now();
      await env.DB.prepare('UPDATE accounts SET trial_start=? WHERE device=?').bind(a.trial_start, device).run();
      return json(view(env, a), 200, cors);
    }
    if (url.pathname === '/redeem' && req.method === 'POST') {
      if (!env.DB) return json({ error: '後台還沒綁資料庫' }, 404, cors);
      if (!device) return json({ error: '缺少裝置代碼' }, 400, cors);
      await dbInit(env);
      // 防亂猜：同一台手機、同一個網路，一天輸錯 10 次就暫停到隔天
      const day = today8(), ip = req.headers.get('cf-connecting-ip') || '';
      const keys = ['d:' + device, ...(ip ? ['ip:' + ip] : [])];
      for (const k of keys) {
        const f = await env.DB.prepare('SELECT n FROM fails WHERE k=? AND day=?').bind(k, day).first();
        if (f && f.n >= 10) return json({ error: '今天輸錯太多次了，明天再試' }, 429, cors);
      }
      let code = '';
      try { code = String((await req.json()).code || '').trim().toUpperCase().slice(0, 40); } catch (e) {}
      const hit = codeList(env).find(c => c.code === code);
      if (!hit) {
        await env.DB.batch(keys.map(k => env.DB.prepare('INSERT INTO fails(k,day,n) VALUES(?,?,1) ON CONFLICT(k) DO UPDATE SET n=CASE WHEN day=excluded.day THEN n+1 ELSE 1 END, day=excluded.day').bind(k, day)));
        return json({ error: '兌換碼不正確' }, 404, cors);
      }
      const a = await getAcct(env, device);
      if (a.codes.includes(code)) return json({ error: '這個兌換碼已經用過了' }, 409, cors);
      // 總次數上限：全部人加起來換滿就失效（有人一直重裝 App 也只能吃掉這些次數）
      if (hit.max) {
        const u = await env.DB.prepare('SELECT n FROM code_uses WHERE code=?').bind(code).first();
        if (u && u.n >= hit.max) return json({ error: '這個兌換碼已經被換完了' }, 410, cors);
      }
      await env.DB.prepare('INSERT INTO code_uses(code,n) VALUES(?,1) ON CONFLICT(code) DO UPDATE SET n=n+1').bind(code).run();
      a.codes.push(code);
      if (hit.days) {
        // 會員天數：還是會員的話接在後面加
        a.member_until = Math.max(Date.now(), a.member_until || 0) + hit.days * 864e5;
        await env.DB.batch([
          env.DB.prepare('UPDATE accounts SET member_until=?, codes=? WHERE device=?').bind(a.member_until, JSON.stringify(a.codes), device),
          env.DB.prepare('INSERT INTO ledger(device,t,n,why) VALUES(?,?,?,?)').bind(device, Date.now(), 0, `兌換碼 ${code}：會員 ${hit.days} 天`)
        ]);
      } else await addPoints(env, a, hit.pts, `兌換碼 ${code}`, true);
      return json({ ...view(env, a), added: hit.pts || 0, days: hit.days || 0, log: await ledger(env, device) }, 200, cors);
    }

    if (url.pathname !== '/ai' || req.method !== 'POST') return json({ error: '找不到這個功能' }, 404, cors);
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
    if (messages === 'big') return json({ error: '照片太大了' }, 413, cors);
    if (!messages) return json({ error: '格式錯誤' }, 400, cors);
    // 測試連線不算次數，所以只准一小段文字
    if (task === 'test' && (messages[0].content.length !== 1 || messages[0].content[0].type !== 'text' || messages[0].content[0].text.length > 100))
      return json({ error: '格式錯誤' }, 400, cors);

    // ---- 查帳：這次要用額度、用點數，還是不給問 ----
    let a = null, pay = '', op = '';
    if (env.DB) {
      if (!device) return json({ error: '缺少裝置代碼' }, 400, cors);
      a = await getAcct(env, device);
      const day = today8();
      if (a.day !== day) { a.day = day; a.day_n = 0; }
      const perDevice = +env.DAILY_LIMIT || 30, global = +env.GLOBAL_DAILY_LIMIT || 300;
      if (task !== 'test') {
        const g = await env.DB.prepare('SELECT n FROM stats WHERE day=?').bind(day).first();
        if (g && g.n >= global) return json({ error: '今天大家用得太兇，AI 休息一下，明天再來' }, 429, cors);
        if (a.day_n >= perDevice && tierOf(env, a, device) !== 'member') return json({ error: '今天的 AI 次數用完了，明天再試' }, 429, cors);
        op = String(req.headers.get('x-op') || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
        const done = op && await env.DB.prepare('SELECT 1 FROM ops WHERE device=? AND op=?').bind(device, op).first();
        if (!done) {
          const tier = tierOf(env, a, device), q = QUOTA[task];
          if (q.memberOnly && tier === 'free') return json({ error: '這是會員功能', code: 'member', ...view(env, a) }, 403, cors);
          const left = (q[tier] || 0) - (a.used[task] || 0);
          if (left > 0) pay = 'quota';
          else if (req.headers.get('x-points') === '1' && a.points >= POINT_COST[task]) pay = 'points';
          else return json({ error: `本月的次數用完了`, code: a.points >= POINT_COST[task] ? 'points' : 'quota', ...view(env, a) }, 402, cors);
        }
      }
    } else if (env.QUOTA && task !== 'test') {
      // 舊版：只有 KV 的話，只做每天的次數限制
      const dev = device || 'anon', day = today8();
      const perDevice = +env.DAILY_LIMIT || 30, global = +env.GLOBAL_DAILY_LIMIT || 300;
      const dKey = `d:${day}:${dev}`, gKey = `g:${day}`;
      const [dUsed, gUsed] = await Promise.all([env.QUOTA.get(dKey), env.QUOTA.get(gKey)]).then(r => r.map(v => +v || 0));
      if (gUsed >= global) return json({ error: '今天大家用得太兇，AI 休息一下，明天再來' }, 429, cors);
      if (dUsed >= perDevice) return json({ error: '今天的 AI 次數用完了，明天再試' }, 429, cors);
      await Promise.all([
        env.QUOTA.put(dKey, String(dUsed + 1), { expirationTtl: 172800 }),
        env.QUOTA.put(gKey, String(gUsed + 1), { expirationTtl: 172800 })
      ]);
    }

    // 會思考的模型（Gemini 3 等）先「想」再回答，想的字也算錢；App 要的只是一小段整理好的資料，叫它少想一點
    const effort = String(env.REASONING || 'low').trim().toLowerCase();
    const ask = withEffort => fetch(apiURL(env.API_BASE, '/chat/completions'), {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + env.API_KEY },
      // 測試也給多一點字數：會思考的模型先想一下才回答，太少會回空的
      body: JSON.stringify({ model: env.MODEL_TEXT, max_tokens: task === 'test' ? 1024 : MAX_TOKENS, stream: false, messages,
        ...(withEffort ? { reasoning_effort: effort } : {}) })
    });
    let up;
    try {
      const useEffort = effort !== 'off' && effort !== '';
      up = await ask(useEffort);
      // 中轉站或模型不接受這個設定（400／422）：拿掉再問一次
      if (useEffort && (up.status === 400 || up.status === 422)) up = await ask(false);
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
    // 中轉站回了網頁（不是 AI 的回應）：通常是 API_BASE 填錯，沒有填到 /v1
    if (/text\/html/i.test(up.headers.get('content-type') || '')) {
      const t = await up.text().catch(() => '');
      return json({ error: 'AI 服務設定有誤（網址，API_BASE 要填到 /v1）', ...(env.DEBUG === '1' ? { detail: t.slice(0, 300) } : {}) }, 502, cors);
    }
    const out = await up.text();

    // ---- 問成功了才記帳 ----
    const h = { ...cors, 'content-type': 'application/json; charset=utf-8' };
    if (a) {
      if (task !== 'test') {
        a.day_n++;
        if (pay === 'quota') a.used[task] = (a.used[task] || 0) + 1;
        if (pay === 'points') await addPoints(env, a, -POINT_COST[task], NAMES[task], false);
        await env.DB.batch([
          env.DB.prepare('UPDATE accounts SET used=?, month=?, points=?, day=?, day_n=? WHERE device=?')
            .bind(JSON.stringify(a.used), a.month, a.points, a.day, a.day_n, device),
          env.DB.prepare('INSERT INTO stats(day,n) VALUES(?,1) ON CONFLICT(day) DO UPDATE SET n=n+1').bind(a.day),
          ...(op && pay ? [env.DB.prepare('INSERT OR IGNORE INTO ops(device,op,t) VALUES(?,?,?)').bind(device, op, Date.now())] : [])
        ]);
      }
      h['x-acct'] = encodeURIComponent(JSON.stringify(view(env, a)));
    }
    return new Response(out, { status: 200, headers: h });
  }
};

const NAMES = { tag: 'AI 建檔分析', buy: '買前檢查', wearid: '穿搭照辨識', idea: 'AI 搭配建議' };

// ---- 記帳用的小工具 ----
let dbReady = false;
async function dbInit(env) {
  if (dbReady) return;
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS accounts (device TEXT PRIMARY KEY, points INTEGER NOT NULL DEFAULT 0,
      month TEXT, used TEXT, trial_start INTEGER, codes TEXT, member_until INTEGER, day TEXT, day_n INTEGER DEFAULT 0, created INTEGER)`),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS ledger (id INTEGER PRIMARY KEY AUTOINCREMENT, device TEXT, t INTEGER, n INTEGER, why TEXT)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS ledger_dev ON ledger(device, t)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS ops (device TEXT, op TEXT, t INTEGER, PRIMARY KEY(device, op))'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS stats (day TEXT PRIMARY KEY, n INTEGER)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS fails (k TEXT PRIMARY KEY, day TEXT, n INTEGER)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS code_uses (code TEXT PRIMARY KEY, n INTEGER)')
  ]);
  dbReady = true;
}
// 台灣時間（UTC+8）的今天、這個月
const today8 = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
const month8 = () => today8().slice(0, 7);

function deviceOf(req) {
  const d = String(req.headers.get('x-device') || '');
  return /^[a-zA-Z0-9_-]{8,64}$/.test(d) ? d : '';
}
async function getAcct(env, device) {
  await dbInit(env);
  let r = await env.DB.prepare('SELECT * FROM accounts WHERE device=?').bind(device).first();
  if (!r) {
    r = { device, points: 0, month: month8(), used: '{}', trial_start: null, codes: '[]', member_until: null, day: '', day_n: 0, created: Date.now() };
    await env.DB.prepare('INSERT OR IGNORE INTO accounts(device,points,month,used,codes,day,day_n,created) VALUES(?,?,?,?,?,?,?,?)')
      .bind(device, 0, r.month, '{}', '[]', '', 0, r.created).run();
  }
  const a = { ...r, used: safeJSON(r.used, {}), codes: safeJSON(r.codes, []) };
  // 每月 1 號（台灣時間）重置次數
  if (a.month !== month8()) { a.month = month8(); a.used = {}; }
  return a;
}
const safeJSON = (s, d) => { try { return JSON.parse(s) || d; } catch (e) { return d; } };
function tierOf(env, a, device) {
  const test = String(env.TEST_DEVICES || '').split(',').map(s => s.trim()).filter(Boolean);
  if (test.includes(device || a.device) || (a.member_until && a.member_until > Date.now())) return 'member';
  if (a.trial_start && Date.now() < a.trial_start + TRIAL_DAYS * 864e5) return 'trial';
  return 'free';
}
function view(env, a) {
  const tier = tierOf(env, a);
  const limits = Object.fromEntries(Object.entries(QUOTA).map(([k, q]) => [k, q[tier] || 0]));
  return { tier, month: a.month, used: a.used, limits, points: a.points, cost: POINT_COST,
    trialUsed: !!a.trial_start, trialEnd: a.trial_start ? a.trial_start + TRIAL_DAYS * 864e5 : null, memberUntil: a.member_until || null };
}
async function addPoints(env, a, n, why, save) {
  a.points = Math.max(0, a.points + n);
  const st = [env.DB.prepare('INSERT INTO ledger(device,t,n,why) VALUES(?,?,?,?)').bind(a.device, Date.now(), n, why)];
  if (save) st.push(env.DB.prepare('UPDATE accounts SET points=?, codes=? WHERE device=?').bind(a.points, JSON.stringify(a.codes), a.device));
  await env.DB.batch(st);
}
async function ledger(env, device) {
  const r = await env.DB.prepare('SELECT t,n,why FROM ledger WHERE device=? ORDER BY t DESC LIMIT 40').bind(device).all();
  return r.results || [];
}
function codeList(env) {
  return String(env.REDEEM_CODES || '').split(/[,，]/).map(s => s.trim()).filter(Boolean).map(s => {
    const [c, p, mx] = s.split(/[:：]/), v = String(p || '').trim().toLowerCase(), m = v.match(/^member\s*(\d+)$/);
    return { code: String(c || '').trim().toUpperCase(), pts: m ? 0 : Math.max(0, parseInt(v) || 0), days: m ? Math.min(3650, +m[1]) : 0,
      max: Math.max(0, parseInt(mx) || 0) };
  }).filter(c => c.code && (c.pts || c.days));
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
    'access-control-allow-headers': 'content-type, x-device, x-op, x-points',
    'access-control-expose-headers': 'x-acct',
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
      if (p.image_url.url.length > MAX_IMAGE) return 'big';
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
  // 只填了網域（例如 https://xxx.com）：自動補上 /v1，大部分中轉站都是這樣
  try { if (/^\/?$/.test(new URL(base).pathname)) base += '/v1'; } catch (e) {}
  return base + path;
}

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers: { ...headers, 'content-type': 'application/json; charset=utf-8' } });
}
