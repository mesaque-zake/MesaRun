// Service Worker mínimo (v0): só deixa o jogo instalável.
// NÃO guarda nada em cache, então você sempre vê a versão mais nova durante os testes.
// O cache de verdade entra na etapa de performance.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {
    // Sem respondWith: o navegador segue o fluxo normal de rede
});
