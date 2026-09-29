// 把網站檔案複製到 www/，給 App 用（npx cap sync 會把 www/ 放進 iOS／Android 專案）
// 用法：npm run build（或 npm run sync：複製完順便同步到原生專案）
const fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..'),OUT=path.join(ROOT,'www');
// App 需要的檔案；doll-wardrobe.html、sw.js、server/、tools/、docs/ 不用放進 App
const FILES=['index.html','version.json','manifest.webmanifest','favicon.ico'];
const DIRS=['i18n','maps','help','icons'];
fs.rmSync(OUT,{recursive:true,force:true});
fs.mkdirSync(OUT,{recursive:true});
for(const f of FILES)fs.copyFileSync(path.join(ROOT,f),path.join(OUT,f));
for(const d of DIRS)fs.cpSync(path.join(ROOT,d),path.join(OUT,d),{recursive:true});
let n=0,size=0;
(function walk(p){for(const e of fs.readdirSync(p,{withFileTypes:true})){const q=path.join(p,e.name);if(e.isDirectory())walk(q);else{n++;size+=fs.statSync(q).size}}})(OUT);
console.log(`www/ 準備好了：${n} 個檔案，${(size/1048576).toFixed(1)} MB`);
