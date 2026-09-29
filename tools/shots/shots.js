// 用示範資料（使用者的娃娃）產生說明頁截圖，存到 repo 的 help/
const {chromium}=require(require('child_process').execSync('npm root -g').toString().trim()+'/playwright');
const fs=require('fs'),SP=__dirname,OUT=require('path').join(__dirname,'..','..','help')+'/';
const D=JSON.parse(fs.readFileSync(SP+'/dolls.json'));
const C=require('./clothes.js');
const TRIP={};for(const n of ['wt_flower','lz10_camellia','small_cafe','lz_rock'])TRIP[n]='data:image/jpeg;base64,'+fs.readFileSync(SP+'/trip/'+n+'.jpg').toString('base64');
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({locale:'zh-TW',viewport:{width:390,height:844},deviceScaleFactor:2,serviceWorkers:'block'});
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{const T=new Date('2026-12-24T10:00:00+08:00').getTime(),R=Date;
    class F extends R{constructor(...a){a.length?super(...a):super(T)}static now(){return T}};window.Date=F});
  await p.goto('http://localhost:8772/');await p.waitForTimeout(800);
  // 說明截圖不能出現「有新版本」的提示
  await p.addStyleTag({content:'.updbar{display:none!important}'});await p.evaluate(()=>{window.checkUpdate=()=>{};document.querySelectorAll('.updbar').forEach(e=>e.remove())});
  await p.click('.welcome button:text-is("開始使用")').catch(()=>{});
  await p.evaluate(async ({D,C,T})=>{
    const dl=(id,name,size,photo,o)=>Object.assign({id,name,size,photo,raw:photo,createdAt:Date.now()-864e5*300,src:'官方',attr:'none'},o);
    S.dolls=[
      dl('wt','尉霆','20cm',D.weiting,{home:'2025-12-24',pin:true,
        outs:['2026-12-06','2026-09-20','2026-08-15','2026-05-01','2026-04-06','2026-01-07'],
        outPlaces:{'2026-12-06':{c:'台灣',r:'台北市',n:'大稻埕'},'2026-09-20':{c:'台灣',r:'新北市',n:'九份'},'2026-08-15':{c:'台灣',r:'台中市',n:'審計新村'},'2026-04-06':{c:'日本',r:'',n:'花田'},'2026-05-01':{c:'台灣',r:'高雄市',n:'駁二'},'2026-01-07':{c:'台灣',r:'台北市',n:'生日咖啡廳'}},
        dates:[{id:'b1',label:'生日',md:'01-07'}]}),
      dl('lz','梁湛','20cm',D.liangzhan,{home:'2025-11-19',pin:true,outs:['2026-12-06','2026-09-20','2026-07-07'],
        outPlaces:{'2026-12-06':{c:'台灣',r:'台北市',n:'大稻埕'},'2026-09-20':{c:'台灣',r:'新北市',n:'九份'},'2026-07-07':{c:'台灣',r:'台北市',n:'生日下午茶'}},
        dates:[{id:'b2',label:'生日',md:'07-07'}],
        care:[{id:'c1',type:'換骨架',date:'2026-12-10',note:'想讓他坐得更挺',who:'手作娘',maker:'小熊手作',eta:'2027-01-20',status:'處理中',sentDate:'2026-12-12'},{id:'c2',type:'弄髒',date:'2026-12-20',note:'臉頰沾到咖啡',who:'自己',maker:'',eta:'',status:'待處理'},{id:'c3',type:'清洗',date:'2026-08-01',note:'手洗、陰乾',who:'自己',maker:'',eta:'',status:'完成',doneDate:'2026-08-02'},{id:'c4',type:'裝磁鐵',date:'2026-03-01',note:'手掌裝磁鐵，可以拿小道具',who:'手作娘',maker:'小熊手作',eta:'',status:'完成',sentDate:'2026-03-03',doneDate:'2026-03-20'}],
        acc:[{id:'a1',name:'眼鏡',state:'在身上',note:''},{id:'a2',name:'領結',state:'收起來',note:''}]}),
      dl('wt10','小尉霆','10cm',D.weiting10,{home:'2025-12-24',pin:true,dates:[{id:'b3',label:'生日',md:'01-07'}],outs:['2026-04-07'],outPlaces:{'2026-04-07':{c:'日本',r:'',n:'咖啡廳'}}}),
      dl('lz10','小梁湛','10cm',D.liangzhan10,{home:'2026-02-02',pin:true,dates:[{id:'b4',label:'生日',md:'07-07'}],outs:['2026-04-06','2026-04-07'],outPlaces:{'2026-04-06':{c:'日本',r:'',n:'山茶花'},'2026-04-07':{c:'日本',r:'',n:'咖啡廳'}}})
    ];
    S.settings.mainDoll='wt';
    Object.assign(S.settings,{guideHide:true,lastBackup:Date.now(),installHide:true,member:true,welcomed:true,theme:'light',homeCountry:'台灣',annOn:true,holOn:false});
    // 示範娃衣：自己畫的衣服轉成貼圖＋使用者照片裡的娃衣（只有名稱、標註店家）
    const toPng=svg=>new Promise(r=>{const im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=im.width;c.height=im.height;c.getContext('2d').drawImage(im,0,0);r(c.toDataURL('image/png'))};im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)});
    S.items=[];let t=Date.now();
    for(const [k,c] of Object.entries(C)){const st=await makeSticker(await toPng(c.svg),8);S.items.push({id:'c_'+k,name:c.name,category:c.category,cutout:st,photo:st,colors:c.colors,styles:c.styles,motifs:c.motifs,sizes:['20cm'],createdAt:t--,price:String([420,380,260,450,300,520,120][S.items.length]||300),buyDate:'2026-12-15'})}
    const bi=(id,name,cat,brand,sz)=>({id,name,category:cat,brand,shop:brand,sizes:[sz],colors:[],styles:[],motifs:[],createdAt:Date.now()-864e5*200});
    S.items.push(bi('b_black','光影・黑','外套','帕帕斯','20cm'),bi('b_fox','狐耳摩斯','帽子','棉花星球','10cm'),bi('b_L','字母上衣 L','上衣','魚譜','10cm'),bi('b_W','字母上衣 W','上衣','魚譜','10cm'),bi('b_rock','搖滾狂想曲','外套','方塊兒日記','20cm'),bi('b_hp','耳機','配件','夾心芝麻堡','20cm'));
    S.wears=[
      {id:'w_flower',date:'2026-04-06',dollId:'wt',dollName:'尉霆',itemIds:['b_black'],photo:T.wt_flower,place:'出門',spot:{c:'日本',r:'',n:'花田'}},
      {id:'w_cam',date:'2026-04-06',dollId:'lz10',dollName:'小梁湛',itemIds:['b_fox'],photo:T.lz10_camellia,place:'出門',spot:{c:'日本',r:'',n:'山茶花'}},
      {id:'w_cafe1',date:'2026-04-07',dollId:'lz10',dollName:'小梁湛',itemIds:['b_L'],photo:T.small_cafe,place:'出門',spot:{c:'日本',r:'',n:'咖啡廳'}},
      {id:'w_cafe2',date:'2026-04-07',dollId:'wt10',dollName:'小尉霆',itemIds:['b_W'],photo:T.small_cafe,place:'出門',spot:{c:'日本',r:'',n:'咖啡廳'}},
      {id:'w_rock',date:'2026-12-20',dollId:'lz',dollName:'梁湛',itemIds:['b_rock','b_hp'],photo:T.lz_rock,place:'在家'}
    ];
    await save();applyTheme();go('home');
  },{D,C,T:TRIP});
  await p.waitForTimeout(800);
  const ONLY=process.env.ONLY?process.env.ONLY.split(','):null,want=n=>!ONLY||ONLY.includes(n);
  const shot=async(name,clip)=>{if(!want(name))return;clip=Object.assign({x:0,y:0},clip||{});clip.width=390;clip.height=700;clip.y=Math.min(clip.y,144);await p.waitForTimeout(700);await p.screenshot({path:OUT+name+'.jpg',type:'jpeg',quality:78,clip:clip||{x:0,y:0,width:390,height:700}});console.log('saved',name)};
  // 1 首頁
  await p.evaluate(()=>window.scrollTo(0,0));await shot('doll-home');
  // 2 娃娃櫃
  await p.evaluate(()=>{go('dolls')});await p.waitForTimeout(500);await shot('doll-cabinet');
  // 3 娃娃頁
  await p.evaluate(()=>openDoll('wt'));await p.waitForTimeout(700);await shot('doll-page',{x:0,y:80,width:390,height:700});
  await p.evaluate(()=>dollEdit());await p.waitForTimeout(600);await shot('doll-edit',{x:0,y:80,width:390,height:700});
  await p.evaluate(()=>dollPageBack());await p.waitForTimeout(500);
  // 足跡（娃娃的足跡頁）
  await p.evaluate(()=>{window.scrollTo(0,0);openDollFoot('wt')});await p.waitForTimeout(1200);
  await shot('foot-doll',{x:0,y:0});
  await p.evaluate(()=>go('dolls'));await p.waitForTimeout(300);
  // 整理與配件（梁湛）
  await p.evaluate(()=>{closeSheet();openDoll('lz')});await p.waitForTimeout(700);
  await p.evaluate(()=>{const el=[...document.querySelectorAll('#sheetBody .care')].find(x=>x.textContent.includes('狀況與整理'));el.scrollIntoView({block:'start'});document.querySelector('#sheet .panel').scrollTop-=20});
  await p.waitForTimeout(800);await shot('doll-care',{x:0,y:80,width:390,height:700});
  // 紀念小卡
  const card=await p.evaluate(async()=>{closeSheet();openAnnCard(annKey(dollAnniv().find(a=>a.d.id==='wt'&&a.kind==='year')));await new Promise(r=>setTimeout(r,300));SC.lay='classic';SC.theme='cream';SC.ratio='post';SC.cap='謝謝你來到我身邊';const c=await scDraw();closeSheet();return c.toDataURL('image/jpeg',.82)});
  if(want('doll-card'))fs.writeFileSync(OUT+'doll-card.jpg',Buffer.from(card.split(',')[1],'base64'));if(want('doll-card'))console.log('saved doll-card');
  // 娃娃櫃的足跡地圖
  await p.evaluate(()=>{UI.dollTab='foot';go('dolls');window.scrollTo(0,0)});await p.waitForTimeout(1500);await p.evaluate(()=>{const e=document.querySelector('#dollList .mh');window.scrollTo(0,e.getBoundingClientRect().top+scrollY-70)});
  await shot('foot-map',{x:0,y:60,width:390,height:700});
  // 相簿：在地圖上點日本
  await p.evaluate(()=>{window.scrollTo(0,0);openAlbum(null,'日本・去過 4 次',placePhotos('world','日本'))});await p.waitForTimeout(900);
  await shot('album',{x:0,y:0});
  await p.evaluate(()=>{closeSheet();UI.dollTab='doll';renderDolls()});
  const saveCanvas=async(name,fn)=>{if(!want(name))return;const u=await p.evaluate(fn);fs.writeFileSync(OUT+name+'.jpg',Buffer.from(u.split(',')[1],'base64'));console.log('saved',name)};
  // 衣櫃
  await p.evaluate(()=>{window.scrollTo(0,0);go('closet')});await p.waitForTimeout(600);await shot('closet');
  // 建檔：一張照片在建檔清單
  await p.evaluate(async()=>{
    const bgPhoto=async(id)=>{const it=S.items.find(x=>x.id===id),im=await loadImg(it.cutout),c=document.createElement('canvas');c.width=900;c.height=900;const x=c.getContext('2d');
      const g=x.createLinearGradient(0,0,900,900);g.addColorStop(0,'#D9C3A5');g.addColorStop(1,'#C7AC8A');x.fillStyle=g;x.fillRect(0,0,900,900);
      for(let i=0;i<40;i++){x.strokeStyle='rgba(120,90,60,.12)';x.beginPath();x.moveTo(0,i*24);x.bezierCurveTo(300,i*24+20,600,i*24-20,900,i*24);x.stroke()}
      const s=Math.min(700/im.width,700/im.height);x.shadowColor='rgba(0,0,0,.25)';x.shadowBlur=20;x.drawImage(im,450-im.width*s/2,450-im.height*s/2,im.width*s,im.height*s);return c.toDataURL('image/jpeg',.85)};
    window._skirtPhoto=await bgPhoto('c_skirt');
    UI.queue=[{qid:'q1',photo:await bgPhoto('c_sweater'),cutout:S.items.find(x=>x.id==='c_sweater').cutout,name:'奶油色麻花針織上衣',category:'上衣',isSet:false,parts:[],sizes:['20cm'],colors:['米白色'],styles:[{name:'日常'},{name:'森系'}],motifs:[],season:'',material:''},
      {qid:'q2',photo:window._skirtPhoto,cutout:null,name:'',category:'裙子',isSet:false,parts:[],sizes:['20cm'],colors:[],styles:[],motifs:[],season:'',material:''}];
    go('intake');renderQueue();});
  await p.waitForTimeout(500);
  await p.evaluate(()=>window.scrollTo(0,0));await shot('intake',{x:0,y:0,width:390,height:800});
  // 貼圖編輯器（手動去背）
  await p.evaluate(()=>{window._tp=tapCutout(window._skirtPhoto,{brush:true,title:'去背　紅格紋百褶裙'}).catch(()=>{})});await p.waitForTimeout(900);
  await p.evaluate(async()=>{
    const im=await loadImg(S.items.find(x=>x.id==='c_skirt').cutout),c=document.createElement('canvas');c.width=TAP.W;c.height=TAP.H;const x=c.getContext('2d');
    const s=Math.min(700/im.width,700/im.height)*TAP.W/900;x.drawImage(im,TAP.W/2-im.width*s/2,TAP.H/2-im.height*s/2,im.width*s,im.height*s);
    const d=x.getImageData(0,0,TAP.W,TAP.H).data,a=new Uint8ClampedArray(TAP.W*TAP.H);for(let i=0;i<a.length;i++)a[i]=d[i*4+3];
    tapPush();TAP.a=a;tapDraw();const l=document.getElementById('tapload');if(l)l.remove();tapZoomBy(1.3);const t=document.getElementById('toast');t.classList.remove('on');clearTimeout(t._)});
  await p.waitForTimeout(500);await shot('editor',{x:0,y:0,width:390,height:844});
  await p.evaluate(()=>closeSheet());await p.waitForTimeout(300);
  // 搭配畫布
  await p.evaluate(()=>{go('studio');UI.canvas=[{dollId:'wt',x:50,y:58,scale:230,rot:0},{itemId:'c_beret',x:52,y:29,scale:125,rot:-8},{itemId:'c_sweater',x:50,y:75,scale:128,rot:0},{itemId:'c_shoes',x:50,y:94,scale:128,rot:0}];UI.selPc=null;renderCanvas();window.scrollTo(0,0)});
  await p.waitForTimeout(600);await shot('studio');
  // 穿搭紀錄
  await p.evaluate(()=>{go('wear');renderWears();window.scrollTo(0,0)});await p.waitForTimeout(600);await shot('wear-list');
  await saveCanvas('wear-card',async()=>{openShare('wear','w_flower');SC.lay='polaroid';SC.theme='cream';SC.ratio='post';SC.cap='';const c=await scDraw();closeSheet();return c.toDataURL('image/jpeg',.82)});
  // 出售貼文
  await saveCanvas('sell-card',async()=>{openSell(['c_dress','c_skirt','c_beret','c_socks']);SELL.sel=new Set(['c_dress','c_skirt','c_beret','c_socks']);
    Object.assign(sellInfo('c_dress'),{price:'520',cond:'近全新'});Object.assign(sellInfo('c_skirt'),{price:'380'});Object.assign(sellInfo('c_beret'),{price:'260'});Object.assign(sellInfo('c_socks'),{price:'120',cond:'全新未拆'});
    SELL.lay='grid';SELL.show={brand:true,tags:true,shop:false,origin:false,buy:false,env:['無菸環境','無寵物']};await makeSell();const c=SELL.canvases[0];closeSheet();return c.toDataURL('image/jpeg',.82)});
  // 買前檢查：想買一件草莓洋裝 → 衣櫃裡幾乎一樣的排最前面
  await p.evaluate(async()=>{closeSheet();window.scrollTo(0,0);go('home');window.aiReady=()=>true;
    window.callAIImgs=async()=>JSON.stringify([{n:1,level:'same',reason:'一樣是粉色草莓圖案的連身裙，領口和蕾絲裙襬也很像'}]);
    openBuyCheck();const d=S.items.find(i=>i.id==='c_dress');BUY.photo=d.cutout;
    BUY.t={name:'草莓印花連身裙',category:'洋裝',colors:['粉色','白色'],styles:[{name:'甜系'}],motifs:['草莓','蕾絲']};await buyCompare();});
  await p.waitForTimeout(600);await p.evaluate(()=>{document.querySelector('#sheet .panel').scrollTop=0});
  await shot('buy-check',{x:0,y:80,width:390,height:700});
  // 購買中
  await p.evaluate(async()=>{closeSheet();
    const u=id=>S.items.find(i=>i.id===id).cutout;
    S.orders=[
      {id:'o1',kind:'item',name:'條紋針織背心',category:'上衣',price:'350',series:'秋日學院',brand:'棉花星球',shop:'娃衣團購',stage:'已到貨',arrived:'2026-12-22',orderDate:'2026-10-02',photo:u('c_sweater'),note:''},
      {id:'o2',kind:'item',name:'牛仔吊帶短褲',category:'褲子',price:'480',series:'秋日學院',brand:'棉花星球',shop:'娃衣團購',stage:'運送中',eta:'2026-12-28',orderDate:'2026-10-02',photo:u('c_overall'),note:''},
      {id:'o3',kind:'item',name:'焦糖色貝雷帽',category:'帽子',price:'220',shop:'二手',stage:'製作中',eta:'2027-02-10',orderDate:'2026-11-15',photo:u('c_beret'),note:''},
      {id:'o4',kind:'item',name:'毛絨小熊耳罩',category:'配件',price:'180',shop:'二手',stage:'已付款',eta:'2027-03-01',orderDate:'2026-12-01',photo:null,note:''}];
    await save();UI.wishTab='order';go('wish');window.scrollTo(0,0)});
  await p.waitForTimeout(600);await shot('orders');
  // 建檔頁的到貨提醒
  await p.evaluate(()=>{go('intake');window.scrollTo(0,0)});await shot('arrive-tip',{x:0,y:60,width:390,height:420});
  // 穿過的娃衣（首頁點穿過的比例）
  await p.evaluate(async()=>{closeSheet();const d=S.dolls.find(x=>x.id==='wt');d.styles=['日常','森系'];await save();window.scrollTo(0,0);openWorn('wt')});await p.waitForTimeout(900);
  await shot('worn',{x:0,y:0});
  // 足跡小卡
  await saveCanvas('foot-card',async()=>{openShare('foot','wt');SC.theme='cream';SC.ratio='post';SC.cap='';const c=await scDraw();closeSheet();return c.toDataURL('image/jpeg',.82)});
  // 暫時離家：小尉霆出國沒帶，3 天後回家
  await p.evaluate(async()=>{const d=S.dolls.find(x=>x.id==='wt10');d.away={reason:'出國沒帶',since:'2026-12-18',back:'2026-12-27',note:'我去東京玩，他在家等'};await save();S.settings.mainDoll='wt10';go('home');window.scrollTo(0,0)});await p.waitForTimeout(1200);
  await shot('doll-away',{x:0,y:0});
  await p.evaluate(async()=>{const d=S.dolls.find(x=>x.id==='wt10');delete d.away;S.settings.mainDoll='wt';await save();go('home')});
  // 洞察
  await p.evaluate(()=>{go('insight');window.scrollTo(0,0)});await p.waitForTimeout(1000);
  await shot('insight',{x:0,y:0});
  // 提醒與通知
  await p.evaluate(()=>{openSettings('notify')});await p.waitForTimeout(700);
  await shot('notify',{x:0,y:80});
  await p.evaluate(()=>closeSheet());
  // 備份
  await p.evaluate(()=>{openSettings('data')});await p.waitForTimeout(600);await p.evaluate(()=>{document.querySelector('#sheet .panel').style.maxHeight='none'});await shot('backup',{x:0,y:250,width:390,height:520});
  // 星星罐
  await p.evaluate(async()=>{closeSheet();const d=S.dolls.find(x=>x.id==='wt');
    d.stars=[{id:'j1',text:'第一次帶你去看花，你好上相',date:'2026-04-06',open:'now',at:'2026-04-06',opened:true,openedAt:'2026-04-06'},
      {id:'j2',text:'一年了！謝謝你陪我走過好多地方',date:'2026-01-02',open:'anniv',at:'2026-12-24',opened:false},
      {id:'j3',text:'生日要一起去吃草莓蛋糕',date:'2026-10-01',open:'d:b1',at:'2027-01-07',opened:false},
      {id:'j4',text:'明年一起去海邊吧',date:'2026-11-12',open:'date',at:'2027-07-01',opened:false}];
    const l=S.dolls.find(x=>x.id==='lz10');l.stars=[{id:'j5',text:'小小的你也要常常出門喔',date:'2026-02-02',open:'anniv',at:'2027-02-02',opened:false}];
    await save();openJar('wt');JAR.text='今天帶你去看雪了，你的圍巾好可愛';});
  await p.waitForTimeout(700);await p.evaluate(()=>{document.getElementById('jar_t').value=JAR.text});await shot('star-jar',{x:0,y:80});
  await p.evaluate(()=>{closeSheet();UI.dollTab='jar';go('dolls');window.scrollTo(0,0)});await p.waitForTimeout(600);await shot('jar-list');
  await p.evaluate(()=>{UI.dollTab='doll'});
  // 會員：方案（免費版的樣子）、我的會員
  await p.evaluate(async()=>{S.settings.member=false;S.settings.trial=null;await save();updateWalletChip();openSettings('member')});await p.waitForTimeout(700);await shot('member-plan',{x:0,y:80});
  await p.evaluate(async()=>{S.settings.member=true;await save();updateWalletChip();closeSheet();S.usage=null;usage().tag=37;usage().buy=4;usage().idea=6;openMemberHub()});await p.waitForTimeout(700);await shot('member-hub',{x:0,y:80});
  // 截圖匯入：確認畫面（示範資料）
  await p.evaluate(async()=>{closeSheet();UI.wishTab='order';go('wish');SH={shots:[],busy:false,cur:'CNY'};const its=S.items.filter(i=>i.cutout).slice(0,4);
    const pr=[89,39.9,59,45];
    SH.rows=its.map((it,k)=>({on:k<3,cancelled:k===3,name:it.name,orig:pr[k],cur:'CNY',category:it.category,size:'20cm',brand:'棉花糖工作室',shop:'棉花糖工作室',stage:k===0?'運送中':'製作中',photo:it.cutout,colors:[],styles:[],motifs:[]}));
    SH.rows.forEach(r=>r.price=fxRound(r.orig*fxRate(r.cur)));drawShot()});
  await p.waitForTimeout(800);await shot('order-shot',{x:0,y:80});
  // 年度回顧
  await p.evaluate(()=>{closeSheet();UI.insTab='vip';UI.recapY='2026';goVip('year')});await p.waitForTimeout(1200);await p.evaluate(()=>window.scrollBy(0,-24));await p.waitForTimeout(300);await shot('year-insight',{x:0,y:0});
  await saveCanvas('year-card',async()=>{openShare('year','2026');SC.theme='cream';SC.ratio='post';SC.cap='';SC.frame='none';await new Promise(r=>setTimeout(r,600));const c=await scDraw();closeSheet();return c.toDataURL('image/jpeg',.82)});
  await p.evaluate(()=>{UI.insTab='base'});
  console.log('errors',errs);await b.close();
})();
