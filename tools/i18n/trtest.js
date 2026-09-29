const L=process.argv[2]||'en';
global.window={confirm(){},prompt(){},alert(){}};global.document={documentElement:{},write(){},readyState:"loading",addEventListener(){}};global.localStorage={getItem:()=>L};global.navigator={};global.CanvasRenderingContext2D=function(){};CanvasRenderingContext2D.prototype={};
require(require('path').join(__dirname,'..','..','i18n')+'/'+(L==='en'?'en':'hans')+".js");eval(require('fs').readFileSync(require('path').join(__dirname,'..','..','i18n','i18n.js'),'utf8'));
const lines=require('fs').readFileSync(0,'utf8').split('\n').filter(Boolean);
for(const s of lines)console.log(s,"=>",window.tr(s));
