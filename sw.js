// =====================================================
// MesaRun - Service Worker (v1): guarda o jogo para abrir rápido e offline
//
// Código (html, js, css, json): REDE PRIMEIRO. As suas atualizações chegam sem esperar versão.
//                               Se a rede falhar ou passar de 4 s, usa o que está guardado.
// Modelos e imagens (.glb, .png...): CACHE PRIMEIRO, porque quase nunca mudam.
// CDNs (Three.js, fontes, Tailwind): guardados à medida que são usados.
// Nunca guarda: o script do ranking (script.google.com), envios de pontuação e sites externos.
//
// Trocou um .glb ou imagem mantendo o mesmo nome? Suba o número de CACHE_ASSETS (v1 -> v2).
// =====================================================

const CACHE_CODE = 'mesarun-code-v1';
const CACHE_ASSETS = 'mesarun-assets-v1';
const CACHE_CDN = 'mesarun-cdn-v1';
const CURRENT_CACHES = [CACHE_CODE, CACHE_ASSETS, CACHE_CDN];

const NETWORK_TIMEOUT_MS = 4000;
const INDEX_URL = new URL('./index.html', self.registration.scope).href;

// Hosts externos: cache primeiro (versões fixas) e "guarda e atualiza" (podem mudar)
const CDN_CACHE_FIRST = ['unpkg.com', 'fonts.gstatic.com'];
const CDN_REVALIDATE = ['cdn.tailwindcss.com', 'fonts.googleapis.com'];

const ASSET_EXT = /\.(glb|gltf|bin|png|jpe?g|webp|gif|svg|ico|mp3|ogg|wav)$/i;

// Guardados já na instalação (tudo que o próprio código do jogo referencia)
const PRECACHE_CODE = [
    './index.html', './manifest.json', './css/style.css',
    './js/main.js', './js/engine.js', './js/world.js', './js/entities.js'
];
const PRECACHE_ASSETS = [
    './favicon.ico', './logo.png',
    './IconRun/Icon192.png', './IconRun/Icon512.png', './IconRun/Icon180.png', './IconRun/Favicon.png',
    './assets/sprite/cartoon/Home.png', './assets/sprite/cartoon/leo.png', './assets/sprite/cartoon/lucas.png',
    './assets/sprite/cartoon/ranking.png', './assets/sprite/cartoon/over.png', './assets/sprite/cartoon/config.png',
    './assets/sprite/road/freio.png'
];
// O modo precisa casar com o de quem pede: módulos e fontes usam 'cors'; script e CSS comuns usam 'no-cors'
const PRECACHE_CDN = [
    { url: 'https://cdn.tailwindcss.com', mode: 'no-cors' },
    { url: 'https://unpkg.com/three@0.160.0/build/three.module.js', mode: 'cors' },
    { url: 'https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js', mode: 'cors' },
    { url: 'https://unpkg.com/three@0.160.0/examples/jsm/utils/BufferGeometryUtils.js', mode: 'cors' },
    { url: 'https://fonts.googleapis.com/css2?family=Bangers&family=Plus+Jakarta+Sans:wght@400;600;800&display=swap', mode: 'no-cors' }
];

async function precacheList(cacheName, items, bypassHttpCache) {
    const cache = await caches.open(cacheName);
    await Promise.all(items.map(async (item) => {
        try {
            const init = typeof item === 'string' ? {} : { mode: item.mode };
            if (bypassHttpCache) init.cache = 'reload';
            const req = new Request(typeof item === 'string' ? item : item.url, init);
            const res = await fetch(req);
            if (res && (res.ok || res.type === 'opaque')) await cache.put(req, res);
        } catch (err) {
            // Um arquivo que falhou não impede a instalação: o cache de execução cobre depois
        }
    }));
}

self.addEventListener('install', (event) => {
    event.waitUntil(
        Promise.all([
            precacheList(CACHE_CODE, PRECACHE_CODE, true),
            precacheList(CACHE_ASSETS, PRECACHE_ASSETS, false),
            precacheList(CACHE_CDN, PRECACHE_CDN, false)
        ]).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            // Só apaga caches do MesaRun: os seus outros projetos neste domínio não são tocados
            .then((names) => Promise.all(names
                .filter((n) => n.startsWith('mesarun-') && !CURRENT_CACHES.includes(n))
                .map((n) => caches.delete(n))))
            .then(() => self.clients.claim())
    );
});

function withTimeout(promise, ms) {
    return new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('timeout')), ms);
        promise.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
    });
}

// Rede primeiro; se falhar ou demorar, usa o que está guardado
async function networkFirst(request) {
    const cache = await caches.open(CACHE_CODE);
    const key = request.mode === 'navigate' ? INDEX_URL : request;

    const networkPromise = fetch(request).then((response) => {
        if (response && response.ok) cache.put(key, response.clone()).catch(() => {});
        return response;
    });

    try {
        return await withTimeout(networkPromise, NETWORK_TIMEOUT_MS);
    } catch (err) {
        const cached = await cache.match(key);
        if (cached) {
            networkPromise.catch(() => {}); // a resposta que ainda vem só atualiza o cache
            return cached;
        }
        return networkPromise;
    }
}

// Cache primeiro; se não tiver, busca na rede e guarda
async function cacheFirst(request, cacheName, allowOpaque) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (response && (response.ok || (allowOpaque && response.type === 'opaque'))) {
        cache.put(request, response.clone()).catch(() => {});
    }
    return response;
}

// Responde na hora com o guardado e atualiza em segundo plano
async function staleWhileRevalidate(event, cacheName) {
    const request = event.request;
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    const update = fetch(request).then((response) => {
        if (response && (response.ok || response.type === 'opaque')) {
            cache.put(request, response.clone()).catch(() => {});
        }
        return response;
    }).catch(() => null);

    if (cached) {
        event.waitUntil(update);
        return cached;
    }
    return (await update) || Response.error();
}

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    if (url.origin === self.location.origin) {
        if (url.pathname.endsWith('/sw.js')) return;
        if (request.mode !== 'navigate' && ASSET_EXT.test(url.pathname)) {
            event.respondWith(cacheFirst(request, CACHE_ASSETS, false));
        } else {
            event.respondWith(networkFirst(request));
        }
        return;
    }

    if (CDN_CACHE_FIRST.includes(url.hostname)) {
        event.respondWith(cacheFirst(request, CACHE_CDN, true));
    } else if (CDN_REVALIDATE.includes(url.hostname)) {
        event.respondWith(staleWhileRevalidate(event, CACHE_CDN));
    }
    // Qualquer outro endereço (ranking, site do Mesa Brasil...) segue direto pela rede, sem cache
});
