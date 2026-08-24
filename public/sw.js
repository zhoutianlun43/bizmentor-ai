/**
 * BizMentor AI — Service Worker（PWA 基础能力）
 * 策略：导航请求网络优先（离线回退首页），静态资源 stale-while-revalidate。
 * 仅在生产构建（pnpm start）中由 RegisterSW 注册。
 */
const CACHE_NAME = "bizmentor-v2";
const PRECACHE_URLS = ["/", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // 页面导航：网络优先，失败时回退到缓存的首页
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match("/"))),
    );
    return;
  }

  // 同源静态资源：先返回缓存，同时后台更新
  if (new URL(request.url).origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            return response;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
  }
});

// 网络恢复重同步：后台同步事件（由客户端在在线/恢复时触发）
self.addEventListener("sync", (event) => {
  if (event.tag === "bizmentor-resync") {
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => client.postMessage({ type: "bizmentor:resync" }));
      }),
    );
  }
});

// 客户端消息：手动触发一次完整缓存刷新
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "bizmentor:refresh-cache") {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
    );
  }
});