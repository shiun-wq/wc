// 哇娃衣櫃的離線快取：沒網路也能打開，第一次載入過的字型和去背模型也會留著
const VER='wc-v5';
const SHELL=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png','./icons/favicon.png','./icons/mascot.png','./icons/logo.png'];
const RUNTIME=/^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net|storage\.googleapis\.com)\//;

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(VER).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VER).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET')return;                 // AI 呼叫等 POST 請求不經過快取
  const u=new URL(r.url);
  // 頁面本身：先拿網路上的最新版，沒網路才用快取
  // 版本檔一定要問網路，才知道有沒有新版
  if(u.origin===location.origin&&u.pathname.endsWith('/version.json'))return;
  if(r.mode==='navigate'){
    // 不用手機瀏覽器的快取，直接問伺服器最新的頁面
    e.respondWith(fetch(new Request(r.url,{cache:'no-cache',credentials:'same-origin'})).then(res=>{const cp=res.clone();caches.open(VER).then(c=>c.put('./index.html',cp));return res})
      .catch(()=>caches.match('./index.html')));
    return;
  }
  // 同網站的檔案和字型、去背模型：有快取就先用，背景再更新
  if(u.origin===location.origin||RUNTIME.test(r.url)){
    e.respondWith(caches.match(r).then(hit=>{
      const net=fetch(r).then(res=>{if(res.ok||res.type==='opaque'){const cp=res.clone();caches.open(VER).then(c=>c.put(r,cp))}return res}).catch(()=>hit);
      return hit||net;
    }));
  }
});

// 點通知就打開（或切回）哇娃衣櫃
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(ws=>{
    for(const w of ws)if('focus' in w)return w.focus();
    return clients.openWindow('./');
  }));
});
