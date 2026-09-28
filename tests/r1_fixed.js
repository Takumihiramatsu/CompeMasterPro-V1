/* 2026-09-28 追加（V1・M1）：原則 R1「支払額は成績で変わらない」の検証。SPEC-V1.md の 1章・8.2。
   V1 のお金（円）は経費の割り勘だけ。1人の支払額は「参加の形」と経費の項目だけで決まり、
   スコア・予想（買い目も口数も）・技能賞・同点の決め方・抽選の結果で1円も変わってはいけない。
   ここが崩れると「成績でお金が動く」＝ゴルフ場が採用できない形に戻る。
     1. 動かして確かめる：同じ大会で結果と予想を100通り入れ替え、全員の支払額を比べる
     2. 読んで確かめる：支払額の計算（billOf とそこから呼ぶ関数）が、結果・予想のデータを読まない
   直す前（v68 のコピー）に当てて落ちることを確かめてある（予想の口数×単価と原資が支払額に入っていた）。
   アプリの場所。テストと同じ場所の site/ を先に見て、無ければ ../docs/ を使う */
const _P=require('path'),_F=require('fs');
const _DIR=[_P.join(__dirname,'site'),_P.join(__dirname,'..','docs')]
  .find(d=>_F.existsSync(_P.join(d,'pc.html')))||_P.join(__dirname,'site');
const fs=require('fs');
const h=fs.readFileSync(_DIR+'/pc.html','utf8');
const src=h.slice(h.indexOf('<script>')+8,h.lastIndexOf('</script>'));
const ok=(l,c,x='')=>console.log((c?'  OK  ':'  NG  ')+l+(x!==''&&x!==undefined?'  '+x:''));
let ng=0;const chk=(l,c,x)=>{if(!c)ng++;ok(l,c,x)};

/* ---- 器（storage.js と同じ作り） ---- */
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
global.setTimeout=()=>1;global.setInterval=()=>1;global.clearInterval=()=>{};global.clearTimeout=()=>{};
global.performance={now:()=>0};global.requestAnimationFrame=()=>{};
global.alert=()=>{};global.confirm=()=>true;
global.URL={createObjectURL:()=>'blob:',revokeObjectURL(){}};global.Blob=class{};
const LSD={};global.localStorage={setItem(k,v){LSD[k]=String(v)},getItem(k){return (k in LSD)?LSD[k]:null},removeItem(k){delete LSD[k]}};
['show','hud','dots','tabs','saveState','hdTitle','pane','sndBtn','jsonFile'].forEach(id=>{global[id]=global.document.getElementById(id)});
const app=new Function(src+`;return {DB:()=>DB,setDB:d=>{DB=d},sample,settle,
  billOf:typeof billOf==="function"?billOf:null};`)();

/* 決まった順に並ぶ乱数（毎回同じ100通りを試す。落ちたときに再現できるように） */
let seed=20260928;const rnd=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648;};
const ri=(a,b)=>a+Math.floor(rnd()*(b-a+1));
const pick=a=>a[Math.floor(rnd()*a.length)];

/* ---- 土台の大会 ----
   サンプル大会（16名・経費2項目）に、支払額が分かれる要素を足す：
   予想のみの人・車を出す人・1台あたりの項目・総額を頭割りする項目・キャンセル料・丸め */
app.sample();
const D=app.DB();
const P=D.players;
P[15].fee=false; P[15].join="vote"; P[15].vote=true; P[15].g=0; P[15].f=0;   /* 予想のみ */
P[14].fee=false; P[14].cancel=5000;                                         /* 当日キャンセル */
P[3].cars=1; P[8].cars=1;                                                   /* 車を出す人 */
D.meta.budget.collect.push({label:"ガソリン代",amt:3000,mode:"unit"},{label:"貸切バス",amt:40000,mode:"total"});
D.meta.budget.roundUnit=500;
const snap=()=>app.settle().map(x=>x.n+":"+x.bill+"/"+(x.carBack||0));
const base=snap();
const bills=app.settle().map(x=>x.bill);
chk('土台の大会で支払額が出ている', bills.some(v=>v>0), bills.slice(0,4).join(',')+'…');
chk('支払額が人によって分かれる（参加の形・車・キャンセルが効いている）', new Set(bills).size>=3, [...new Set(bills)].join(','));

console.log('\n=== 1. 結果と予想を100通り入れ替えても、支払額が変わらない ===');
const names=P.map(p=>p.n), runners=P.filter(p=>+p.f>0).map(p=>p.n);
const frames=[...new Set(P.map(p=>+p.f).filter(f=>f>0))];
const holes=[...Array(18)].map((_,i)=>i+1);
const why={};let bad=0,exc=0;
for(let t=0;t<100;t++){
  const X=app.DB();
  const kinds=[];
  /* スコア（ホール別とグロス） */
  if(rnd()<.8){ kinds.push('スコア');
    /* スコアの形はアプリと同じ（ホール別を h に、合計を gross に）。形が違うと例外で落ち、
       お金が動いたのか検査のデータが壊れていたのか区別できなくなる */
    runners.forEach(n=>{ const hs={};holes.forEach(k=>hs[k]=ri(3,9));
      const g=Object.values(hs).reduce((a,v)=>a+v,0);
      X.scores[n]=Object.assign(X.scores[n]||{},{h:hs,gross:g,nc:false}); X.result.gross[n]=String(g); }); }
  /* 予想：買い目も口数も人数も変える（v68 はここで支払額が動いた） */
  if(rnd()<.8){ kinds.push('枠予想');
    X.keiba=[...Array(ri(0,60))].map(()=>({v:pick(names),a:pick(frames),b:pick(frames),q:ri(1,20)})); }
  if(rnd()<.8){ kinds.push('下位予想');
    X.gto=[...Array(ri(0,40))].map(()=>{const s=[...runners].sort(()=>rnd()-.5);return {v:pick(names),p:s.slice(0,3),q:ri(1,20)};}); }
  /* 結果・技能賞・抽選・同点の決め方 */
  if(rnd()<.7){ kinds.push('結果');
    const a=pick(frames),b=pick(frames);X.result.frame=Math.min(a,b)+"-"+Math.max(a,b);
    X.result.top2=[pick(runners),pick(runners)]; X.result.low=[pick(runners),pick(runners),pick(runners)];
    X.result.sel=[pick(runners),pick(runners),pick(runners)]; X.result.lucky=[pick(names),pick(names)]; }
  if(rnd()<.6){ kinds.push('技能賞');
    X.near=(X.meta.nearHoles||[]).map(hh=>({hole:hh,who:pick(runners),rec:ri(1,9)+"m"}));
    X.drako=(X.meta.drakoHoles||[]).map(hh=>({hole:hh,who:pick(runners),rec:ri(230,300)+"Y"})); }
  if(rnd()<.5){ kinds.push('同点の決め方'); X.meta.sc.tiebreak=pick(["older","younger","hc"]); }
  if(rnd()<.3){ kinds.push('予想の締め切り'); X.meta.betsClosed=!X.meta.betsClosed; }
  let now;
  try{ now=snap(); }catch(e){ exc++; now=['例外: '+e.message]; }
  const diff=now.filter((v,i)=>v!==base[i]);
  if(diff.length){ bad++; kinds.forEach(k=>why[k]=(why[k]||0)+1);
    if(bad===1) console.log('     最初に食い違った例：'+kinds.join('・')+' を変えたとき  '+diff.slice(0,3).join(' ')); }
}
chk('入れ替えの途中で例外が出ない（検査のデータがアプリの形に合っている）', exc===0, exc?exc+'回':'');
chk('100通りすべてで全員の支払額が同じ', bad===0, bad?bad+'通りで変わった（'+Object.entries(why).map(([k,v])=>k+v).join('・')+'）':'100通り');

console.log('\n=== 2. 支払額の計算が、結果・予想のデータを読まない ===');
/* 支払額を出す関数 billOf と、そこから呼ぶアプリ内の関数をたどり、読んではいけないものが無いか見る */
const defs={};
for(const m of src.matchAll(/\n(?:function\s+([A-Za-z_$][\w$]*)\s*\(|(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=)/g)) defs[m[1]||m[2]]=m.index;
const order=Object.entries(defs).sort((a,b)=>a[1]-b[1]);
const body=n=>{const i=order.findIndex(([k])=>k===n);if(i<0)return '';return src.slice(order[i][1],i+1<order.length?order[i+1][1]:src.length).replace(/\/\*[\s\S]*?\*\//g,'');};
chk('支払額を出す関数 billOf がある', !!app.billOf&&!!defs.billOf);
const seen=new Set(),queue=['billOf'];
while(queue.length){const n=queue.shift();if(seen.has(n)||!defs[n])continue;seen.add(n);
  for(const m of body(n).matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)) if(defs[m[1]]&&!seen.has(m[1])) queue.push(m[1]);}
const FORBID=['DB.keiba','DB.gto','DB.result','DB.scores','DB.near','DB.drako','DB.nearAny',
  'calcK','calcG','calcB','prizeOf','prizeTotal','standings','votes','kPrice','gPrice','fineUnit','feeAmt'];
const leaks=[];
seen.forEach(n=>FORBID.forEach(f=>{ if(new RegExp('\\b'+f.replace('.','\\.')+'\\b').test(body(n))) leaks.push(n+'→'+f); }));
chk('billOf からたどれる関数が結果・予想・賞を読まない', defs.billOf&&leaks.length===0,
    defs.billOf?(leaks.join('、')||[...seen].join('・')):'billOf が無い');
if(app.billOf){
  const st=app.settle();
  chk('精算の支払額は billOf と同じ値', st.every((x,i)=>x.bill===app.billOf(P[i])),
      st.filter((x,i)=>x.bill!==app.billOf(P[i])).map(x=>x.n).join('、')||'全員');
}

console.log('\n=== 3. 支払額は参加の形と経費で変わる（検査が空回りしていないこと） ===');
{
  app.sample(); const X=app.DB();
  const before=app.settle()[0].bill;
  X.meta.budget.collect[0].amt=+X.meta.budget.collect[0].amt+1000;
  chk('経費の額を上げると支払額が上がる', app.settle()[0].bill===before+1000, before+'→'+app.settle()[0].bill);
  X.players[0].fee=false;
  chk('経費の対象から外すと支払額が下がる', app.settle()[0].bill<before, app.settle()[0].bill);
}

console.log('\n合計 NG: '+ng);
