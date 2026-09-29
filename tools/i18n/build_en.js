const fs=require('fs'),D=__dirname;
const S=JSON.parse(fs.readFileSync(D+'/strings.json','utf8'));
const map={};let bad=[],skip=0,missing=[];
const got={};
for(let k=0;k<8;k++)for(const line of fs.readFileSync(D+`/en_${k}.tsv`,'utf8').split('\n')){
  if(!line.trim())continue;const i=line.indexOf('\t');if(i<0){bad.push('notab:'+line);continue}
  got[+line.slice(0,i)]=line.slice(i+1);
}
S.forEach((zh,i)=>{const en=got[i];if(en==null){missing.push(i);return}
  if(/[㐀-鿿]/.test(en)&&!/[A-Za-z]/.test(en)){skip++;return}
  const ph=s=>(s.match(/\{\d\}/g)||[]).sort().join();
  if(ph(zh)!==ph(en)){bad.push(i+' '+zh+' => '+en);return}
  map[zh]=en.replace(/\\n/g,'\n');
});
Object.assign(map,JSON.parse(fs.readFileSync(D+'/extra_en.json','utf8')));
console.error('entries',Object.keys(map).length,'skip',skip,'missing',missing.length,missing.slice(0,20),'bad',bad.length);bad.slice(0,40).forEach(b=>console.error(b));
fs.writeFileSync(require('path').join(__dirname,'..','..','i18n','en.js'),'/* English for 哇娃衣櫃 — generated; keys are the original Traditional Chinese UI text. */\nwindow.I18N={map:'+JSON.stringify(map)+'};\n');
