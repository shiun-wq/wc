/* 哇娃衣櫃的多語言：繁體中文是原文；簡體中文、English 在畫面上換字。
   只換「顯示的字」，存起來的資料（類型、狀態…）一律還是原本的中文，所以切換語言不會動到資料。
   做法：字典 {原文: 譯文}，原文裡的 {0}{1} 是變數；畫面每次更新時（MutationObserver）把文字節點、
   placeholder、title 換掉；toast、confirm、分享小卡的 canvas 文字也一起換。 */
(function(){
  const V='54';
  const pick=()=>{let l='';try{l=localStorage.getItem('lang')||''}catch(e){}
    if(l&&l!=='auto')return l;
    const n=(navigator.languages&&navigator.languages[0])||navigator.language||'zh-TW';
    if(/^zh/i.test(n))return /(hans|cn|sg|my)$/i.test(n)||/zh-(cn|sg)/i.test(n)?'zh-Hans':'zh-Hant';
    return 'en'};
  const L=pick();window.LANG=L;
  document.documentElement.lang=L==='en'?'en':L==='zh-Hans'?'zh-Hans':'zh-Hant';
  window.tr=s=>s;
  if(L==='zh-Hant')return;
  document.write('<script src="i18n/'+(L==='en'?'en':'hans')+'.js?v='+V+'"><\/script>');
  const HAS=/[㐀-鿿]/;
  let exact=null,pats=null,chars=null;const cache=new Map();
  function init(){
    const D=window.I18N||{map:{}};exact=new Map();pats=[];chars=D.chars||null;
    for(const [k,v] of Object.entries(D.map||{})){
      if(!/\{\d\}/.test(k)){exact.set(k,v);const k2=k.replace(/^[。，、・；]\s*/,'');if(k2!==k&&k2&&!D.map[k2])exact.set(k2,v.replace(/^[.,;·、。，]\s*/,''));continue}
      const parts=k.split(/\{(\d)\}/),lits=[];let re='^',order=[];
      parts.forEach((p,i)=>{if(i%2){re+='([\\s\\S]*?)';order.push(+p)}else{re+=p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');if(p.trim())lits.push(p.trim())}});
      const w=lits.join('').length;pats.push({lead:/^\{\d\}/.test(k),re:new RegExp(re+'$'),lits,order,to:v,w,loose:(lits.join('').match(/[㐀-鿿]/g)||[]).length<2&&(/^\{\d\}/.test(k)||order.length>1||lits.join('')==='的')&&!/ 的$/.test(k)});
    }
    pats.sort((a,b)=>b.w-a.w);
  }
  const conv=s=>chars?s.replace(/[㐀-鿿]/g,c=>chars[c]||c):s;
  // 一整句找不到時，用「・、，」切開一段一段翻
  const SEP=/(\s*[・、，；]\s*|\s+·\s+)/;
  const AFX=/^((?:[^\p{L}\p{N}「『（(【]|\d+\.\s)*)([\s\S]*?)((?:\s*[›»…。！!：:？?]|\s+[\d.,%$＋+]+(?:\s*(?:次|件|套|天|個|點))?)*)$/u;
  const SING={countries:'country',cities:'city','cities/counties':'city/county'};
  const ONE=/(^|[^\d.,])1 (years|days|times|items|sets|countries|cities\/counties|cities|months|weeks|photos|outings|records|places|pieces|dolls|outfits|orders|pts|points)\b/g;
  const SENT=/(?<=[。！？])\s*/;
  const SEPTO={'。':'. ','！':'! ','？':'? ','・':' · ','、':', ','，':', ','；':'; ','·':' · '};
  function pat(core,depth,noLead){
    for(const p of pats){
      if(noLead&&p.lead)continue;
      if(!p.lits.every(t=>core.includes(t)))continue;
      const m=core.match(p.re);if(!m)continue;
      const g=[];p.order.forEach((n,i)=>g[n]=m[i+1]);
      const sub=g.map(x=>tr0(x||'',depth+1));
      // 字很少的樣式（像「{0}的{1}」）太容易誤套，裡面每一段都要翻得出來才用
      if(p.loose&&L==='en'&&sub.some(x=>HAS.test(x)))continue;
      return p.to.replace(/\{(\d)\}/g,(_,i)=>sub[+i]||'');
    }
    return null;
  }
  function tr1(core,depth){
    let r=exact.get(core);if(r!=null)return r;
    if(/。$/.test(core)&&(r=exact.get(core.slice(0,-1)))!=null)return r+(L==='en'?'.':'。');
    if(!/[。.]$/.test(core)&&(r=exact.get(core+'。'))!=null)return r.replace(/[.。]$/,'');
    // 開頭的 emoji、符號先拿掉再套一次（「📖 {0} 的…」）
    const pre=core.match(/^[^\p{L}\p{N}「『（(【"'$＄]+/u);
    if(pre&&(r=pat(core,depth,true))!=null)return r;
    if(pre&&pre[0].length<core.length){const rest=core.slice(pre[0].length);r=exact.get(rest);if(r==null)r=pat(rest,depth);if(r!=null)return pre[0]+r}
    r=pat(core,depth);if(r!=null)return r;
    // 前後的符號、數字先拿掉再找（「🎂 生日」「考慮中 0」「穿過的比例 ›」）
    const a=core.match(AFX);
    if(a&&(a[1]||a[3])&&a[2]&&HAS.test(a[2])){const t=tr1(a[2],depth+1);if(t!=null)return a[1]+t+(L==='en'?a[3].replace(/[。！？：]/g,c=>({'。':'.','！':'!','？':'?','：':':'})[c]):a[3])}
    if(depth<4)for(const re of [SENT,SEP]){
      if(!re.test(core.slice(0,-1)))continue;
      const parts=re===SENT?core.split(re).flatMap((x,i)=>i?[L==='en'?' ':'',x]:[x]):core.split(re);let any=false,bad=false;
      const out=parts.map((x,i)=>{
        if(i%2)return L==='en'?(SEPTO[x.trim()]??x):x;
        if(!x||(x.match(/[㐀-鿿]/g)||[]).length<2&&!/\d/.test(x))return x;const t=L==='en'?tr0(x,depth+1).trim():tr0(x,depth+1);
        if(t!==x){if((x.match(/[㐀-鿿]/g)||[]).length>1)any=true}
        else if(HAS.test(x)&&(/[「」：。？]/.test(x.replace(/[。！？]$/,''))||x.length>12))bad=true; // 沒翻到的一長句 → 不要半中半英
        return t});
      if(any&&!bad)return out.join('').trim();
      if(re===SENT)break;
    }
    return null;
  }
  function tr0(core,depth){if(!HAS.test(core))return core;const r=tr1(core,depth);return r==null?core:r}
  function tr(s){
    if(s==null)return s;s=String(s);if(!HAS.test(s))return s;
    if(!exact)init();
    const hit=cache.get(s);if(hit!==undefined)return hit;
    const lead=s.match(/^\s*/)[0],tail=s.slice(lead.length).match(/\s*$/)[0],core=s.trim().replace(/\s+/g,' ');
    let r=tr1(core,0);
    if(r==null)r=L==='zh-Hans'?conv(core):core;
    else if(L==='zh-Hans')r=conv(r);else r=r.replace(/ {2,}/g,' ').replace(ONE,(m,a,w)=>a+'1 '+(SING[w]||w.slice(0,-1)));
    r=lead+r+tail;if(cache.size>20000)cache.clear();cache.set(s,r);return r;
  }
  window.tr=tr;
  const ATTR=['placeholder','title','aria-label','alt','data-t'];
  const SKIP=/^(SCRIPT|STYLE|TEXTAREA|INPUT)$/;
  function trText(n){
    const p=n.parentNode;if(!p||SKIP.test(p.nodeName))return;
    const o=n.data;if(!HAS.test(o))return;
    if(p.closest&&p.closest('[translate=no]'))return;const t=tr(o);if(t===o)return;
    // 程式有時會讀按鈕上的字當資料：先記住原文
    if(p.nodeType===1){
      if(p.nodeName==='OPTION'&&!p.hasAttribute('value'))p.setAttribute('value',o.trim());
      if(p.childNodes.length===1)p.setAttribute('data-o',o.trim());
    }
    n.data=t;
  }
  function trEl(el){
    for(const a of ATTR){if(el.hasAttribute&&el.hasAttribute(a)){const v=el.getAttribute(a);if(HAS.test(v)){const t=tr(v);if(t!==v)el.setAttribute(a,t)}}}
  }
  function trDeep(root){
    if(root.nodeType===3)return trText(root);
    if(root.nodeType!==1||SKIP.test(root.nodeName)&&root.nodeName!=='INPUT'&&root.nodeName!=='TEXTAREA')return;
    trEl(root);if(root.nodeName==='INPUT'||root.nodeName==='TEXTAREA')return;
    const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT);let n;
    while((n=w.nextNode())){if(n.nodeType===3)trText(n);else trEl(n)}
  }
  window.trDeep=trDeep;
  function start(){
    trDeep(document.body);
    new MutationObserver(rs=>{for(const r of rs){
      if(r.type==='childList')r.addedNodes.forEach(trDeep);
      else if(r.type==='characterData')trText(r.target);
      else if(r.type==='attributes')trEl(r.target);
    }}).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:ATTR});
    document.title=tr(document.title);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
  // 對話框、通知、canvas 文字
  const oc=window.confirm.bind(window),op=window.prompt.bind(window),oa=window.alert.bind(window);
  window.confirm=m=>oc(tr(m));window.prompt=(m,d)=>op(tr(m),d);window.alert=m=>oa(tr(m));
  const C=CanvasRenderingContext2D.prototype,ft=C.fillText,st=C.strokeText,mt=C.measureText;
  C.fillText=function(t,...a){return ft.call(this,tr(t),...a)};
  C.strokeText=function(t,...a){return st.call(this,tr(t),...a)};
  C.measureText=function(t){return mt.call(this,tr(t))};
  if(window.ServiceWorkerRegistration){const sn=ServiceWorkerRegistration.prototype.showNotification;
    ServiceWorkerRegistration.prototype.showNotification=function(t,o){o=o||{};if(o.body)o.body=tr(o.body);return sn.call(this,tr(t),o)}}
  if(window.Notification){const N=window.Notification;const W=function(t,o){o=o||{};if(o.body)o.body=tr(o.body);return new N(tr(t),o)};W.permission=N.permission;W.requestPermission=N.requestPermission.bind(N);Object.defineProperty(W,'permission',{get:()=>N.permission});window.Notification=W}
})();
