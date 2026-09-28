/* 2026-09-28 追加（V1・M0）：保存場所の分離の検証。
   V1 は v68（社内版）と同じ端末・同じドメインで開かれることがある。v68 のままだと
     ・自動保存のキー（golfCompe.autosave.v2）が同じで、V1 を開くと社内版の大会（馬券・罰金入り）を読み込む
     ・sw.js が「自分以外のキャッシュをすべて消す」ので、互いのオフライン用キャッシュを消し合う
     ・ゴルフ場専用版どうしでも、世代の控え（gens）と最近のファイル（recent）が混ざる
   V1 では端末に残すものをすべて cmp1. で始め、キャッシュの掃除は cmp1- で始まるものだけにした。
   直す前（v68 のコピー）に当てて落ちることを確かめてある。
   アプリの場所。テストと同じ場所の site/ を先に見て、無ければ ../docs/ を使う */
const _P=require('path'),_F=require('fs');
const _DIR=[_P.join(__dirname,'site'),_P.join(__dirname,'..','docs')]
  .find(d=>_F.existsSync(_P.join(d,'pc.html')))||_P.join(__dirname,'site');
const APP={dir:_DIR+'/', get pc(){return this.dir+'pc.html'}};
const fs=require('fs');
const h=fs.readFileSync(APP.pc,'utf8');
const src=h.slice(h.indexOf('<script>')+8,h.lastIndexOf('</script>'));
const ok=(l,c,x='')=>console.log((c?'  OK  ':'  NG  ')+l+(x!==''&&x!==undefined?'  '+x:''));
let ng=0;const chk=(l,c,x)=>{if(!c)ng++;ok(l,c,x)};

/* ---- 器（backup.js と同じ作り。localStorage は値が実際に残るもの） ---- */
function boot(venue){
  const store={};const mk=id=>({id,value:'',textContent:'',className:'',checked:false,style:{},files:[],
    _html:'',get innerHTML(){return this._html},set innerHTML(v){this._html=v},
    classList:{add(){},remove(){},toggle(){},contains:()=>false},
    addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],insertAdjacentHTML(){},click(){},focus(){},
    setAttribute(){},appendChild(){}});
  const doc={documentElement:{style:{setProperty(){}},requestFullscreen(){}},
    body:{className:'',classList:{add(){},remove(){},contains:()=>false}},
    getElementById:id=>store[id]||(store[id]=mk(id)),querySelector:()=>null,querySelectorAll:()=>[],
    addEventListener(){},createElement:()=>mk('a'),title:''};
  global.document=doc;
  global.window={AudioContext:function(){throw 0},addEventListener(){}};
  if(venue) global.window.VENUE_CONFIG=venue;
  const T=[];global.setTimeout=f=>{T.push(f);return T.length};
  global.setInterval=()=>1;global.clearInterval=()=>{};global.clearTimeout=()=>{};
  global.performance={now:()=>0};global.requestAnimationFrame=()=>{};
  global.alert=()=>{};global.confirm=()=>true;
  const out={blob:null};
  global.URL={createObjectURL:()=>'blob:',revokeObjectURL(){}};
  global.Blob=class{constructor(a){out.blob=a[0];}};
  const LSD={};
  global.localStorage={setItem(k,v){LSD[k]=String(v)},getItem(k){return (k in LSD)?LSD[k]:null},removeItem(k){delete LSD[k]}};
  global.FileReader=class{ readAsText(f){ this.result=f._text; this.onload(); } };
  ['show','hud','dots','tabs','saveState','hdTitle','pane','sndBtn','jsonFile']
    .forEach(id=>{global[id]=doc.getElementById(id)});
  const app=new Function(src+`;return {DB:()=>DB,setDB:d=>{DB=d},blank,autoSave,loadAuto,pushGen,recentAdd,
    dlJson,upJson,LSKEY:typeof LSKEY!=="undefined"?LSKEY:"",GKEY:typeof GKEY!=="undefined"?GKEY:"",
    RKEY:typeof RKEY!=="undefined"?RKEY:""};`)();
  return {app,LSD,flush:()=>T.splice(0).forEach(f=>{try{f()}catch(e){}}),out};
}
const person=n=>({n,org:'',bd:'',g:0,f:0,vote:true,fee:true,feeAmt:'',join:'both'});

console.log('=== 1. 端末に残すキーはすべて cmp1. で始まる ===');
{
  const {app,LSD,flush}=boot();
  chk('自動保存のキー', app.LSKEY==='cmp1.autosave', app.LSKEY);
  chk('世代の控えのキー', app.GKEY==='cmp1.gens', app.GKEY);
  chk('最近のファイルのキー', app.RKEY==='cmp1.recent', app.RKEY);
  const D=app.blank(); D.players.push(person('甲　一郎')); app.setDB(D);
  app.autoSave(); flush(); app.pushGen(); app.recentAdd('練習.json');
  const keys=Object.keys(LSD);
  chk('実際に書いたキーが3つそろう', ['cmp1.autosave','cmp1.gens','cmp1.recent'].every(k=>keys.includes(k)), keys.join(','));
  chk('cmp1. 以外のキーを書かない', keys.every(k=>k.startsWith('cmp1.')), keys.filter(k=>!k.startsWith('cmp1.')).join(',')||'なし');
  /* コード全体で、localStorage に渡すキーが決めた4つ（3つ＋書き込み可否を調べる __t）だけであること */
  const args=[...src.matchAll(/localStorage\.(?:setItem|getItem|removeItem)\(\s*([^,)]+)/g)].map(m=>m[1].trim());
  const allowed=['LSKEY','GKEY','RKEY','"__t"'];
  chk('localStorage に渡すキーは決めたものだけ', args.length>0&&args.every(a=>allowed.includes(a)),
      [...new Set(args)].filter(a=>!allowed.includes(a)).join(',')||[...new Set(args)].join(','));
}

console.log('\n=== 2. v68（社内版）の自動保存を読み込まない ===');
{
  const {app,LSD,flush}=boot();
  const old=app.blank(); old.players.push(person('社内　太郎')); old.keiba.push({v:'社内',a:1,b:2,q:3});
  LSD['golfCompe.autosave.v2']=JSON.stringify({at:1,db:old});
  LSD['golfCompe.autosave.gens.v1']=JSON.stringify([{at:1,db:old}]);
  chk('社内版の自動保存があっても、起動時に拾わない', app.loadAuto()===null);
  const D=app.blank(); D.players.push(person('甲　一郎')); app.setDB(D); app.autoSave(); flush();
  chk('自動保存は実際に書かれている', !!LSD[app.LSKEY]);
  chk('社内版の自動保存を上書きしない', JSON.parse(LSD['golfCompe.autosave.v2']).db.keiba.length===1);
}

console.log('\n=== 3. ゴルフ場専用版では3つのキーとも施設ごとに分かれる ===');
{
  const {app,LSD,flush}=boot({slug:'test-cc',name:'テストCC'});
  chk('自動保存', app.LSKEY==='cmp1.autosave.test-cc', app.LSKEY);
  chk('世代の控え（v68 では分かれていなかった）', app.GKEY==='cmp1.gens.test-cc', app.GKEY);
  chk('最近のファイル（v68 では分かれていなかった）', app.RKEY==='cmp1.recent.test-cc', app.RKEY);
  const D=app.blank(); D.players.push(person('甲　一郎')); app.setDB(D);
  app.autoSave(); flush(); app.pushGen(); app.recentAdd('練習.json');
  chk('素の版のキーを書かない', !Object.keys(LSD).some(k=>['cmp1.autosave','cmp1.gens','cmp1.recent'].includes(k)),
      Object.keys(LSD).join(','));
}

console.log('\n=== 4. 大会ファイルの札（app・schema） ===');
{
  const {app,out}=boot();
  const D=app.blank(); D.meta.name='札の確認'; D.players.push(person('甲　一郎')); app.setDB(D);
  app.dlJson();
  let f={}; try{ f=JSON.parse(out.blob); }catch(e){}
  chk('書き出したファイルに app が付く', f.app==='CompeMasterPro-V1', f.app);
  chk('書き出したファイルに schema が付く', f.schema===1, f.schema);
  chk('大会データ本体も入っている', !!f.meta&&f.meta.name==='札の確認');
  app.setDB(app.blank()); app.upJson({name:'札の確認.json',_text:out.blob});
  const L=app.DB();
  chk('読み込むと大会が戻る', L.meta.name==='札の確認'&&L.players.length===1);
  chk('札は大会データに残らない', !('app' in L)&&!('schema' in L), Object.keys(L).filter(k=>k==='app'||k==='schema').join(',')||'なし');
  /* 札の無いファイルは v68（社内版）のもの。M0 ではそのまま読む。予想・賞金を捨てる処理は M1 で足す */
  const v68=app.blank(); v68.meta.name='社内版のファイル';
  app.upJson({name:'v68.json',_text:JSON.stringify(v68)});
  chk('札の無い（v68 の）ファイルも読める', app.DB().meta.name==='社内版のファイル');
}

console.log('\n=== 5. 配布物（sw.js・マニフェスト・404.html） ===');
const sw=fs.readFileSync(APP.dir+'sw.js','utf8');
const VER=(sw.match(/const VER\s*=\s*"([^"]+)"/)||[])[1]||'';
chk('キャッシュ名が cmp1- で始まる', VER.startsWith('cmp1-'), VER);
const man=JSON.parse(fs.readFileSync(APP.dir+'pc.webmanifest','utf8'));
chk('マニフェストの id が v68 と違う', man.id&&man.id!=='/golf-compe-pc/', man.id);
chk('マニフェストの名前に V1', /V1/.test(man.name)&&/V1/.test(man.short_name), man.short_name);
const nf=fs.readFileSync(APP.dir+'404.html','utf8');
chk('404.html が v68 の置き場所（/CompeMasterPro/）へ送らない',
    !/(href|url|replace)[=( "']*\/CompeMasterPro\//.test(nf));

/* sw.js を実際に動かし、activate で消すキャッシュを確かめる */
const H={};const deleted=[];
const names=['compe-v68','compe-v67','cmp1-1.0.0-dev.0',VER,'someone-else'];
const ctx={addEventListener:(t,f)=>{H[t]=f},skipWaiting(){},clients:{claim:()=>Promise.resolve()}};
const caches={keys:()=>Promise.resolve(names.slice()),delete:k=>{deleted.push(k);return Promise.resolve(true)},
  open:()=>Promise.resolve({addAll:()=>Promise.resolve(),put(){}}),match:()=>Promise.resolve(null)};
new Function('self','caches','fetch','location',sw)(ctx,caches,()=>Promise.reject(0),{origin:'https://example.test'});
let waited=null;
if(H.activate) H.activate({waitUntil:p=>{waited=p}});
Promise.resolve(waited).then(()=>{
  chk('activate がある', !!H.activate);
  chk('自分の古い版（cmp1-…）は消す', deleted.includes('cmp1-1.0.0-dev.0'), deleted.join(',')||'何も消さない');
  chk('いまの版は消さない', !deleted.includes(VER));
  chk('v68（compe-v…）のキャッシュを消さない', !deleted.some(k=>k.startsWith('compe-v')), deleted.join(',')||'なし');
  chk('他人のキャッシュを消さない', !deleted.includes('someone-else'));
  console.log('\n合計 NG: '+ng);
});
