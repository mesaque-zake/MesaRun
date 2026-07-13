import { initEngine, render } from './engine.js';

function init() {
    console.log("Iniciando o MesaRun!...");
    
    // 1. Liga o motor 3D
    initEngine();
    
    // 2. Some com o texto de carregamento
    const loadingText = document.getElementById('loading-text');
    if(loadingText) {
        loadingText.style.display = 'none';
    }

    // 3. Dispara o Loop do Jogo (60 frames por segundo)
    gameLoop();
}

function gameLoop() {
    // Pede ao navegador para chamar essa função de novo no próximo frame
    requestAnimationFrame(gameLoop);
    
    // No futuro, chamaremos a atualização do caminhão e trânsito aqui
    
    // Manda a engine desenhar tudo na tela
    render();
}

// Garante que a página web carregou antes de disparar o código
window.onload = init;
