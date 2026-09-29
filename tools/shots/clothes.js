// 示範娃衣（自己畫的，沒有任何品牌設計）：SVG → 在頁面裡轉成 PNG 當貼圖
const S=(w,h,body)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w*2}" height="${h*2}">${body}</svg>`;
module.exports={
  // 奶油色針織上衣
  sweater:{name:'奶油色麻花針織上衣',category:'上衣',colors:['米白色'],styles:[{name:'日常'},{name:'森系'}],motifs:['麻花'],svg:S(220,200,`
    <defs><pattern id="k" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M3 0v14M11 0v14" stroke="#E6D9BF" stroke-width="2"/></pattern></defs>
    <path d="M70 18 Q110 34 150 18 L200 52 L184 104 L160 94 L160 188 L60 188 L60 94 L36 104 L20 52 Z" fill="#F6EEDC" stroke="#CDBB98" stroke-width="3" stroke-linejoin="round"/>
    <path d="M70 18 Q110 34 150 18 L200 52 L184 104 L160 94 L160 188 L60 188 L60 94 L36 104 L20 52 Z" fill="url(#k)" opacity=".8"/>
    <path d="M86 20 Q110 44 134 20" fill="none" stroke="#CDBB98" stroke-width="7" stroke-linecap="round"/>
    <path d="M100 60 q10 10 0 20 q-10 10 0 20 q10 10 0 20 q-10 10 0 20 q10 10 0 20" fill="none" stroke="#D8C7A4" stroke-width="5"/>
    <path d="M120 60 q-10 10 0 20 q10 10 0 20 q-10 10 0 20 q10 10 0 20 q-10 10 0 20" fill="none" stroke="#D8C7A4" stroke-width="5"/>
    <rect x="60" y="176" width="100" height="12" fill="#EADCC0"/>`)},
  // 紅格紋百褶裙
  skirt:{name:'紅格紋百褶裙',category:'裙子',colors:['紅色','黑色'],styles:[{name:'學院'}],motifs:['格紋'],svg:S(200,150,`
    <defs><pattern id="p" width="30" height="30" patternUnits="userSpaceOnUse"><rect width="30" height="30" fill="#B8333F"/><rect width="30" height="8" y="11" fill="#7E1F2B" opacity=".75"/><rect width="8" height="30" x="11" fill="#7E1F2B" opacity=".75"/><path d="M0 15h30M15 0v30" stroke="#F2D38A" stroke-width="1.6"/></pattern></defs>
    <path d="M52 20 L148 20 L186 136 L14 136 Z" fill="url(#p)" stroke="#5E1720" stroke-width="3" stroke-linejoin="round"/>
    <path d="M73 24 L58 136 M94 24 L90 136 M106 24 L110 136 M127 24 L142 136" stroke="#5E1720" stroke-width="2.5" opacity=".55"/>
    <rect x="48" y="10" width="104" height="16" rx="4" fill="#7E1F2B" stroke="#5E1720" stroke-width="3"/>`)},
  // 焦糖貝雷帽
  beret:{name:'焦糖色貝雷帽',category:'帽子',colors:['棕色'],styles:[{name:'文青'}],motifs:[],svg:S(200,130,`
    <ellipse cx="100" cy="70" rx="88" ry="44" fill="#B87A45" stroke="#7A4A22" stroke-width="3"/>
    <path d="M30 86 Q100 118 170 86 L166 96 Q100 128 34 96 Z" fill="#8F5A2E" stroke="#6A3E1A" stroke-width="3"/>
    <ellipse cx="80" cy="56" rx="40" ry="16" fill="#C98E57" opacity=".5"/>
    <path d="M100 26 q4 -14 12 -16" stroke="#6A3E1A" stroke-width="5" stroke-linecap="round" fill="none"/>`)},
  // 牛仔吊帶褲
  overall:{name:'牛仔吊帶短褲',category:'褲子',colors:['藍色'],styles:[{name:'日常'}],motifs:[],svg:S(180,200,`
    <path d="M40 10 h18 v70 h64 v-70 h18 v78 l10 12 v96 h-66 l-4 -44 l-4 44 h-66 v-96 l10 -12 z" fill="#5B80B8" stroke="#3B5A8C" stroke-width="3" stroke-linejoin="round"/>
    <rect x="58" y="80" width="64" height="44" rx="6" fill="#6C90C6" stroke="#3B5A8C" stroke-width="3"/>
    <rect x="76" y="92" width="28" height="20" rx="4" fill="none" stroke="#E9C46A" stroke-width="2.5" stroke-dasharray="4 3"/>
    <circle cx="49" cy="84" r="6" fill="#E9C46A" stroke="#A8862F" stroke-width="2"/><circle cx="131" cy="84" r="6" fill="#E9C46A" stroke="#A8862F" stroke-width="2"/>
    <path d="M90 124 v60" stroke="#3B5A8C" stroke-width="2.5" stroke-dasharray="5 4"/>`)},
  // 小白鞋
  shoes:{name:'圓頭小白鞋',category:'鞋子',colors:['白色'],styles:[{name:'日常'}],motifs:[],svg:S(230,100,`
    <g><path d="M8 72 Q6 44 30 40 L62 36 Q98 34 104 62 L104 74 Q104 84 94 84 L16 84 Q8 84 8 72Z" fill="#FFFFFF" stroke="#8E8E8E" stroke-width="3"/>
    <path d="M8 76 H104" stroke="#D7D2CC" stroke-width="8"/><path d="M40 40 Q52 54 72 38" fill="none" stroke="#8E8E8E" stroke-width="3"/>
    <path d="M44 46 L84 44" stroke="#E4A3B2" stroke-width="6" stroke-linecap="round"/><circle cx="84" cy="44" r="4" fill="#F2D38A" stroke="#A8862F" stroke-width="1.5"/></g>
    <g transform="translate(118 4)"><g><path d="M8 72 Q6 44 30 40 L62 36 Q98 34 104 62 L104 74 Q104 84 94 84 L16 84 Q8 84 8 72Z" fill="#FFFFFF" stroke="#8E8E8E" stroke-width="3"/>
    <path d="M8 76 H104" stroke="#D7D2CC" stroke-width="8"/><path d="M40 40 Q52 54 72 38" fill="none" stroke="#8E8E8E" stroke-width="3"/>
    <path d="M44 46 L84 44" stroke="#E4A3B2" stroke-width="6" stroke-linecap="round"/><circle cx="84" cy="44" r="4" fill="#F2D38A" stroke="#A8862F" stroke-width="1.5"/></g></g>`)},
  // 草莓連身裙
  dress:{name:'草莓點點連身裙',category:'洋裝',colors:['粉色','白色'],styles:[{name:'甜系'}],motifs:['草莓','蕾絲'],svg:S(200,220,`
    <defs><pattern id="s" width="34" height="34" patternUnits="userSpaceOnUse"><path d="M17 9 q7 0 7 8 q0 9 -7 12 q-7 -3 -7 -12 q0 -8 7 -8z" fill="#E4505F"/><path d="M13 9 l4 -4 l4 4" stroke="#4E9A55" stroke-width="2.5" fill="none"/></pattern></defs>
    <path d="M70 12 Q100 26 130 12 L150 30 L136 62 L126 58 L178 204 L22 204 L74 58 L64 62 L50 30 Z" fill="#F9D5DC" stroke="#D48596" stroke-width="3" stroke-linejoin="round"/>
    <path d="M70 12 Q100 26 130 12 L150 30 L136 62 L126 58 L178 204 L22 204 L74 58 L64 62 L50 30 Z" fill="url(#s)" opacity=".85"/>
    <path d="M22 204 q10 10 20 0 q10 10 20 0 q10 10 20 0 q10 10 20 0 q10 10 20 0 q10 10 20 0 q10 10 20 0 q10 10 20 0" fill="#FFFFFF" stroke="#D48596" stroke-width="2"/>
    <path d="M78 60 Q100 70 122 60" stroke="#D48596" stroke-width="5" fill="none" stroke-linecap="round"/>`)},
  // 條紋襪
  socks:{name:'粉灰條紋襪',category:'襪子',colors:['粉色','灰色'],styles:[{name:'甜系'}],motifs:['條紋'],svg:S(180,150,`
    <defs><pattern id="t" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="8" fill="#F3B6C4"/><rect y="8" width="16" height="8" fill="#B9B4BC"/></pattern></defs>
    <path d="M20 10 h36 v80 q0 30 -26 40 l-8 -2 q-10 -6 2 -18 q8 -10 -4 -20z" fill="url(#t)" stroke="#8C7C88" stroke-width="3"/>
    <path d="M110 10 h36 v80 q0 30 -26 40 l-8 -2 q-10 -6 2 -18 q8 -10 -4 -20z" fill="url(#t)" stroke="#8C7C88" stroke-width="3"/>`)}
};
