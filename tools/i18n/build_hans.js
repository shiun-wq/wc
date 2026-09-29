const fs=require('fs'),OpenCC=require('opencc-js');
const tw2cn=OpenCC.Converter({from:'twp',to:'cn'}),c2=OpenCC.Converter({from:'tw',to:'cn'});
const strs=require(__dirname+'/strings.json');
// 娃圈用語：台灣說法 → 大陸說法（OpenCC 沒有的）
const FIX=[['團主','团长'],['团主','团长'],['私生','私生'],['娃衣屋','娃衣店'],['壓箱底','压箱底'],['手作娘','手作娘']];
const map={};let changed=0;
for(const s of strs){let t=tw2cn(s);FIX.forEach(([a,b])=>{t=t.split(a).join(b)});if(t!==s){map[s]=t;changed++}}
// 單字對照：使用者自己打的字（名字、備註）也轉成簡體
const chars={};
for(let c=0x4E00;c<=0x9FFF;c++){const ch=String.fromCharCode(c),t=c2(ch);if(t!==ch&&t.length===1)chars[ch]=t}
const out='/* 簡體中文：由 OpenCC（台灣正體 → 大陸簡體，含用語）產生，見 i18n/README.md */\nwindow.I18N='+JSON.stringify({map,chars})+';\n';
fs.writeFileSync(require('path').join(__dirname,'..','..','i18n','hans.js'),out);
console.log('strings changed',changed,'chars',Object.keys(chars).length,'bytes',out.length);
