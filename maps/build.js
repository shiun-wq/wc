// 把 world-atlas / taiwan-atlas 轉成 App 直接用的 SVG path（預先投影、四捨五入，檔案小）
const fs=require('fs'),topo=require('/tmp/mapdl/topojson-client-3.1.0/package/dist/topojson-client.js');
const ZH={'Taiwan':['台灣','臺灣'],'Japan':['日本'],'South Korea':['韓國','南韓'],'North Korea':['北韓','朝鮮'],'China':['中國','大陸','中國大陸'],'Hong Kong':['香港'],'Macao':['澳門'],'Mongolia':['蒙古'],
'Thailand':['泰國'],'Singapore':['新加坡'],'Malaysia':['馬來西亞'],'Vietnam':['越南'],'Philippines':['菲律賓'],'Indonesia':['印尼','印度尼西亞'],'Cambodia':['柬埔寨'],'Laos':['寮國'],'Myanmar':['緬甸'],'Brunei':['汶萊'],'Timor-Leste':['東帝汶'],
'India':['印度'],'Nepal':['尼泊爾'],'Sri Lanka':['斯里蘭卡'],'Maldives':['馬爾地夫'],'Bhutan':['不丹'],'Bangladesh':['孟加拉'],'Pakistan':['巴基斯坦'],'Afghanistan':['阿富汗'],
'United Arab Emirates':['阿聯','阿聯酋','杜拜'],'Saudi Arabia':['沙烏地阿拉伯'],'Qatar':['卡達'],'Israel':['以色列'],'Jordan':['約旦'],'Turkey':['土耳其'],'Iran':['伊朗'],'Iraq':['伊拉克'],'Oman':['阿曼'],'Kuwait':['科威特'],'Bahrain':['巴林'],'Lebanon':['黎巴嫩'],'Syria':['敘利亞'],'Yemen':['葉門'],'Palestine':['巴勒斯坦'],
'Kazakhstan':['哈薩克'],'Uzbekistan':['烏茲別克'],'Kyrgyzstan':['吉爾吉斯'],'Tajikistan':['塔吉克'],'Turkmenistan':['土庫曼'],'Georgia':['喬治亞'],'Armenia':['亞美尼亞'],'Azerbaijan':['亞塞拜然'],
'United Kingdom':['英國'],'Ireland':['愛爾蘭'],'France':['法國'],'Germany':['德國'],'Italy':['義大利'],'Spain':['西班牙'],'Portugal':['葡萄牙'],'Netherlands':['荷蘭'],'Belgium':['比利時'],'Luxembourg':['盧森堡'],'Switzerland':['瑞士'],'Austria':['奧地利'],
'Denmark':['丹麥'],'Norway':['挪威'],'Sweden':['瑞典'],'Finland':['芬蘭'],'Iceland':['冰島'],'Poland':['波蘭'],'Czechia':['捷克'],'Slovakia':['斯洛伐克'],'Hungary':['匈牙利'],'Slovenia':['斯洛維尼亞'],'Croatia':['克羅埃西亞'],'Greece':['希臘'],'Romania':['羅馬尼亞'],'Bulgaria':['保加利亞'],
'Serbia':['塞爾維亞'],'Bosnia and Herz.':['波士尼亞'],'Montenegro':['蒙特內哥羅'],'Albania':['阿爾巴尼亞'],'Macedonia':['北馬其頓'],'Estonia':['愛沙尼亞'],'Latvia':['拉脫維亞'],'Lithuania':['立陶宛'],'Ukraine':['烏克蘭'],'Belarus':['白俄羅斯'],'Moldova':['摩爾多瓦'],'Russia':['俄羅斯','俄國'],
'Malta':['馬爾他'],'Cyprus':['賽普勒斯'],'Monaco':['摩納哥'],'Vatican':['梵蒂岡'],'San Marino':['聖馬利諾'],'Andorra':['安道爾'],'Liechtenstein':['列支敦斯登'],'Greenland':['格陵蘭'],
'United States of America':['美國'],'Canada':['加拿大'],'Mexico':['墨西哥'],'Cuba':['古巴'],'Jamaica':['牙買加'],'Guatemala':['瓜地馬拉'],'Costa Rica':['哥斯大黎加'],'Panama':['巴拿馬'],'Puerto Rico':['波多黎各'],'Guam':['關島'],'N. Mariana Is.':['塞班','北馬里亞納'],'Palau':['帛琉'],
'Brazil':['巴西'],'Argentina':['阿根廷'],'Chile':['智利'],'Peru':['秘魯'],'Colombia':['哥倫比亞'],'Ecuador':['厄瓜多'],'Bolivia':['玻利維亞'],'Uruguay':['烏拉圭'],'Paraguay':['巴拉圭'],'Venezuela':['委內瑞拉'],
'Australia':['澳洲','澳大利亞'],'New Zealand':['紐西蘭'],'Fiji':['斐濟'],'Papua New Guinea':['巴布亞紐幾內亞'],'Fr. Polynesia':['大溪地','法屬玻里尼西亞'],'New Caledonia':['新喀里多尼亞'],
'Egypt':['埃及'],'Morocco':['摩洛哥'],'Tunisia':['突尼西亞'],'South Africa':['南非'],'Kenya':['肯亞'],'Tanzania':['坦尚尼亞'],'Ethiopia':['衣索比亞'],'Nigeria':['奈及利亞'],'Ghana':['迦納'],'Madagascar':['馬達加斯加'],'Mauritius':['模里西斯'],'Seychelles':['塞席爾'],'Namibia':['納米比亞'],'Botswana':['波札那'],'Zimbabwe':['辛巴威'],'Uganda':['烏干達'],'Rwanda':['盧安達'],'Senegal':['塞內加爾'],'Algeria':['阿爾及利亞'],'Libya':['利比亞'],'eSwatini':['史瓦帝尼']};
const r1=v=>Math.round(v*10)/10;
// Douglas-Peucker：把幾乎在同一直線上的點去掉
function dp(pts,tol){
  if(pts.length<4)return pts;
  const keep=new Uint8Array(pts.length);keep[0]=keep[pts.length-1]=1;const st=[[0,pts.length-1]];
  while(st.length){const [a,b]=st.pop();let md=0,mi=-1;const [x1,y1]=pts[a],[x2,y2]=pts[b],dx=x2-x1,dy=y2-y1,L=Math.hypot(dx,dy)||1e-9;
    for(let i=a+1;i<b;i++){const d=Math.abs(dy*pts[i][0]-dx*pts[i][1]+x2*y1-y2*x1)/L;if(d>md){md=d;mi=i}}
    if(md>tol){keep[mi]=1;st.push([a,mi],[mi,b])}}
  return pts.filter((_,i)=>keep[i]);
}
let TOL=0.5,RND=r1,MINA=0;
function pathOf(geom,proj){
  const polys=geom.type==='Polygon'?[geom.coordinates]:geom.type==='MultiPolygon'?geom.coordinates:[];
  let d='';
  for(const poly of polys)for(let ring of poly){
    if(ring.some(c=>c[0]>150)&&ring.some(c=>c[0]<-150))ring=ring.map(c=>c[0]<0?[180,c[1]]:c);
    const pr=ring.map(proj),mid=pr.length>>1;let raw=[...dp(pr.slice(0,mid+1),TOL),...dp(pr.slice(mid),TOL).slice(1)],last=null,pts=[];
    let area=0;for(let i=0;i<raw.length-1;i++)area+=raw[i][0]*raw[i+1][1]-raw[i+1][0]*raw[i][1];
    if(Math.abs(area/2)<MINA&&polys.length>1)continue;
    for(const c of raw){const [x,y]=c.map(RND);const k=x+','+y;if(k!==last){pts.push(k);last=k}}
    if(pts.length<3)continue;
    d+='M'+pts[0]+'L'+pts.slice(1).join(' ')+'Z';
  }
  return d;
}
// 世界：Equal Earth 投影，不含南極洲
{
  TOL=0.7;RND=v=>Math.round(v);MINA=1.5;
  const w=JSON.parse(fs.readFileSync('/tmp/mapdl/world-atlas-2.0.2/package/countries-50m.json'));
  const fc=topo.feature(w,w.objects.countries);
  const A1=1.340264,A2=-0.081106,A3=0.000893,A4=0.003796,M=Math.sqrt(3)/2;
  const ee=([lon,lat])=>{const l=lon*Math.PI/180,p=lat*Math.PI/180,t=Math.asin(M*Math.sin(p)),t2=t*t,t6=t2*t2*t2;
    const x=l*Math.cos(t)/(M*(A1+3*A2*t2+t6*(7*A3+9*A4*t2))),y=t*(A1+A2*t2+t6*(A3+A4*t2));return [x,y]};
  const S=160,W=Math.round(2*2.7064*S)+4,topY=ee([0,84])[1];
  const proj=c=>{const [x,y]=ee(c);return [x*S+W/2,(topY-y)*S+2]};
  const H=Math.round((topY-ee([0,-58])[1])*S)+4;
  const f=[];const miss=[];
  for(const ft of fc.features){const n=ft.properties.name;if(n==='Antarctica'||n==='Fr. S. Antarctic Lands')continue;
    const d=pathOf(ft.geometry,proj);if(!d)continue;
    // 很小的國家／地區（新加坡、香港、澳門…）記中心點，地圖上畫圓點
    const pts=(d.match(/-?[\d.]+,-?[\d.]+/g)||[]).map(s=>s.split(',').map(Number));const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
    const small=Math.max(...xs)-Math.min(...xs)<5&&Math.max(...ys)-Math.min(...ys)<5;
    const o={n:ZH[n]||[],d};if(!ZH[n])miss.push(n);
    if(small)o.c=[r1((Math.min(...xs)+Math.max(...xs))/2),r1((Math.min(...ys)+Math.max(...ys))/2)];
    f.push(o);}
  fs.writeFileSync('/home/user/wc/maps/world.json',JSON.stringify({vb:`0 0 ${W} ${H}`,f}));
  console.log('world',W,H,fs.statSync('/home/user/wc/maps/world.json').size,'unnamed',miss.length);
}
// 台灣：縣市，金門、連江放在左上角的小框
{
  TOL=0.45;RND=r1;MINA=0.3;
  const t=JSON.parse(fs.readFileSync('/tmp/mapdl/taiwan-atlas-2021.9.20/package/counties-10t.json'));
  const fc=topo.feature(t,t.objects.counties);
  const k=Math.cos(23.7*Math.PI/180),S=150;
  const base=([lon,lat])=>[(lon-119.3)*k*S,(25.35-lat)*S];
  const bb=ft=>{const xs=[],ys=[];(ft.geometry.type==='Polygon'?[ft.geometry.coordinates]:ft.geometry.coordinates).forEach(p=>p.forEach(r=>r.forEach(c=>{const [x,y]=base(c);xs.push(x);ys.push(y)})));return [Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]};
  // 烏坵很小又離金門很遠，拿掉才不會讓小框變很大
  fc.features.forEach(f=>{if(f.properties.COUNTYNAME==='金門縣'&&f.geometry.type==='MultiPolygon')f.geometry.coordinates=f.geometry.coordinates.filter(p=>p[0].every(c=>c[0]<119))});
  const byN=Object.fromEntries(fc.features.map(f=>[f.properties.COUNTYNAME,f]));
  const km=bb(byN['金門縣']),mz=bb(byN['連江縣']);
  const inset={'金門縣':{dx:10-km[0],dy:14-km[1]},'連江縣':{dx:10-mz[0],dy:14+(km[3]-km[1])+16-mz[1]}};
  const boxH=(km[3]-km[1])+16+(mz[3]-mz[1])+14,boxW=Math.max(km[2]-km[0],mz[2]-mz[0])+14;
  const f=[];let X=0,Y=0;
  for(const ft of fc.features){const n=ft.properties.COUNTYNAME,o=inset[n];
    const proj=c=>{const [x,y]=base(c);return o?[x+o.dx,y+o.dy]:[x,y]};
    const d=pathOf(ft.geometry,proj),o2={n,d};
    if(o){const q=(d.match(/-?[\d.]+,-?[\d.]+/g)||[]).map(z=>z.split(',').map(Number)),xs=q.map(z=>z[0]),ys=q.map(z=>z[1]);o2.c=[r1((Math.min(...xs)+Math.max(...xs))/2),r1((Math.min(...ys)+Math.max(...ys))/2)]}
    f.push(o2);
    (d.match(/-?[\d.]+,-?[\d.]+/g)||[]).forEach(q=>{const [x,y]=q.split(',').map(Number);X=Math.max(X,x);Y=Math.max(Y,y)});}
  fs.writeFileSync('/home/user/wc/maps/tw.json',JSON.stringify({vb:`0 0 ${Math.ceil(X+6)} ${Math.ceil(Y+6)}`,f,box:[[4,6,Math.round(boxW),Math.round(boxH)]]}));
  console.log('tw',fs.statSync('/home/user/wc/maps/tw.json').size,X,Y);
}
