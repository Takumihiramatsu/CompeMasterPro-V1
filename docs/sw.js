/* オフラインで動かすためのキャッシュ。ファイルを更新したら VER を上げてください */
const VER = "cmp1-1.0.0-dev.1";
/* V1（2026-09-28、M0）：掃除するのは自分の接頭辞（cmp1-）の古い版だけ。
   v68 の sw.js は「自分以外のキャッシュをすべて消す」作りで、同じドメインに別のアプリを置くと
   相手のオフライン用キャッシュまで消していた。V1 は他人のキャッシュに触らない */
const PREFIX = "cmp1-";
const FILES = [
  "./", "./index.html", "./pc.html", "./pc.webmanifest",
  "./icon-192.png", "./icon-512.png", "./icon-512-maskable.png", "./apple-touch-icon.png"
];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(VER).then(c => c.addAll(FILES).catch(() => {})));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith(PREFIX) && k !== VER).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* まずキャッシュ、無ければ通信。取得できたら次回のために保存する */
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => {
      if (hit) {
        fetch(req).then(res => {
          if (res && res.ok) caches.open(VER).then(c => c.put(req, res.clone()));
        }).catch(() => {});
        return hit;
      }
      return fetch(req).then(res => {
        if (res && res.ok && new URL(req.url).origin === location.origin) {
          const cp = res.clone();
          caches.open(VER).then(c => c.put(req, cp));
        }
        return res;
      /* 通信できないときの逃げ道。転送ページが無ければ本体を返す。
         どちらも無ければ何も返さない（ここで404の見た目になることがある） */
      }).catch(() => caches.match("./pc.html").then(p => p || caches.match("./index.html")));
    })
  );
});
