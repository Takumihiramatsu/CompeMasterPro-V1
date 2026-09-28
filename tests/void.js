/* アプリの場所。テストと同じ場所の site/ を先に見て、無ければ ../docs/ を使う。
   リポジトリでは tests/ と docs/ が並ぶ構成なので、どちらでも動く */
const _P=require('path'),_F=require('fs');
const _DIR=[_P.join(__dirname,'site'),_P.join(__dirname,'..','docs')]
  .find(d=>_F.existsSync(_P.join(d,'pc.html')))||_P.join(__dirname,'site');
const APP={dir:_DIR+'/', get pc(){return this.dir+'pc.html'}, get scan(){return this.dir+'index.html'}};
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
let ALERT=[];global.alert=m=>ALERT.push(m);global.confirm=()=>true;
global.URL={createObjectURL:()=>'',revokeObjectURL(){}};global.Blob=class{};
global.localStorage={setItem(){},getItem(){return null},removeItem(){}};
['show','hud','dots','tabs','saveState','hdTitle','pane','sndBtn','kp','gp','kpv','gpv',
 'ga_v','ga_1','ga_2','ga_3','ga_q','ga_msg','ka_v','ka_a','ka_b','ka_q','ka_msg']
  .forEach(id=>{global[id]=doc.getElementById(id)});
const app=new Function(src+`;return {DB:()=>DB,billOf,blankDB:()=>{DB=blank();return DB},blank,sample,go,render,
  kVoid,gVoid,calcK,calcG,votes,calcB,ledger,settle,parseGto,parseKeiba,gAdd,RUN,FRAMES,
  vSum,vBets,vHelp,applyScores,betsTab:typeof betsTab==='function'?betsTab:()=>{}};`)();
const ok=(l,c,x='')=>console.log((c?'  OK  ':'  NG  ')+l+(x!==''&&x!==undefined?'  '+x:''));
let ng=0;const chk=(l,c,x)=>{if(!c)ng++;ok(l,c,x)};

const setup=()=>{app.sample();global.flush();return app.DB();};
let DB=setup();
const N=DB.players.map(p=>p.n);

console.log('=== 1. 無効の判定 ===');
chk('正しい馬券の口は有効', app.kVoid({v:N[0],a:1,b:2,q:1})==='');
/* サンプルは8組8枠。存在しない枠番で確かめる */
chk('無くなった枠を指名した口は無効',
  app.kVoid({v:N[0],a:1,b:12,q:1})==='無くなった枠を指名しています', app.kVoid({v:N[0],a:1,b:12,q:1}));
chk('ゾロ目は無効にしない', app.kVoid({v:N[0],a:3,b:3,q:1})==='');
chk('正しいGTOの口は有効', app.gVoid({v:N[0],p:[N[1],N[2],N[3]],q:1})==='');
chk('同じ人を2回指名した口は無効',
  app.gVoid({v:N[0],p:[N[1],N[1],N[3]],q:1})==='同じ人を2回以上指名しています');
chk('3名そろっていない口は無効',
  app.gVoid({v:N[0],p:[N[1],N[2]],q:1})==='指名が3名そろっていません');
chk('空欄を含む口は無効',
  app.gVoid({v:N[0],p:[N[1],'',N[3]],q:1})==='指名が3名そろっていません');
chk('名簿にない人を指名した口は無効',
  /出走しない方を指名/.test(app.gVoid({v:N[0],p:[N[1],'幽霊　太郎',N[3]],q:1})));
chk('理由に該当者の氏名が入る',
  app.gVoid({v:N[0],p:[N[1],'幽霊　太郎',N[3]],q:1}).includes('幽霊　太郎'));

console.log('\n=== 2. 出走を取り消すと、その人を指名した口が無効になる ===');
DB=setup();
/* GTOで実際に指名されている人を選ぶ。指名されていないと無効口が出ない */
const target=N[13];
const before=app.calcG();
chk('取り消し前は無効ゼロ', before.badUnits===0, before.badUnits);
const vg=app.votes().find(x=>x.n===target).c;
chk(target+' の得票がある（'+vg+'票）', vg>0);
DB.players.find(p=>p.n===target).g=0;
DB.players.find(p=>p.n===target).f=0;
chk('出走者から外れた', !app.RUN().some(p=>p.n===target));
const after=app.calcG();
const hitRows=DB.gto.filter(r=>r.p.includes(target));
const hitQ=hitRows.reduce((s,r)=>s+r.q,0);
chk('その人を指名した口がすべて無効になった', after.badUnits===hitQ, after.badUnits+' / '+hitQ);
chk('有効口＝全口−無効口', after.units===before.units-hitQ, after.units);
/* V1（2026-09-28、M1）：予想に代金は無いので、売上・返金の検査は「数えない」ことの検査に置き換えた */
chk('無効口の投票者ごとの口数が出る（返金ではなく数えない口として）',
  Object.values(after.badBy).reduce((a,b)=>a+b,0)===hitQ, JSON.stringify(after.badBy));
chk('入力された口数（有効＋無効）は変わらない', after.allUnits===before.units, after.allUnits);

console.log('\n=== 3. 無効口は得票数に数えない（選抜者・罰金に波及する）===');
chk('外れた本人の得票は0', (app.votes().find(x=>x.n===target)||{c:0}).c===0);
const others = hitRows.flatMap(r=>r.p).filter(n=>n!==target);
const lostVotes={};others.forEach(n=>lostVotes[n]=(lostVotes[n]||0)+0);
hitRows.forEach(r=>r.p.forEach(n=>{if(n!==target)lostVotes[n]=(lostVotes[n]||0)+r.q;}));
const someone=Object.keys(lostVotes)[0];
const b4=before?null:null;
DB2=null;
{
  const now=(app.votes().find(x=>x.n===someone)||{c:0}).c;
  const fresh=setup();
  const orig=(app.votes().find(x=>x.n===someone)||{c:0}).c;
  DB=app.DB();
  DB.players.find(p=>p.n===target).g=0;DB.players.find(p=>p.n===target).f=0;
  const cut=(app.votes().find(x=>x.n===someone)||{c:0}).c;
  chk('同じ口に相乗りしていた人の票も減る（'+orig+'→'+cut+'）', cut===orig-lostVotes[someone], cut);
}
chk('得票の合計＝有効口×3', app.votes().reduce((a,b)=>a+b.c,0)===app.calcG().units*3,
  app.votes().reduce((a,b)=>a+b.c,0));

console.log('\n=== 4. 的中は有効口だけで数える ===');
DB=setup();
DB.players.find(p=>p.n===target).g=0;DB.players.find(p=>p.n===target).f=0;
const live=DB.gto.filter(r=>!app.gVoid(r));
DB.result.low=live[0].p.slice();
DB.meta.gMode='3連単';
let G=app.calcG();
chk('的中口が出た', G.win>0, G.win);
chk('的中口数は有効な口のうち当たった口だけ', G.win===live.filter(r=>r.p.join('|')===DB.result.low.join('|')).reduce((a,r)=>a+r.q,0), G.win);
const badVoter=DB.gto.find(r=>app.gVoid(r)).v;
chk('無効口の投票者に「数えない口数」が立つ', (G.badBy[badVoter]||0)>0, G.badBy[badVoter]);
chk('的中なしの扱いにはならない', G.nohit===false);

console.log('\n=== 5. 的中ゼロでも返金は無い（お金を集めていない） ===');
DB.result.low=[N[0],N[1],N[2]];
const zero=DB.gto.filter(r=>!app.gVoid(r)&&r.p.join('|')===[N[0],N[1],N[2]].join('|'));
if(zero.length){DB.result.low=['幽霊　太郎',N[1],N[2]];}
G=app.calcG();
chk('的中者なし', G.win===0, G.win);
chk('的中なしの印が立つ', G.nohit===true);
chk('返金の項目を持たない', !('refund' in G)&&!('refundTotal' in G)&&!('refundBy' in G));
chk('無効の口は有効口と別に数える', G.badUnits>0&&G.units+G.badUnits===G.allUnits,
  G.units+' + '+G.badUnits+' = '+G.allUnits);

console.log('\n=== 6. 精算：予想は支払額に入らない（V1・M1） ===');
DB=setup();
DB.players.find(p=>p.n===target).g=0;DB.players.find(p=>p.n===target).f=0;
const liveRows=DB.gto.filter(r=>!app.gVoid(r));
DB.result.low=liveRows[0].p.slice();DB.meta.gMode='3連単';
DB.result.frame='1-2';
const L=app.ledger();
const bv=DB.gto.filter(r=>app.gVoid(r));
const bvName=bv[0].v;
const row=L.find(x=>x.n===bvName);
chk('台帳に無効の口数の欄がある', row.bad>0, row.bad);
chk('台帳にお金の欄（払い・払戻・罰金）が無い', !('paid' in row)&&!('back' in row)&&!('fine' in row));
const S=app.settle();
const sr=S.find(x=>x.n===bvName);
chk('収支表に払戻・賞金・罰金の欄が無い', !('back' in sr)&&!('pz' in sr)&&!('fine' in sr));
chk('無効の口があっても支払額は経費だけ', sr.bill===app.billOf(sr.p), sr.bill);

console.log('\n=== 7. 入力の時点で弾く（すり抜けさせない）===');
DB=setup();
DB.meta.betsClosed=false;   /* サンプル①は予想を締め切った状態（段階6） */
const before2=DB.gto.length;
global.ga_v.value=N[0];global.ga_1.value=N[1];global.ga_2.value=N[1];global.ga_3.value=N[3];
global.ga_q.value='1';
app.gAdd();
chk('画面から同じ人の2回指名は追加できない', DB.gto.length===before2, DB.gto.length);
chk('理由が画面に出る', /同じ人を2回以上/.test(global.ga_msg.textContent), global.ga_msg.textContent);
const pv=app.parseGto(N[0]+'\t'+N[1]+'\t'+N[1]+'\t'+N[3]+'\t2');
chk('貼り付けでも同じ人の2回指名は×', pv[0].ok===false);
chk('貼り付けの理由が「同じ人を2回以上」になる', /同じ人を2回以上指名/.test(pv[0].why), pv[0].why);
chk('理由に該当者の氏名が入る', pv[0].why.includes(N[1]), pv[0].why);
const pv2=app.parseGto(N[0]+'\t'+N[1]+'\t幽霊　太郎\t'+N[3]+'\t2');
chk('貼り付けで名簿外の指名は×', pv2[0].ok===false);
const pv3=app.parseGto(N[0]+'\t'+N[0]+'\t'+N[1]+'\t'+N[2]+'\t1');
chk('自分自身への投票は○のまま（誤検知しない）', pv3[0].ok===true, pv3[0].why||'—');
chk('自分を指名した口は無効にならない',
  app.gVoid({v:N[0],p:[N[0],N[1],N[2]],q:1})==='');
chk('自分の枠への投票も無効にならない', app.kVoid({v:N[0],a:1,b:1,q:1})==='');

console.log('\n=== 8. 判定を止めるガード（名簿・枠がまだ無いとき）===');
DB=app.blankDB();
chk('出走者がいなければGTOは無効にしない', app.gVoid({v:'甲',p:['甲','乙','丙'],q:1})==='');
chk('枠がなければ馬券は無効にしない', app.kVoid({v:'甲',a:1,b:2,q:1})==='');
chk('無効ゼロで計算が壊れない', app.calcG().badUnits===0&&app.calcK().badUnits===0);

console.log('\n=== 9. 画面に出る ===');
DB=setup();
DB.players.find(p=>p.n===target).g=0;DB.players.find(p=>p.n===target).f=0;
app.vSum();
const sum=global.pane.innerHTML;
chk('集計タブに無効の一覧が出る', /無効になった口/.test(sum));
chk('一覧に理由が載る', /出走しない方を指名/.test(sum));
chk('無効の口は数えないと書いてある', /的中にも得票にも数えません/.test(sum));
chk('返金の案内が出ない', !/お返しします/.test(sum));
/* 段階6で馬券とGTOを画面の中で切り替えるようにした。無効の口はGTOにあるので切り替えて見る */
app.betsTab('g');
app.vBets();
const bets=global.pane.innerHTML;
chk('予想入力タブの行に無効の印が付く', /無効：/.test(bets));
chk('無効の口数が出る（返金額は出ない）', /口（数えません）/.test(bets)&&!/円 返金/.test(bets));
app.vHelp();
const help=global.pane.innerHTML;
chk('使い方に「無効になる口」の節がある', /無効になる口/.test(help));
/* 2026-09-18：空欄ではなく「ノーカード」の印で区別するようにしたので、節の名前も変えた */
chk('使い方に棄権・ノーカードの節がある', /棄権・ノーカード/.test(help)&&/「ノーカード」に印/.test(help));
chk('得票は有効な口だけと書いてある', /有効な口だけ/.test(help));
chk('無くなった枠の扱いが書いてある', /枠そのものが無くなった/.test(help));

console.log('\n=== 10. 何も無効が無いときは何も出ない（既存の見た目を壊さない）===');
DB=setup();
app.vSum();
chk('無効ゼロなら一覧は出ない', !/無効になった口/.test(global.pane.innerHTML));
app.vBets();
chk('無効ゼロなら行に印は付かない', !/無効：/.test(global.pane.innerHTML));
const K0=app.calcK(),G0=app.calcG();
chk('無効ゼロなら有効＝収納ベース', K0.units===K0.allUnits&&G0.units===G0.allUnits);
chk('無効ゼロなら売上も一致', K0.sales===K0.allSales&&G0.sales===G0.allSales);

console.log('\n'+(ng?'NG '+ng+' 件':'すべて合格'));
process.exit(ng?1:0);
