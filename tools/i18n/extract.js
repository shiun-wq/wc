// 從 index.html 抽出所有會顯示的中文片段（字串、模板字串、HTML 文字、屬性），${} 換成 {0}{1}…
const fs=require('fs'),acorn=require('acorn'),walk=require('acorn-walk');
const src=fs.readFileSync(require('path').join(__dirname,'..','..','index.html'),'utf8');
const CJK=/[㐀-鿿！-～　-〿]/;
const out=new Map();const add=(t,where)=>{t=t.replace(/\s+/g,' ').trim();if(!t||!/[㐀-鿿]/.test(t))return;if(!out.has(t))out.set(t,where)};
// split on HTML tags & entities, keep text runs
// 切開 HTML：<tag ...> 裡的引號內容（例如 onclick 的 =>）不當成結束
function splitHtml(s){const texts=[],attrs=[];let i=0,cur='';
  while(i<s.length){const c=s[i];
    if(c==='<'&&/[a-zA-Z\/!]/.test(s[i+1]||'')){texts.push(cur);cur='';let q=null,tag='';i++;
      while(i<s.length){const d=s[i];if(q){if(d===q)q=null;tag+=d;i++;continue}if(d==='"'||d==="'"){q=d;tag+=d;i++;continue}if(d==='>'){i++;break}tag+=d;i++}
      (tag.match(/(?:placeholder|title|aria-label|alt|data-t)="([^"]*)"/g)||[]).forEach(a=>attrs.push(a.replace(/^[^"]*"|"$/g,'')));
      continue}
    cur+=c;i++}
  texts.push(cur);return {texts,attrs};}
function pieces(str,where){
  // also attributes inside tags
  const {texts,attrs}=splitHtml(str);attrs.forEach(a=>add(a,where+':attr'));
  texts.forEach(t=>add(t.replace(/&nbsp;/g,' '),where));
}
const scripts=[...src.matchAll(/<script>([\s\S]*?)<\/script>/g)];
let n=0;
for(const m of scripts){
  const ast=acorn.parse(m[1],{ecmaVersion:'latest',sourceType:'script'});
  walk.full(ast,node=>{
    if(node.type==='Literal'&&typeof node.value==='string'&&CJK.test(node.value))pieces(node.value,'lit');
    if(node.type==='TemplateLiteral'){
      let s='';node.quasis.forEach((q,i)=>{s+=q.value.cooked;if(i<node.expressions.length)s+='{'+i+'}'});
      if(CJK.test(s)){
        // renumber placeholders per text run
        pieces(s,'tpl');
      }
    }
  });
}
// static HTML outside scripts
const html=src.replace(/<script>[\s\S]*?<\/script>/g,'').replace(/<style>[\s\S]*?<\/style>/g,'');
pieces(html,'html');
// renumber placeholders in each entry to {0},{1}.. in order
const norm=[...out.keys()].map(t=>{let k=0;const map={};return t.replace(/\{(\d+)\}/g,(_,d)=>'{'+(map[d]??=k++)+'}')});
const PROMPT=/JSON|只回傳|回傳|規則：|格式為|你是|請判斷|請把|請搭|直接輸出圖片|不要陰影|去掉背景|#FFFFFF/;
const uniq=[...new Set(norm)].filter(t=>!PROMPT.test(t)&&!/[;=]{1}.*\(|classList|getElementById/.test(t)).sort();
fs.writeFileSync(__dirname+'/strings.json',JSON.stringify(uniq,null,0));
console.log('entries',uniq.length,'chars',uniq.join('').length);
