/* 集金（経費）の検証。
   V1（2026-09-28、M1）で全面的に書き直した。v68 の fee.js は「賞金の原資」と「馬券・GTOの代金」を
   集金に含める前提の検査が大半だった。V1 のお金は経費だけで、支払額は参加のしかたと経費の項目だけで決まる
   （SPEC-V1.md の原則 R1。r1_fixed.js が別に検査する）。
   v68 で実際に起きた不具合の再現（宿泊ありの数え方の混在・車代の集めと返し・台数の入れ忘れ・
   「1台あたり」を選んだ直後の欄・参加のしかた・丸めと繰越）は、日付と理由ごと引き継いでいる。
   アプリの場所。テストと同じ場所の site/ を先に見て、無ければ ../docs/ を使う */
const _P=require('path'),_F=require('fs');
const _DIR=[_P.join(__dirname,'site'),_P.join(__dirname,'..','docs')]
  .find(d=>_F.existsSync(_P.join(d,'pc.html')))||_P.join(__dirname,'site');
const APP={dir:_DIR+'/', get pc(){return this.dir+'pc.html'}};
const fs=require('fs');
const h=fs.readFileSync(APP.pc,'utf8');
const src=h.slice(h.indexOf('<script>')+8,h.lastIndexOf('</script>'));
const store={};const mk=id=>({id,value:'',textContent:'',className:'',checked:false,style:{},files:[],
  _html:'',get innerHTML(){return this._html},set innerHTML(v){this._html=v},
  classList:{add(){},remove(){},toggle(){},contains:()=>false},
  addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],insertAdjacentHTML(){},click(){},focus(){}});
const doc={documentElement:{style:{},requestFullscreen(){}},body:{className:'',classList:{add(){},remove(){},contains:()=>false}},
  getElementById:id=>store[id]||(store[id]=mk(id)),querySelectorAll:()=>[],addEventListener(){},createElement:()=>mk('a')};
global.document=doc;global.window={AudioContext:function(){throw 0},addEventListener(){}};
const _t=[];global.setTimeout=f=>{_t.push(f);return 1};global.flush=()=>_t.splice(0).forEach(f=>{try{f()}catch(e){}});
global.setInterval=()=>1;global.clearInterval=()=>{};global.clearTimeout=()=>{};
global.performance={now:()=>0};global.requestAnimationFrame=()=>{};
let A=[];global.alert=m=>A.push(m);global.confirm=()=>true;
global.URL={createObjectURL:()=>'',revokeObjectURL(){}};global.Blob=class{};
global.localStorage={setItem(){},getItem(){return null},removeItem(){}};
['show','hud','dots','tabs','saveState','hdTitle','pane','sndBtn'].forEach(id=>{global[id]=doc.getElementById(id)});
const app=new Function(src+`;return {DB:()=>DB,blank,sample,sampleHard,go,pEdit,feeMembers,budget,settle,BG,RUN,VOT,
  collectPlan,setDB:x=>{DB=x},standings,calcB,carCount,carUnitSum,carSet,cAdd,cEdit,capSet,leftSet,
  joinSet,joinOf,voteOnly,roundUnit,billOf,payersOf,prizeCapIssue,prizeEachOf,giftsOf,flowSteps:typeof flowSteps==="function"?flowSteps:null};`)();
const ok=(l,c,x='')=>console.log((c?'  OK  ':'  NG  ')+l+(x!==''&&x!==undefined?'  '+x:''));
let ng=0;const chk=(l,c,x)=>{if(!c)ng++;ok(l,c,x)};
const P16=D=>"ABCDEFGHIJKLMNOP".split("").forEach((n,i)=>D.players.push(
  {n:"参加者"+n,org:"",bd:"1970-01-01",g:Math.floor(i/4)+1,f:i+1,vote:true,fee:true,cars:0}));

console.log('=== 1. サンプルの経費（プレー代・懇親会費・賞品購入費） ===');
app.sample(); global.flush();
{
  const b=app.BG(), S=app.settle();
  chk('経費は3項目', b.collect.length===3, b.collect.map(x=>x.label).join('・'));
  chk('賞金の原資・予想の口数の見込みを持たない', !('fee' in b)&&!('kGuess' in b)&&!('gGuess' in b), Object.keys(b).join(','));
  chk('全員 13,500＋3,000＋3,000＝19,500円', S.every(x=>x.bill===19500), [...new Set(S.map(x=>x.bill))].join(','));
  chk('精算に予想・賞・罰金の金額が無い', S.every(x=>!('kq' in x)&&!('back' in x)&&!('pz' in x)&&!('fine' in x)&&!('fee' in x)));
  chk('予想の口を増やしても支払額は同じ', (()=>{const before=S[0].bill;
    app.DB().keiba.push({v:S[0].n,a:1,b:2,q:50}); const after=app.settle()[0].bill; app.DB().keiba.pop(); return before===after;})());
}

console.log('\n=== 2. 誰から集めるか（項目ごとの to） ===');
{
  const D=app.blank(); P16(D);
  D.meta.budget.collect=[
    {label:"プレー代",amt:13500,mode:"each",to:"play"},
    {label:"懇親会費",amt:4000,mode:"each",to:"party"},
    {label:"宿泊代",amt:11000,mode:"each",to:"stay"},
    {label:"運営費",amt:4800,mode:"total",to:"all"}];
  app.setDB(D);
  D.players[0].party=false;                 /* 懇親会に出ない */
  D.players[1].stay=true; D.players[2].stay=true;   /* 宿泊する */
  app.joinSet(15,"vote");                   /* 予想のみ（プレーしない） */
  const S=app.settle(), by=n=>S.find(x=>x.n===n).bill;
  chk('プレー代はプレーする15名から', app.payersOf(D.meta.budget.collect[0]).length===15);
  chk('懇親会費は出る15名から（予想のみの方も既定で出る）', app.payersOf(D.meta.budget.collect[1]).length===15);
  chk('宿泊代は宿泊する2名から', app.payersOf(D.meta.budget.collect[2]).length===2);
  chk('運営費は全員16名で頭割り（4,800÷16＝300円）', app.payersOf(D.meta.budget.collect[3]).length===16);
  chk('懇親会に出ない方：13,500＋300＝13,800円', by("参加者A")===13800, by("参加者A"));
  chk('宿泊する方：13,500＋4,000＋11,000＋300＝28,800円', by("参加者B")===28800, by("参加者B"));
  chk('ふつうの方：13,500＋4,000＋300＝17,800円', by("参加者D")===17800, by("参加者D"));
  chk('予想のみの方：懇親会費＋運営費＝4,300円', by("参加者P")===4300, by("参加者P"));
  app.go('players');
  const H=store['pane'].innerHTML;
  chk('参加者に「懇親会」の欄が出る（項目があるとき）', />懇親会<\/th>/.test(H));
  chk('参加者に「宿泊」の欄が出る（項目があるとき）', />宿泊<\/th>/.test(H));
  D.meta.budget.collect.splice(1,2); app.go('players');
  chk('項目が無ければ欄は出ない', !/>懇親会<\/th>/.test(store['pane'].innerHTML)&&!/>宿泊<\/th>/.test(store['pane'].innerHTML));
}

console.log('\n=== 宿泊ありのコンペ（数え方が混ざる）===');
/* 日帰りなら全員同じ額でよいが、宿泊ありだと項目が増え、数え方も混ざる。
   ガソリン代・高速代は乗り合わせで総額が決まるので頭割り。
   宿泊代・プレー代はひとり同額。ここを取り違えると集めすぎ・足りないが起きる。
   割り切れないときは切り上げる。足りないと幹事の持ち出しになるため（2026-09-08）。 */
{
  const D=app.blank();
  D.meta.budget.collect=[
    {label:"プレー代",amt:13500,mode:"each"},
    {label:"宿泊代",amt:11000,mode:"each"},
    {label:"ガソリン代・高速代",amt:37000,mode:"total"}];
  D.meta.use.keiba=false; D.meta.use.gto=false;
  P16(D); app.setDB(D);
  const C=app.collectPlan();
  chk('ひとり同額のものはそのまま', C.rows[0].v===13500&&C.rows[1].v===11000,
      C.rows.slice(0,2).map(r=>r.v).join(' / '));
  /* 37,000 ÷ 16 = 2312.5 → 切り上げて 2,313 */
  chk('総額は人数で割って切り上げる', C.rows[2].v===2313, C.rows[2].v+'円');
  chk('頭割りと分かる表示になる', /総額37,000円 ÷ 16名/.test(C.rows[2].l), C.rows[2].l);
  chk('ひとりあたり 26,813円', C.each===26813, C.each+'円');
  chk('16名で 429,008円', C.grand===429008, C.grand+'円');
  /* 2,313 × 16 = 37,008。37,000 との差 8円が余る */
  chk('切り上げの余りが分かる', C.over===8, C.over+'円');
  console.log('  -- 人数が変わると頭割りも変わる --');
  D.players[15].g=0; D.players[15].f=0; D.players[15].fee=false;
  const C2=app.collectPlan();
  chk('15名になる', C2.members===15, C2.members+'名');
  chk('15名なら 37,000÷15＝2,467円', C2.rows[2].v===2467, C2.rows[2].v+'円');
  chk('ひとり同額のものは変わらない', C2.rows[0].v===13500);
  console.log('  -- 数え方を取り違えたときの差 --');
  D.players[15].g=4; D.players[15].f=16; D.players[15].fee=true;
  const before=app.collectPlan().each;
  app.BG().collect[2].mode="each";
  const after=app.collectPlan().each;
  chk('取り違えると大きく変わる（気づける）', after-before>30000, `正しく${before}円 / 取り違えると${after}円`);
  app.BG().collect[2].mode="total";
}
console.log('  -- サンプル②は宿泊ありで作ってある --');
app.sampleHard(); global.flush();
{
  const C=app.collectPlan(), b=app.BG();
  chk('大会名で宿泊ありと分かる', /宿泊あり/.test(app.DB().meta.name), app.DB().meta.name);
  chk('経費が5項目', (b.collect||[]).length===5, (b.collect||[]).length+'項目');
  chk('宿泊代がある', (b.collect||[]).some(x=>/宿泊/.test(x.label)));
  chk('車代とガソリン代が「1台あたり」', (b.collect||[]).filter(x=>x.mode==="unit").length===2);
  chk('ひとりあたりが日帰りより高い', C.each>30000, C.each+'円');
  chk('切り上げの余りが出る', C.over>0, C.over+'円');
  chk('ひとりずつの支払額にも宿泊代が入る', app.settle()[0].play>25000, app.settle()[0].play+'円');
}

console.log('\n=== 車代・ガソリン代（集めて配車した担当へ返す）===');
/* 車の代金は「1台あたりの単価 × 台数」を払う人から集め、そのまま配車した担当へ返す。
   幹事が一度預かるだけなので、集めた額と返す額が一致しなければならない（2026-09-08）。 */
{
  const D=app.blank();
  D.meta.budget.collect=[
    {label:"プレー代",amt:13000,mode:"each"},
    {label:"車代（1台あたり）",amt:5000,mode:"unit"},
    {label:"ガソリン代（1台あたり）",amt:9250,mode:"unit"}];
  D.meta.use.keiba=false; D.meta.use.gto=false;
  P16(D); [0,4,8,12].forEach(i=>{D.players[i].cars=1;});
  app.setDB(D);
  chk('台数が数えられる', app.carCount()===4, app.carCount()+'台');
  chk('1台あたりの単価の合計 14,250円', app.carUnitSum()===14250, app.carUnitSum()+'円');
  const C=app.collectPlan();
  chk('車代は 5,000×4台÷16名＝1,250円', C.rows[1].v===1250, C.rows[1].v+'円');
  chk('ガソリン代は切り上げて 2,313円', C.rows[2].v===2313, C.rows[2].v+'円');
  chk('計算の内訳が見える', /5,000円 × 4台 ÷ 16名/.test(C.rows[1].l), C.rows[1].l);
  chk('ひとりあたり 16,563円', C.each===16563, C.each+'円');
  console.log('  -- 集めた額と返す額が一致する --');
  const S=app.settle();
  const got=app.carUnitSum()*app.carCount(), back=S.reduce((a,b)=>a+b.carBack,0);
  chk('集めた車の代金 57,000円', got===57000, got+'円');
  chk('返す合計と一致する', got===back, `集め${got} / 返し${back}`);
  chk('車を出した4名が受け取る', S.filter(r=>r.carBack>0).length===4);
  chk('ひとり 14,250円ずつ', S.filter(r=>r.carBack>0).every(r=>r.carBack===14250));
  chk('出さない人は0円', S.filter(r=>!r.cars).every(r=>r.carBack===0));
  chk('車の返金は支払額とは別（支払額は全員同じ）', new Set(S.map(r=>r.bill)).size===1, [...new Set(S.map(r=>r.bill))].join(','));
  console.log('  -- 1人1台で数える --');
  D.players[0].cars=2;
  const S2=app.settle();
  chk('2台と入っていても4台のまま', app.carCount()===4, app.carCount()+'台');
  chk('返金も1台ぶん', (S2.find(r=>r.n===D.players[0].n)||{}).carBack===14250);
  D.players[0].cars=1;
  console.log('  -- チェックで増やせる --');
  app.carSet(D.players[1].n,true);
  chk('5台になる', app.carCount()===5, app.carCount()+'台');
  chk('集めた額と返す額が一致', app.carUnitSum()*app.carCount()===app.settle().reduce((a,b)=>a+b.carBack,0));
  app.carSet(D.players[1].n,false);
  chk('外すと4台に戻る', app.carCount()===4, app.carCount()+'台');
  console.log('  -- 収支では行き先を分ける --');
  const B=app.budget();
  const carExp=B.exp.filter(x=>/配車した担当/.test(x.l)).reduce((a,x)=>a+x.v,0);
  chk('「配車した担当へ返す」が立つ', carExp===app.carUnitSum()*app.carCount(), carExp+'円');
  chk('プレー代は「プレー代の支払い」に立つ', B.exp.some(x=>x.l==="プレー代の支払い"));
  const inSum=B.inc.filter(x=>/の預かり/.test(x.l)&&!/キャンセル/.test(x.l)).reduce((a,x)=>a+x.v,0);
  const outSum=B.exp.filter(x=>!/キャンセル|穴埋め/.test(x.l)).reduce((a,x)=>a+x.v,0);
  chk('預かりの合計と支払いの合計が合う', inSum===outSum, `預かり${inSum} / 支払い${outSum}`);
  chk('収支に賞・予想・罰金の行が無い', !B.inc.concat(B.exp).some(x=>/原資|馬券|GTO|罰金|賞金|順位賞|技能賞/.test(x.l)),
      B.inc.concat(B.exp).map(x=>x.l).join('・'));
  console.log('  -- 台数が0なら車の項目は出ない --');
  D.players.forEach(p=>p.cars=0);
  const C3=app.collectPlan();
  chk('車の行が消える', C3.rows.length===1, C3.rows.map(r=>r.l).join(' / '));
  chk('ひとりあたりはプレー代だけ', C3.each===13000, C3.each+'円');
  chk('返す相手もいない', app.settle().every(r=>r.carBack===0));
}
console.log('  -- サンプル②で通しで確かめる --');
app.sampleHard(); global.flush();
{
  const S=app.settle();
  chk('4名が1台ずつ出している', app.carCount()===4, app.carCount()+'台');
  chk('集めた額と返す額が一致', app.carUnitSum()*app.carCount()===S.reduce((a,b)=>a+b.carBack,0));
  chk('お渡しは車の返金だけ（配当・賞金・罰金は無い）', S.every(r=>r.net===r.carBack));
}

console.log('\n=== プレーせず予想だけ参加する人 ===');
/* プレーの経費はかからない。予想にお金はかからない。順位・技能賞・罰金の対象にはならない。
   当日いちばん間違えやすいので、収支の全部を固定しておく（2026-09-08。V1 で金額の前提を改めた）。 */
app.sample(); global.flush();
{
  const D=app.DB(), i=15, v=D.players[i];
  app.voteOnly(i,true);
  chk('組と枠が外れる', +v.g===0&&+v.f===0, `組${v.g} 枠${v.f}`);
  chk('プレーの経費の対象から抜ける', v.fee===false);
  chk('投票は残る', v.vote===true);
  chk('車を出す台数も0になる', !v.cars);
  chk('出走者から抜ける', !app.RUN().some(p=>p.n===v.n), app.RUN().length+'名');
  chk('投票者には残る', app.VOT().some(p=>p.n===v.n), app.VOT().length+'名');
  const me=app.settle().find(r=>r.n===v.n);
  console.log('  -- この人から集めるもの --');
  chk('プレー代・賞品購入費はかからない（懇親会費だけ）', me.play===3000, me.play+'円');
  chk('支払額は懇親会費の 3,000円', me.bill===3000, me.bill+'円');
  const q0=me.bill; D.keiba.push({v:v.n,a:1,b:2,q:9});
  chk('予想の口を増やしても支払額は変わらない', app.settle().find(r=>r.n===v.n).bill===q0);
  D.keiba.pop();
  console.log('  -- 集計から外れる --');
  chk('順位に出ない', !app.standings().net.some(r=>r.n===v.n));
  chk('グロス下位3名にも入らない', !app.standings().worst3.some(r=>r.n===v.n));
  chk('罰金の勝負の対象にならない', !app.calcB().list.some(x=>x.n===v.n));
  chk('賞ももらえない', app.giftsOf(v.n).length===0, app.giftsOf(v.n).length);
  console.log('  -- 全体の数が合う --');
  chk('プレーの経費の対象が15名', app.feeMembers().length===15, app.feeMembers().length+'名');
  chk('見積りは15名で数える', app.collectPlan().members===15, app.collectPlan().members+'名');
  console.log('  -- 元に戻せる --');
  app.voteOnly(i,false);
  chk('プレーの経費の対象に戻る', v.fee===true&&app.feeMembers().length===16, app.feeMembers().length+'名');
  chk('ただし枠は自分で入れ直す（組と枠は別物）', +v.f===0, '枠'+v.f);
}
console.log('  -- 画面で見分けられる --');
app.sample(); global.flush();
app.voteOnly(15,true);
app.go('collect');
{
  const H=store['pane'].innerHTML;
  chk('集金表に「予想のみ」の印が出る', /予想のみ/.test(H));
  chk('予想にお金がかからないと説明する', /予想ゲームにお金はかかりません/.test(H));
  chk('人数が出る', /プレーせず予想だけの方が 1名/.test(H));
}
console.log('  -- サンプル②にも入っている --');
app.sampleHard(); global.flush();
{
  const D=app.DB(), only=D.players.filter(p=>!(+p.f>0)&&p.vote&&p.fee===false);
  chk('予想のみの人がいる', only.length>=1, only.map(p=>p.n).join('、'));
  const S=app.settle();
  only.forEach(p=>{const r=S.find(x=>x.n===p.n);
    chk(p.n+' はプレーの経費が0', r.play===0, `経費${r.play}`);});
}

console.log('\n=== 支払額は経費だけ（v68 の「一律と個別」の区分は無い） ===');
/* v68 は「一律（実費と原資）」と「個別（馬券・GTOの代金）」を分けて数えていた。
   V1 は個別（予想の代金）が無いので、支払額は参加のしかたで決まる1つの額になる */
app.sampleHard(); global.flush();
{
  const C=app.collectPlan(), S=app.settle();
  chk('見積りに予想の代金の項目が無い', ['gameRows','kEach','gEach','kMoney','gMoney','gameTotal','voters','fee'].every(k=>!(k in C)),
      Object.keys(C).join(','));
  chk('集める総額＝1人ずつの支払額の合計', C.grand===S.reduce((a,b)=>a+b.bill,0),
      `見積り${C.grand} / 実際${S.reduce((a,b)=>a+b.bill,0)}`);
  chk('プレーする方（経費の対象）の支払額は全員同じ',
      new Set(S.filter(r=>r.p.fee!==false&&!r.cancel).map(r=>r.bill)).size===1,
      [...new Set(S.filter(r=>r.p.fee!==false).map(r=>r.bill))].join('、'));
  app.go('meta');
  const HM=store['pane'].innerHTML;
  chk('大会設定に「集める総額」が出る', /集める総額/.test(HM));
  chk('大会設定に予想の代金の行が無い', !/個別　人によって違う|馬券の見込み|GTOの見込み/.test(HM));
  app.go('collect');
  const HB=store['pane'].innerHTML;
  chk('集金表に予想・賞金・払戻・罰金・お渡しの列が無い', !/>馬券<\/th>|>GTO<\/th>|賞金<\/th>|払戻|罰金<\/th>|お渡し/.test(HB));
  chk('集金表に「支払額」の列がある', /支払額<\/th>/.test(HB));
}

console.log('\n=== 1台あたりを設定しても台数が無いと0円 ===');
/* 2026-09-08、大会設定で車代・ガソリン代を「1台あたり」にしたのに収支に出てこない、
   という報告があった。原因は台数が未入力で単価 × 0台 = 0円になっていたこと。
   単価を入れたら台数も必ず入れてもらう作りにした。 */
app.sample(); global.flush();
{
  app.BG().collect.push({label:"車代（1台あたり）",amt:5000,mode:"unit",to:"play"});
  app.BG().collect.push({label:"ガソリン代（1台あたり）",amt:9250,mode:"unit",to:"play"});
  chk('単価は入っている', app.carUnitSum()===14250, app.carUnitSum()+'円');
  chk('台数はまだ0', app.carCount()===0, app.carCount()+'台');
  chk('内訳に車代の行が出ない（0円だから）', !app.collectPlan().rows.some(r=>/車代|ガソリン/.test(r.l)));
  app.go('meta');
  const H=store['pane'].innerHTML;
  chk('車を出す方が未選択だと赤く知らせる', /<b>車を出す方<\/b>がまだ選ばれていません/.test(H));
  chk('どちらかが空だと0円になると書いてある', /どちらかが空だと0円のまま/.test(H));
  chk('車を出す方の一覧が出る', /車を出す方<\/div>/.test(H));
  chk('出走者ぶんのチェックがある', (H.match(/carSet\(/g)||[]).length===app.RUN().length,
      (H.match(/carSet\(/g)||[]).length+'個 / 出走'+app.RUN().length+'名');
  app.carSet(app.DB().players[0].n,true);
  app.carSet(app.DB().players[1].n,true);
  chk('チェックした人数が台数になる', app.carCount()===2, app.carCount()+'台');
  const C2=app.collectPlan();
  chk('5,000円 × 2台 ÷ 16名 ＝ 625円', (C2.rows.find(r=>/車代/.test(r.l))||{}).v===625,
      (C2.rows.find(r=>/車代/.test(r.l))||{}).v+'円');
  chk('出した方へ返す額が立つ', app.settle().find(r=>r.n===app.DB().players[0].n).carBack===14250);
}

console.log('\n=== 「1台あたり」を選んだら、すぐ台数を入れられること ===');
/* 2026-09-08、「台数を入力する方法がない」という報告があった。台数の欄を出す条件が
   「金額が入っていること」だったため、項目を足した直後は欄そのものが現れなかった */
const setup=fn=>{app.sample(); global.flush(); fn();
  app.go('meta'); const H=store['pane'].innerHTML;
  app.go('players'); const P=store['pane'].innerHTML;
  return {H,P};};
{
  let r=setup(()=>app.cAdd('車代（1台あたり）','unit','play'));
  chk('足した直後から大会設定に台数の欄が出る', /carSet\(/.test(r.H));
  chk('参加者タブにも「車」の列が出る', />車(<br>|<\/th>)/.test(r.P));
  chk('金額が空だと知らせる', /1台あたりの金額/.test(r.H));
  r=setup(()=>{app.cAdd('車代（1台あたり）','unit','play'); app.BG().collect[app.BG().collect.length-1].amt=5000;});
  chk('金額を入れても台数の欄は出たまま', /carSet\(/.test(r.H));
  chk('金額の案内は消える', !/1台あたりの金額/.test(r.H));
  r=setup(()=>{app.BG().collect[0].mode="unit";});
  chk('既存の行を切り替えただけでも台数の欄が出る', /carSet\(/.test(r.H));
  r=setup(()=>{});
  chk('「1台あたり」の項目が無ければ欄も出ない', !/carSet\(/.test(r.H)&&!/>車(<br>|<\/th>)/.test(r.P));
}

console.log('\n=== 参加のしかたを1つの選択にまとめる ===');
/* 「投票」と「投票のみ」を別々のチェックにしていたが、軸が違い区別がつかなかった。3択にまとめた（2026-09-08） */
app.sample(); global.flush();
{
  const D=app.DB(), i=15, p=D.players[i];
  app.joinSet(i,"both");
  chk('プレー＋予想：組と枠が残る・投票する・経費の対象', +p.g>0&&+p.f>0&&p.vote===true&&p.fee!==false);
  chk('読み戻せる（both）', app.joinOf(p)==="both");
  app.joinSet(i,"play");
  chk('プレーのみ：投票しない・経費はかかる', p.vote===false&&p.fee!==false);
  chk('出走者には残り、投票者から抜ける', app.RUN().some(x=>x.n===p.n)&&!app.VOT().some(x=>x.n===p.n));
  chk('プレーのみでも支払額は同じ（予想にお金はかからない）', app.billOf(p)===19500, app.billOf(p));
  app.joinSet(i,"vote");
  chk('予想のみ：組と枠が外れ、経費の対象から抜ける', +p.g===0&&+p.f===0&&p.fee===false&&!p.cars);
  chk('予想のみの支払額は懇親会費だけ', app.billOf(p)===3000, app.billOf(p));
  chk('読み戻せる（vote）', app.joinOf(p)==="vote");
  app.joinSet(i,"both");
  chk('戻すと経費の対象・投票も戻る', p.fee!==false&&p.vote===true);
  app.go('players');
  const H=store['pane'].innerHTML;
  chk('見出しが「参加のしかた」', /参加のしかた<\/th>/.test(H));
  chk('3つの選択肢が出る', ['both','play','vote'].every(v=>H.includes(`<option value="${v}"`)));
  chk('人数ぶんの選択がある', (H.match(/joinSet\(/g)||[]).length===D.players.length);
  chk('3択の意味が書いてある', /プレー＋予想/.test(H)&&/プレーのみ/.test(H)&&/予想のみ/.test(H));
}

console.log('\n=== 参加者画面に原資・個別額が残っていない ===');
/* v68 は「原資の対象」「個別額」の欄を持っていた（2026-09-08 には予想のみの人に標準額が薄く出る不具合があった）。
   V1 は原資が無いので、欄ごと無い */
app.sample(); global.flush();
{
  app.joinSet(15,"vote");
  app.go('players');
  const H=store['pane'].innerHTML;
  chk('原資・個別額の欄が無い', !/原資|個別額|feeAmt/.test(H));
  chk('金額の入った入力欄が薄く出ていない', !/placeholder="[\d,]+"/.test(H));
  chk('要約は「プレーの経費」', /プレーの経費/.test(H));
  chk('参加者に feeAmt を持たない', app.DB().players.every(p=>!('feeAmt' in p)));
}

console.log('\n=== 支払額の丸めと繰越金 ===');
/* 当日の集金でお釣りを出さないよう、ひとりの支払額を500円や1,000円に切り上げる。
   切り上げたぶんは幹事の取り分ではなく、繰越金として積む（2026-09-08）。 */
app.sampleHard(); global.flush();
{
  app.BG().roundUnit=0;
  let S=app.settle();
  chk('丸めない：切り上げは起きない', S.every(r=>r.roundUp===0&&r.bill===r.billRaw));
  chk('丸めない：収支に繰越金の行が立たない', !app.budget().inc.some(x=>/端数の繰越/.test(x.l)));
  app.BG().roundUnit=500;
  S=app.settle();
  chk('500円単位：全員が500円の倍数', S.every(r=>r.bill%500===0));
  chk('切り上げなので元の額を下回らない', S.every(r=>r.bill>=r.billRaw));
  chk('切り上げ幅は500円未満', S.every(r=>r.roundUp<500), Math.max(...S.map(r=>r.roundUp))+'円');
  const r500=S.reduce((a,x)=>a+x.roundUp,0);
  chk('切り上げたぶんが繰越金に立つ', (app.budget().inc.find(x=>/端数の繰越/.test(x.l))||{v:0}).v===r500, r500+'円');
  app.BG().roundUnit=1000;
  S=app.settle();
  chk('1,000円単位：全員が1,000円の倍数', S.every(r=>r.bill%1000===0));
  chk('500円単位より繰越が増える', S.reduce((a,x)=>a+x.roundUp,0)>r500);
  app.BG().roundUnit=500;
  const C=app.collectPlan();
  chk('見込みにも効く', C.eachRounded%500===0&&C.roundEach===C.eachRounded-C.each&&C.unit===500, C.each+'円 → '+C.eachRounded+'円');
  {
    const D=app.blank(); D.meta.budget.roundUnit=1000;
    D.meta.budget.collect=[{label:"プレー代",amt:5000,mode:"each",to:"play"}];
    D.players.push({n:"甲",org:"",bd:"1970-01-01",g:1,f:1,vote:true,fee:true});
    app.setDB(D);
    const r=app.settle()[0];
    chk('5,000円ちょうどなら切り上げない', r.bill===5000&&r.roundUp===0, `${r.billRaw} → ${r.bill}`);
  }
  app.sampleHard(); global.flush(); app.BG().roundUnit=500;
  app.go('meta');
  const H=store['pane'].innerHTML;
  chk('丸めの設定欄がある', /gSet\('roundUnit'/.test(H)&&/丸めない/.test(H)&&/500円単位/.test(H)&&/1,000円単位/.test(H));
  chk('幹事の取り分ではないと書いてある', /幹事の取り分ではなく/.test(H));
  chk('切り上げ後の目安が出る', /切り上げ後/.test(H));
  app.go('collect');
  const M=store['pane'].innerHTML;
  chk('集金表に切り上げの列が出る', /切り上げ<\/th>/.test(M));
  chk('繰越金の説明が出る', /繰越金<\/b>として積まれます/.test(M)&&/幹事の取り分ではありません/.test(M));
}

console.log('\n=== 賞品購入費の上限（SPEC-V1.md 3.3） ===');
/* 参加費で賞品を買うときは、1人あたりの上限を持つ。上限の既定値は弁護士の確認待ち（U1）なので空欄。
   上限を超える額は入力の時点で受け付けない */
app.sample(); global.flush();
{
  chk('サンプルは上限3,000円・賞品購入費3,000円で問題なし', app.prizeCapIssue()===''&&app.prizeEachOf()===3000, app.prizeCapIssue()||'なし');
  const i=app.BG().collect.findIndex(x=>x.kind==="prize");
  A=[]; app.cEdit(i,'amt','4000');
  chk('上限を超える額は入らない', app.BG().collect[i].amt===3000, app.BG().collect[i].amt);
  chk('理由を知らせる', A.some(m=>/上限/.test(m)), A[0]);
  app.cEdit(i,'amt','2500');
  chk('上限以下なら入る', app.BG().collect[i].amt===2500);
  app.capSet('');
  chk('上限が空欄だと「未入力」と知らせる', /未入力/.test(app.prizeCapIssue()), app.prizeCapIssue());
  app.go('meta');
  chk('大会設定に上限の欄と弁護士確認の案内が出る', /賞品購入費の上限（1人あたり・円）/.test(store['pane'].innerHTML)&&/弁護士に確認/.test(store['pane'].innerHTML));
  if(app.flowSteps){ const st=app.flowSteps().find(x=>/当日集める額/.test(x.l||x.label||""));
    chk('上限が未入力のあいだは「当日集める額を決める」が済みにならない', !st||!st.done, st?String(st.done):'項目なし'); }
  app.capSet('2000');
  chk('いまの額（2,500円）より低い上限にすると「超えています」', /超えています/.test(app.prizeCapIssue()), app.prizeCapIssue());
  app.capSet('3000');
  chk('上限を戻すと問題なし', app.prizeCapIssue()==='');
  const D=app.blank(); app.setDB(D);
  chk('白紙の大会では上限は空欄（既定値を持たない）', app.BG().prizeCap==="");
  chk('賞品購入費の項目が無ければ上限は問われない', app.prizeCapIssue()==='');
}

console.log('\n=== 経費が余ったときの扱い（SPEC-V1.md 3.5） ===');
app.sample(); global.flush();
{
  chk('既定は繰越金', app.BG().leftover==='carry');
  app.BG().income.push({label:"協賛金",amt:16000});
  app.go('money');
  chk('余りを繰越金にすると書いてある', /繰越金<\/b>にします/.test(store['pane'].innerHTML));
  app.leftSet('return');
  app.go('money');
  const H=store['pane'].innerHTML;
  chk('均等に返すと、1人あたりの額が出る', /全員に均等に返します<\/b>（16名で割ると1人あたり 1,000円/.test(H),
      (H.match(/全員に均等に返します<\/b>[^<]*/)||['見つからない'])[0]);
  chk('成績で差をつける設定は無い', !/順位で|成績で返/.test(H));
}

console.log('\n合計 NG: '+ng);
