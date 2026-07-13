import { initEngine, renderEngine } from './engine.js';

// Elementos da Interface (UI)
const menuBackdrop = document.getElementById('menu-backdrop');
const mainMenu = document.getElementById('main-menu');
const rankingModal = document.getElementById('ranking-modal');
const footer = document.getElementById('footer');
const countdownLayer = document.getElementById('countdown-layer');
const countdownText = document.getElementById('countdown-text');

// Botões
const btnPlay = document.getElementById('btn-play');
const btnRanking = document.getElementById('btn-ranking');
const btnCloseRanking = document.getElementById('btn-close-ranking');

function init() {
    console.log("MesaRun! Motor 3D Inicializado...");
    initEngine();
    
    // Liga as funções de clique dos botões
    setupMenu();

    // Começa o loop da engine
    gameLoop();
}

function setupMenu() {
    // Abrir o Ranking
    btnRanking.addEventListener('click', () => {
        mainMenu.classList.add('hidden');
        rankingModal.classList.remove('hidden');
        rankingModal.classList.add('flex');
    });

    // Fechar o Ranking (Voltar)
    btnCloseRanking.addEventListener('click', () => {
        rankingModal.classList.add('hidden');
        rankingModal.classList.remove('flex');
        mainMenu.classList.remove('hidden');
    });

    // Clicar no Play (Inicia a sequência)
    btnPlay.addEventListener('click', () => {
        startGameSequence();
    });
}

function startGameSequence() {
    // 1. Esconde Menu e Rodapé
    mainMenu.classList.add('hidden');
    footer.classList.add('hidden');
    
    // 2. Mostra a contagem regressiva
    countdownLayer.classList.remove('hidden');
    countdownText.innerText = "3";

    // 3. Sequência de Tempo (setTimeout)
    setTimeout(() => { countdownText.innerText = "2"; }, 1000);
    setTimeout(() => { countdownText.innerText = "1"; }, 2000);
    setTimeout(() => { 
        countdownText.innerText = "Colete o máximo\nde doações!"; 
        // Diminui o texto da frase para caber bem na tela
        countdownText.classList.remove('text-9xl');
        countdownText.classList.add('text-6xl', 'md:text-8xl');
    }, 3000);
    
    // 4. Limpa a tela e "inicia" o jogo
    setTimeout(() => {
        countdownLayer.classList.add('hidden');
        
        // Remove o efeito de vidro fosco suavemente
        menuBackdrop.style.opacity = '0'; 
        
        setTimeout(() => {
            menuBackdrop.classList.add('hidden'); 
            
            // AQUI É ONDE O JOGO REALMENTE VAI COMEÇAR NA ETAPA 2
            console.log("Sinal Verde! Os caminhões estão na pista!");
            
        }, 500); // Aguarda o meio segundo do Fade Out do Tailwind
        
    }, 4500); // Mantém a frase final na tela por 1.5s
}

function gameLoop() {
    requestAnimationFrame(gameLoop);
    renderEngine();
}

window.onload = init;
