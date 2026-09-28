/* 2026-09-28 追加（V1・M1）：原則 R3「賞は品物」の検証。SPEC-V1.md の 1章・4.5・8.2。
   賞は品名（item）と出どころ（src）で持ち、賞ごとの金額を持たない。主催者が買う賞品の費用は、
   経費の「賞品購入費」（上限つき）の総額でだけ扱う。賞に金額が付くと「成績でお金が動く」形に戻る。
     1. データ：初期値・サンプル・社内版（v68）のファイルを開いたあと、賞に金額の項目が無い
     2. 画面：賞品・経費の画面で、賞に金額を入れる欄が無い
     3. 発表：表彰式のどの画面にも「円」が出ない
   直す前（v68 のコピー）に当てて落ちることを確かめてある。
   アプリの場所。テストと同じ場所の site/ を先に見て、無ければ ../docs/ を使う */
const _P=require('path'),_F=require('fs');
const _DIR=[_P.join(__dirname,'site'),_P.join(__dirname,'..','docs')]
  .find(d=>_F.existsSync(_P.join(d,'pc.html')))||_P.join(__dirname,'site');
const fs=require('fs');
const h=fs.readFileSync(_DIR+'/pc.html','utf8');
const src=h.slice(h.indexOf('<script>')+8,h.lastIndexOf('</script>'));
const ok=(l,c,x='')=>console.log((c?'  OK  ':'  NG  ')+l+(x!==''&&x!==undefined?'  '+x:''));
let ng=0;const chk=(l,c,x)=>{if(!c)ng++;ok(l,c,x)};

const store={};const mk=id=>({id,value:'',textContent:'',className:'',checked:false,style:{},files:[],
  _html:'',get innerHTML(){return this._html},set innerHTML(v){this._html=v},
  classList:{add(){},remove(){},toggle(){},contains:()=>false},
  addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],insertAdjacentHTML(){},click(){},focus(){},
  setAttribute(){},appendChild(){}});
global.document={documentElement:{style:{setProperty(){}},requestFullscreen(){}},
  body:{className:'',classList:{add(){},remove(){},contains:()=>false}},
  getElementById:id=>store[id]||(store[id]=mk(id)),querySelector:()=>null,querySelectorAll:()=>[],
  addEventListener(){},createElement:()=>mk('a'),title:''};
global.window={AudioContext:function(){throw 0},addEventListener(){}};
const T=[];global.setTimeout=f=>{T.push(f);return 1};const flush=()=>T.splice(0).forEach(f=>{try{f()}catch(e){}});
global.setInterval=()=>1;global.clearInterval=()=>{};global.clearTimeout=()=>{};
global.performance={now:()=>0};global.requestAnimationFrame=()=>{};
global.alert=()=>{};global.confirm=()=>true;
global.URL={createObjectURL:()=>'blob:',revokeObjectURL(){}};global.Blob=class{};
global.localStorage={setItem(){},getItem(){return null},removeItem(){}};
global.FileReader=class{ readAsText(f){ this.result=f._text; this.onload(); } };
['show','hud','dots','tabs','saveState','hdTitle','pane','sndBtn','jsonFile','skipN'].forEach(id=>{global[id]=global.document.getElementById(id)});
const app=new Function(src+`;return {DB:()=>DB,setDB:d=>{DB=d},blank,sample,sampleHard,migrate,upJson,go,PZ,useSet,
  buildSlides,get slides(){return slides},
  giftsOf:typeof giftsOf==="function"?giftsOf:null,pzAdd,pzSkip,pzPreset:typeof pzPreset==="function"?pzPreset:null};`)();

const GK=["near","nearAny","drako","birdie","eagle","team","lucky"];
/* 賞のデータに金額が無いか。順位賞の各行（amt）と、技能賞などの数値（v68 は PZ().near=1000 のように持っていた） */
const moneyIn=P=>{const bad=[];
  (P.rank||[]).forEach((r,i)=>{ if('amt' in r) bad.push('rank['+i+'].amt'); });
  GK.forEach(k=>{ if(typeof P[k]==='number') bad.push(k+'='+P[k]);
    const g=P.gift&&P.gift[k]; if(g&&typeof g==='object'&&Object.values(g).some(v=>typeof v==='number')) bad.push('gift.'+k+' に数値'); });
  return bad;};

console.log('=== 1. データ：賞に金額の項目が無い ===');
{
  const B=app.blank();
  chk('初期値：賞に金額が無い', moneyIn(B.meta.prizes).length===0, moneyIn(B.meta.prizes).join(',')||'なし');
  chk('初期値：順位賞は品名と出どころを持つ', B.meta.prizes.rank.every(r=>'item' in r&&'src' in r));
  chk('初期値：技能賞・団体賞・ラッキー賞・バーディー賞も品名と出どころ', GK.every(k=>B.meta.prizes.gift&&typeof B.meta.prizes.gift[k]==='object'&&'item' in B.meta.prizes.gift[k]));
  app.sample(); flush();
  chk('サンプル①：賞に金額が無い', moneyIn(app.PZ()).length===0, moneyIn(app.PZ()).join(',')||'なし');
  chk('サンプル①：品名が入っている（表彰の見本になる）', app.PZ().rank.filter(r=>r.item).length>=5, app.PZ().rank.map(r=>r.item).join('・'));
  app.sampleHard(); flush();
  chk('サンプル②：賞に金額が無い', moneyIn(app.PZ()).length===0, moneyIn(app.PZ()).join(',')||'なし');
  app.setDB(app.blank()); app.pzAdd(); app.pzSkip(); if(app.pzPreset) app.pzPreset();
  chk('賞を足す操作（追加・飛び賞・よくある賞）でも金額が付かない', moneyIn(app.PZ()).length===0, moneyIn(app.PZ()).join(',')||'なし');
  /* 社内版（v68）の形のファイル：順位賞に amt、技能賞などに数値を持つ */
  const v68=app.blank();
  v68.meta.prizes={rank:[{label:"優勝",kind:"rank",n:1,amt:10000},{label:"BB",kind:"last",n:2,amt:1000}],
    near:1000,nearAny:1000,drako:1000,birdie:1000,eagle:3000,team:5000,lucky:1000};
  const M=app.migrate(JSON.parse(JSON.stringify(v68)));
  chk('社内版のファイルを移すと金額が消える', moneyIn(M.meta.prizes).length===0, moneyIn(M.meta.prizes).join(',')||'なし');
  chk('賞の名前と決め方は残る', M.meta.prizes.rank.map(r=>r.label+':'+r.kind).join('/')==='優勝:rank/BB:last');
  app.setDB(app.blank()); app.upJson({name:'v68.json',_text:JSON.stringify(v68)});
  chk('読み込みの経路でも金額が残らない', moneyIn(app.PZ()).length===0, moneyIn(app.PZ()).join(',')||'なし');
}

console.log('\n=== 2. 画面：賞に金額を入れる欄が無い ===');
{
  app.sample(); flush();
  GK.forEach(k=>{ if(k in app.DB().meta.use) app.useSet(k,true); });
  app.go('money');
  const H=store['pane'].innerHTML;
  /* 賞のカード（収支のカードより前）だけを見る。収支のカードには経費の金額欄があってよい */
  const prizePart=H.split('<h2>収支')[0];
  chk('賞のカードが描かれている', /<h2>順位賞/.test(prizePart)&&/<h2>技能賞/.test(prizePart), prizePart.length+'文字');
  chk('賞のカードに金額の入力欄が無い（number の欄は人数・位・チーム数だけ）',
      [...prizePart.matchAll(/<input[^>]*type="number"[^>]*>/g)].every(m=>/pzEdit\(\d+,'n'|team\.size|team\.top|lucky\.count|skipN/.test(m[0])),
      [...prizePart.matchAll(/<input[^>]*type="number"[^>]*>/g)].map(m=>(m[0].match(/onchange="([^"]{0,40})/)||['',''])[1]).join(' | '));
  chk('賞のカードに「円」が出ない', !/円/.test(prizePart.replace(/<[^>]+>/g,'')), (prizePart.replace(/<[^>]+>/g,'').match(/.{0,12}円.{0,6}/)||[''])[0]);
  chk('賞の欄は品名と出どころ', /placeholder="品名/.test(prizePart)&&/主催者の購入/.test(prizePart)&&/ゴルフ場の提供/.test(prizePart)&&/協賛/.test(prizePart));
  chk('賞金の合計・小計を出さない', !/賞金 合計|小計/.test(prizePart));
}

console.log('\n=== 3. 発表：表彰式のどの画面にも「円」が出ない ===');
{
  app.sample(); flush();
  GK.forEach(k=>{ if(k in app.DB().meta.use) app.useSet(k,true); });
  app.buildSlides();
  const S=app.slides, bad=[];
  let err=0;
  S.forEach(s=>{ let t=''; try{ t=s.html(); }catch(e){ err++; } if(/円/.test(t.replace(/<[^>]+>/g,''))) bad.push(s.id); });
  chk('発表の画面が作られている', S.length>20, S.length+'画面');
  chk('どの画面も描ける', err===0, err+'件');
  chk('どの画面にも「円」が出ない', bad.length===0, bad.join(',')||'なし');
  chk('優勝の画面に品名が出る', /ゴルフボール 2ダース/.test((S.find(s=>s.id==='s-1')||{html:()=>''}).html()));
  if(app.giftsOf){ const w=app.DB().players[0].n;
    chk('受ける賞は品名の一覧（数値を返さない）', app.giftsOf(w).every(x=>Array.isArray(x)&&typeof x[1]==='string'), JSON.stringify(app.giftsOf(w))); }
  else chk('受ける賞を品名で返す関数（giftsOf）がある', false, '無い');
}

console.log('\n合計 NG: '+ng);
