import { initEngine, renderEngine, scene, triggerCameraShake,
    setCameraFlippedState, setCameraPreset, renderer, worldToScreenPercent } from './engine.js';
import { createWorld, updateWorld, setBrakingState, currentSpeed,
    setActiveBiome, spawnMacumbaSpecialEvent, resetWorldScenery } from './world.js';
import { createEntities, movePlayerLeft, movePlayerRight, updateEntities,
    spawnObstacle, checkCollisions, resetEntities, spawnItem, checkItemCollections,
    setTruckTransitionTurn, spawnGarbageTruck, spawnPoliceCar,
    spawnAmbulance, NEGATIVE_FOODS, getLaneX } from './entities.js';

// Elementos da Interface (UI)
const menuBackdrop = document.getElementById('menu-backdrop'); 
const mainMenu = document.getElementById('main-menu'); 
const rankingModal = document.getElementById('ranking-modal'); 
const footer = document.getElementById('footer'); 
const hudLayer = document.getElementById('hud-layer'); 
const gameWrapper = document.getElementById('game-wrapper');

// Elementos do Painel de Configurações
const btnSettings = document.getElementById('btn-settings'); 
const settingsModal = document.getElementById('settings-modal'); 
const btnCloseSettings = document.getElementById('btn-close-settings'); 
const btnCloseSettingsX = document.getElementById('btn-close-settings-x'); 
const btnCamIsometric = document.getElementById('btn-cam-isometric'); 
const btnCamTopdown = document.getElementById('btn-cam-topdown'); 
const btnCamChase = document.getElementById('btn-cam-chase');

// --- VARIÁVEIS DO CRONÔMETRO DE BIOMAS ---
let biomeTimer = null;
const BIOMES_LIST = ['nature', 'suburban', 'industrial', 'city']; 
let currentBiomeIndex = 0;
let isFlipped = false;

// Botões
const btnPlay = document.getElementById('btn-play'); 
const btnRanking = document.getElementById('btn-ranking'); 
const btnCloseRanking = document.getElementById('btn-close-ranking'); 
const btnCloseRankingX = document.getElementById('btn-close-ranking-x'); 

// --- CONTROLE DE FREIOS ---
let isGameOver = false;
let isPlaying = false; 
let brakeCharges = 3;
let activeBraking = false;
let spawnerTimeout = null;

// Elementos da UI de Game Over
const gameOverModal = document.getElementById('game-over-modal'); 
const gameOverScore = document.getElementById('game-over-score'); 
const recordForm = document.getElementById('record-form'); 
const playerNameInput = document.getElementById('player-name-input');

// Elementos da UI do Velocímetro
const speedometerLayer = document.getElementById('speedometer-layer'); 
const speedText = document.getElementById('speed-text');

// Botões do Game Over
const btnRestart = document.getElementById('btn-restart'); 
const btnBackMenu = document.getElementById('btn-back-menu'); 
const btnSaveRecord = document.getElementById('btn-save-record');

// Elementos da UI de Pontuação e Avisos (HUD)
const scoreLayer = document.getElementById('score-layer'); 
const scoreText = document.getElementById('score-text');

// Elementos do Toast
const toastLayer = document.getElementById('toast-layer'); 
const toastText = document.getElementById('toast-text'); 
const toastCharImg = document.getElementById('toast-char-img'); 
const toastBalloon = document.getElementById('toast-balloon'); 
const toastArrow = document.getElementById('toast-arrow');

// Elementos da contagem inicial (3... 2... 1... VAI!)
const countdownLayer = document.getElementById('countdown-layer');
const countdownText = document.getElementById('countdown-text');
const countdownBurst = document.getElementById('countdown-burst');
const countdownBurstText = document.getElementById('countdown-burst-text');
const countdownLeo = document.getElementById('countdown-leo');
const countdownLucas = document.getElementById('countdown-lucas');

// Elementos de Debug
const debugFps = document.getElementById('debug-fps');
const debugCalls = document.getElementById('debug-calls');
const debugTris = document.getElementById('debug-tris');
const debugPanel = document.getElementById('debug-panel');
const btnToggleDebug = document.getElementById('btn-toggle-debug');
const debugSwitch = document.getElementById('debug-switch');
let frameCount = 0;
let lastFpsTime = performance.now();

// --- VARIÁVEIS DE PONTUAÇÃO E SPAWN ---
let score = 0;
let itemTimeout = null;

// Sequência de comidas boas seguidas e quem fala o próximo elogio
let goodStreak = 0;
let praiseTurn = 0;
const STREAK_PRAISES = {
    3: "Nossa, você está fazendo uma ótima coleta!",
    5: "Que incrível... Continue assim!"
};
let toastTimeout = null;
let leaderboard = JSON.parse(localStorage.getItem('mesarun_ranking')) || []; 
let lastTime = performance.now();

// Controle do personagem ativo para evitar pop repetido
let lastSpriteName = "";

// --- CONTROLE DE EVENTOS ESPECIAIS (UNIFICADO) ---
let specialEventTimeout = null;
let macumbaTimeout = null;
let nextSpecialEvent = 'garbage'; 
let policeWarningIndex = 0;

// Evita que a troca de bioma e os eventos especiais se atropelem
let specialEventActive = false;      // true do aviso até o fim do evento (boss, polícia ou ambulância)
let biomeTransitionActive = false;   // true durante os ~3 s da troca de bioma
let biomeTransitionPending = false;  // a troca venceu no meio de um evento e espera o fim dele

function init() { 
    initEngine();

    // --- CARREGAMENTO IMEDIATO DO CENÁRIO ---
    createWorld(scene);
    createEntities(scene);

    // Liga as funções de clique dos botões do menu
    setupMenu();

    // Painel de debug: oculto por padrão; lembra a escolha feita nos Ajustes
    let debugWasOn = false;
    try { debugWasOn = localStorage.getItem(DEBUG_STORAGE_KEY) === '1'; } catch (e) {}
    setDebugPanelVisible(debugWasOn);

    // Reenvia recordes que ficaram sem internet (espera o jogo terminar de carregar)
    setTimeout(flushPendingScores, 5000);

    // Começa o loop da engine injetando o tempo via API do navegador
    requestAnimationFrame(gameLoop);

    // Abertura: azul com a arte no centro, depois a cortina circular e os botões
    startIntro();
}

// Painel de debug (FPS, calls, triângulos): oculto por padrão, ligado pelos Ajustes
const DEBUG_STORAGE_KEY = 'mesarun_debug';

function setDebugPanelVisible(visible) {
    debugPanel.classList.toggle('hidden', !visible);
    debugSwitch.classList.toggle('on', visible);
    btnToggleDebug.setAttribute('aria-checked', visible ? 'true' : 'false');
    try { localStorage.setItem(DEBUG_STORAGE_KEY, visible ? '1' : '0'); } catch (e) {}
}

// Pulinho do marcador de kg: 'gain' pula e pisca em verde, 'loss' balança e pisca em vermelho
function pulseHud(el, kind) {
    el.classList.remove('hud-flash-gain', 'hud-flash-loss');
    void el.offsetWidth; // força o reflow para a animação recomeçar
    el.classList.add(kind === 'gain' ? 'hud-flash-gain' : 'hud-flash-loss');
}

// =========================================
// ABERTURA: azul, cortina circular e botões animados
// =========================================
const homeArt = document.getElementById('home-art');
const homeArtWrap = document.getElementById('home-art-wrap');
const introCover = document.getElementById('intro-cover');

const INTRO_BLUE_MS = 2600;    // tempo com a tela azul
const INTRO_REVEAL_MS = 1900;  // cortina + arte subindo + botões entrando (o último botão termina em ~1,7 s)

let introPhase = 'idle';       // 'idle', 'blue', 'reveal' ou 'done'
let introTimer = null;

function startIntro() {
    // Quem pediu "reduzir movimento" no sistema vê o menu direto
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        finishIntro();
        return;
    }

    // Sem suporte a @property, a cortina vira um fade simples
    if (!(window.CSS && CSS.registerProperty)) menuBackdrop.classList.add('intro-simple');

    // Mede quanto a arte precisa descer do lugar do menu até o centro da área do jogo
    const artRect = homeArt.getBoundingClientRect();
    const wrapRect = gameWrapper.getBoundingClientRect();
    const dy = (wrapRect.top + wrapRect.height / 2) - (artRect.top + artRect.height / 2);
    homeArtWrap.style.setProperty('--intro-dy', `${dy}px`);

    introPhase = 'blue';
    homeArt.classList.add('countdown-punch'); // o mesmo "soco" da contagem
    menuBackdrop.addEventListener('pointerdown', onIntroTap);
    introTimer = setTimeout(openIntro, INTRO_BLUE_MS);
}

// Abre a cortina: a arte sobe e os botões entram
function openIntro() {
    if (introPhase !== 'blue') return;
    introPhase = 'reveal';
    if (introTimer) clearTimeout(introTimer);
    menuBackdrop.classList.add('intro-open');
    introTimer = setTimeout(finishIntro, INTRO_REVEAL_MS);
}

// Limpa todas as classes da abertura: o menu volta a ser estático, sem animação ao reabrir
function finishIntro() {
    if (introTimer) clearTimeout(introTimer);
    introTimer = null;
    introPhase = 'done';
    menuBackdrop.removeEventListener('pointerdown', onIntroTap);
    menuBackdrop.classList.remove('intro-active', 'intro-open', 'intro-simple');
    introCover.classList.add('hidden');
    homeArt.classList.remove('countdown-punch');
    homeArtWrap.style.removeProperty('--intro-dy');
    btnPlay.classList.add('play-breathe');
}

// Um toque durante o azul abre a cortina; durante a revelação, pula para o final
function onIntroTap() {
    if (introPhase === 'blue') openIntro();
    else if (introPhase === 'reveal') finishIntro();
}

function setupMenu() { 
    // Abrir o Ranking
    btnRanking.addEventListener('click', () => { 
        loadRanking(); // abre no TOP 10, mostra o último ranking guardado e busca o novo na planilha
        mainMenu.classList.add('hidden');
        rankingModal.classList.remove('hidden'); 
        rankingModal.classList.add('flex'); 
    });

    // Fechar o Ranking (Voltar ou X)
    const closeRankingAction = () => {
        rankingModal.classList.add('hidden');
        rankingModal.classList.remove('flex');
        mainMenu.classList.remove('hidden');
    };
    btnCloseRanking.addEventListener('click', closeRankingAction);
    btnCloseRankingX.addEventListener('click', closeRankingAction);

    // Clicar no Play
    btnPlay.addEventListener('click', () => {
        startGameSequence();
    });

    // Adiciona escuta do teclado
    window.addEventListener('keydown', (e) => {
        if (!isPlaying) return;

        // Com o jogo pausado os controles ficam bloqueados. Enter ou Espaço fecham o pop-up (com o botão já ativo).
        if (isPaused) {
            if ((e.key === 'Enter' || e.key === ' ') && eduPopupOpen && !eduPopupBtn.disabled) {
                e.preventDefault();
                closeEduPopup();
            }
            return;
        }

        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
            movePlayerLeft();
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
            movePlayerRight();
        }

        // Ativa o Freio
        if ((e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') && !activeBraking && brakeCharges > 0) {
            activeBraking = true;
            brakeCharges--;
            setBrakingState(true);
            updateBrakeUI(); 
        }
    });

    // ESCUTA DE SOLTURA DE TECLA
    window.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
            activeBraking = false;  
            setBrakingState(false); 
        }
    });

    // Controle unificado por cliques de mouse e toques na tela
    gameWrapper.addEventListener('pointerdown', (e) => {
        if (!isPlaying || isGameOver || isPaused) return;

        const rect = gameWrapper.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const brakeThreshold = rect.height * 0.8; 

        if (y > brakeThreshold) {
            if (!activeBraking && brakeCharges > 0) {
                activeBraking = true;
                brakeCharges--;
                setBrakingState(true);
                updateBrakeUI();
            }
        } else {
            if (x < rect.width / 2) {
                movePlayerLeft();
            } else {
                movePlayerRight();
            }
        }
    });

    gameWrapper.addEventListener('pointerup', () => {
        if (activeBraking) {
            activeBraking = false;
            setBrakingState(false);
        }
    });

    gameWrapper.addEventListener('pointerleave', () => {
        if (activeBraking) {
            activeBraking = false;
            setBrakingState(false);
        }
    });

    window.addEventListener('blur', () => {
        activeBraking = false;
        setBrakingState(false);
    });

    btnRestart.addEventListener('click', () => {
        restartGame();
    });

    btnBackMenu.addEventListener('click', () => {
        backToMenu();
    });

    btnSaveRecord.addEventListener('click', () => {
        saveRecord();
    });

    // --- CONTROLE DO MODAL DE CONFIGURAÇÕES ---
    btnSettings.addEventListener('click', () => {
        mainMenu.classList.add('hidden');
        settingsModal.classList.remove('hidden');
        settingsModal.classList.add('flex');
    });

    // Fechar Ajustes (Voltar ou X)
    const closeSettingsAction = () => {
        settingsModal.classList.add('hidden');
        settingsModal.classList.remove('flex');
        mainMenu.classList.remove('hidden');
    };
    btnCloseSettings.addEventListener('click', closeSettingsAction);
    btnCloseSettingsX.addEventListener('click', closeSettingsAction);

    btnCamIsometric.addEventListener('click', () => {
        setCameraPreset(0);
        updateCameraButtonsUI(0);
    });

    btnCamTopdown.addEventListener('click', () => {
        setCameraPreset(1);
        updateCameraButtonsUI(1);
    });

    btnCamChase.addEventListener('click', () => {
        setCameraPreset(2);
        updateCameraButtonsUI(2);
    });

    btnToggleDebug.addEventListener('click', () => {
        setDebugPanelVisible(debugPanel.classList.contains('hidden'));
    });
}

// Mostra um passo da contagem: número gigante, fala no estouro de gibi e quem está falando
function showCountdownStep(number, phrase, speaker) {
    countdownText.innerText = number;
    countdownText.classList.toggle('is-go', number === 'VAI!');
    countdownBurstText.innerText = phrase;

    // Reinicia as animações (remove a classe, força o reflow e coloca de novo)
    countdownText.classList.remove('countdown-punch');
    countdownBurst.classList.remove('burst-pop');
    void countdownText.offsetWidth;
    countdownText.classList.add('countdown-punch');
    countdownBurst.classList.add('burst-pop');

    countdownLeo.classList.toggle('speaking', speaker === 'leo');
    countdownLucas.classList.toggle('speaking', speaker === 'lucas');
}

function showCountdownLayer() {
    countdownLayer.classList.remove('hidden');
    void countdownLayer.offsetWidth; // força o reflow para o fade de entrada funcionar
    countdownLayer.classList.remove('opacity-0');
}

function hideCountdownLayer() {
    countdownLayer.classList.add('opacity-0');
    setTimeout(() => countdownLayer.classList.add('hidden'), 300);
}

// Dica de controles (vidro fosco) no começo de cada partida
const controlsHint = document.getElementById('controls-hint');
const controlsHintTouch = document.getElementById('controls-hint-touch');
const controlsHintKeys = document.getElementById('controls-hint-keys');
const CONTROLS_HINT_MS = 5000; // precisa bater com os 5s do @keyframes controlsHintFade no CSS
let controlsHintTimeout = null;

function showControlsHint() {
    // Tela de toque (ponteiro principal "grosso") mostra os gestos; senão, mostra as teclas
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    controlsHintTouch.classList.toggle('hidden', !isTouch);
    controlsHintKeys.classList.toggle('hidden', isTouch);

    // Reinicia o fade (remove a classe, força o reflow e coloca de novo)
    controlsHint.classList.remove('hidden', 'controls-hint-run');
    void controlsHint.offsetWidth;
    controlsHint.classList.add('controls-hint-run');

    if (controlsHintTimeout) clearTimeout(controlsHintTimeout);
    controlsHintTimeout = setTimeout(hideControlsHint, CONTROLS_HINT_MS + 100);
}

function hideControlsHint() {
    if (controlsHintTimeout) clearTimeout(controlsHintTimeout);
    controlsHintTimeout = null;
    controlsHint.classList.add('hidden');
    controlsHint.classList.remove('controls-hint-run');
}

function startGameSequence() { 
    const topLogos = document.getElementById('top-logos'); 
    mainMenu.classList.add('hidden');
    footer.classList.add('hidden'); 
    if (topLogos) topLogos.classList.add('hidden');

    showCountdownLayer();
    showCountdownStep('3', 'Aperte os cinto!', 'leo');

    setTimeout(() => {
        showCountdownStep('2', 'Ligue o motor!', 'leo');
    }, 1000);

    setTimeout(() => {
        showCountdownStep('1', 'Acelerando!', 'leo');
    }, 2000);

    setTimeout(() => {
        showCountdownStep('VAI!', 'Colete o máximo de doações que conseguir!', 'lucas');
    }, 3000);

    setTimeout(() => {
        menuBackdrop.style.opacity = '0'; 

        setTimeout(() => {
            hideCountdownLayer();
            menuBackdrop.classList.add('hidden'); 
            hudLayer.classList.remove('hidden');
            speedometerLayer.classList.remove('hidden');
            scoreLayer.classList.remove('hidden'); 

            isPlaying = true;
            gameStartTime = performance.now();
            showControlsHint();
            startObstacleSpawner();
            startItemSpawner();
            startBiomeTimer(); 

            // Ativa o spawn fixo da Macumba aos 15 segundos de jogo
            macumbaTimeout = setTimeout(() => {
                if (isPlaying && !isGameOver) {
                    spawnMacumbaSpecialEvent();
                }
            }, 15000);

            nextSpecialEvent = 'garbage';
            startSpecialEventTimer();
        }, 500);
    }, 4500);
}

function gameLoop(time) { 
    requestAnimationFrame(gameLoop);

    const deltaTime = Math.min((time - lastTime) / 1000, 0.1); 
    lastTime = time;

    // --- ATUALIZA O PAINEL DE DEBUG ---
    frameCount++;
    if (time - lastFpsTime >= 1000) {
        if (debugFps) debugFps.innerText = frameCount;
        if (debugCalls && renderer) debugCalls.innerText = renderer.info.render.calls;
        if (debugTris && renderer) debugTris.innerText = renderer.info.render.triangles;
        frameCount = 0;
        lastFpsTime = time;
    }

    if (!isGameOver && !isPaused) {
        updateWorld();
        updateEntities(activeBraking, deltaTime);

        if (isPlaying) {
            const displaySpeed = Math.round((currentSpeed / 0.5) * 53 + 2);
            speedText.innerText = `${displaySpeed} km/h`;
        }
    }

    if (isPlaying && !isGameOver && !isPaused) {
        // Logo depois de fechar o pop-up há 1 s sem colisão, para a pausa não causar uma batida injusta
        if (performance.now() >= collisionGraceUntil && checkCollisions()) {
            triggerGameOver();
        }
        checkItemCollections(handleItemCollection);
    }

    renderEngine(isPlaying);
}

window.onload = init;

function updateBrakeUI() { 
    const iconIndex = brakeCharges + 1; 
    const icon = document.getElementById(`brake-icon-${iconIndex}`); 
    if (icon) {
        icon.classList.add('grayscale', 'opacity-30', 'brake-used');
    } 
}

function startObstacleSpawner() { 
    if (spawnerTimeout) clearTimeout(spawnerTimeout);

    function scheduleNextObstacle() {
        if (!isPlaying || isGameOver || isPaused) return;
        // Tráfego ligeiramente mais intenso e divertido
        const randomDelay = Math.random() * 800 + 1300; 
        spawnerTimeout = setTimeout(() => {
            if (!isPaused) spawnObstacle(); // pausado: pula este carro, sem empilhar no horizonte
            scheduleNextObstacle();
        }, randomDelay);
    }

    scheduleNextObstacle();
}

function triggerGameOver() { 
    isGameOver = true; 
    isPlaying = false;

    if (biomeTimer) clearInterval(biomeTimer);
    if (specialEventTimeout) clearTimeout(specialEventTimeout);
    if (macumbaTimeout) clearTimeout(macumbaTimeout);

    gameDurationSec = Math.round((performance.now() - gameStartTime) / 1000);
    hideControlsHint(); // a dica some junto com a partida
    triggerCameraShake(1.5);

    setTimeout(() => {
        menuBackdrop.classList.remove('hidden');
        menuBackdrop.style.opacity = '1';

        hudLayer.classList.add('hidden');
        speedometerLayer.classList.add('hidden');
        scoreLayer.classList.add('hidden');
        toastLayer.classList.add('hidden');

        if (itemTimeout) clearTimeout(itemTimeout);
        gameOverModal.classList.remove('hidden');
        gameOverModal.classList.add('flex');

        setupGameOverScreen();
    }, 2000);
}

// Parte comum ao "Tentar novamente" e ao "Menu principal"
function resetGameState() { 
    gameOverModal.classList.add('hidden');
    gameOverModal.classList.remove('flex'); 
    if (biomeTimer) clearInterval(biomeTimer); 
    if (itemTimeout) clearTimeout(itemTimeout); 
    if (specialEventTimeout) clearTimeout(specialEventTimeout);
    if (macumbaTimeout) clearTimeout(macumbaTimeout);

    isGameOver = false;
    brakeCharges = 3;
    activeBraking = false;
    setBrakingState(false);
    score = 0;
    scoreText.innerText = `0 kg`;
    goodStreak = 0;
    praiseTurn = 0;
    resetEduPopupState();
    hideControlsHint();
    goodCollected =  0;
    stopGameOverScoreAnimation();
    specialEventActive = false;
    biomeTransitionActive = false;
    biomeTransitionPending = false;
    hideEmergencyLight();

    for (let i = 1; i <= 3; i++) {
        const icon = document.getElementById(`brake-icon-${i}`);
        if (icon) icon.classList.remove('grayscale', 'opacity-30', 'brake-used');
    }

    resetEntities();
    resetWorldScenery(); // Bug fix: Limpa a pista entre partidas
}

function restartGame() { 
    resetGameState();
    menuBackdrop.classList.add('hidden'); 
    startGameSequence();
}

function backToMenu() { 
    const topLogos = document.getElementById('top-logos'); 
    resetGameState();

    isPlaying = false;
    scoreLayer.classList.add('hidden');
    speedometerLayer.classList.add('hidden');

    mainMenu.classList.remove('hidden');
    footer.classList.remove('hidden');
    if (topLogos) topLogos.classList.remove('hidden'); 
    menuBackdrop.style.opacity = '1';
}

function startItemSpawner() { 
    if (itemTimeout) clearTimeout(itemTimeout);

    function scheduleNextItem() {
        if (!isPlaying || isGameOver || isPaused) return;
        const randomDelay = Math.random() * 1000 + 2500;
        itemTimeout = setTimeout(() => {
            if (!isPaused) spawnItem(); // pausado: pula este item
            scheduleNextItem();
        }, randomDelay);
    }

    scheduleNextItem();
}

function handleItemCollection(item, itemX) { 
    score += item.value; 
    if (score < 0) score = 0; 
    scoreText.innerText = `${score} kg`;

    // Pulinho no marcador: verde ao ganhar, balanço vermelho ao perder (valor 0 não anima)
    if (item.value > 0) pulseHud(scoreLayer, 'gain');
    else if (item.value < 0) pulseHud(scoreLayer, 'loss');

    triggerFloatingText(item.value, itemX);

    if (!item.isHealthy) {
        goodStreak = 0; // pegar item proibido quebra a sequência
        // Primeira vez da categoria: pop-up educativo. Depois, o aviso no canto como antes.
        if (!tryShowEducationalPopup(item.category)) {
            triggerToast(item.value, item.msg, item.category, false, item.isGarbage);
        }
    } else {
        goodStreak++;
        goodCollected++;
        showStreakPraise();
    }

}

// Elogio nas sequências de 3 e 5 comidas boas. Léo e Lucas se alternam (começa pelo Léo).
function showStreakPraise() {
    const msg = STREAK_PRAISES[goodStreak];
    if (!msg) return;

    const sprite = (praiseTurn % 2 === 0) ? 'leo.png' : 'lucas.png';
    praiseTurn++;
    triggerToast(0, msg, sprite, true);
}

function triggerFloatingText(value, xPos) { 
    const wrapper = document.getElementById('game-wrapper'); 
    if (!wrapper) return;

    const textDiv = document.createElement('div');
    textDiv.className = `absolute bottom-[28%] font-[Bangers] text-4xl tracking-wide z-30 pointer-events-none transition-all duration-700 transform translate-y-0 opacity-100`;

    let leftPercent = "50%";
    if (xPos > 2) leftPercent = "28%";
    else if (xPos < -5) leftPercent = "72%";
    textDiv.style.left = leftPercent;
    textDiv.style.transform = "translateX(-50%)";

    if (value === 0) {
        // Easter egg (0 kg): destaque dourado em vez de "0 kg" vermelho
        textDiv.innerText = 'CURIOSIDADE!';
        textDiv.classList.add('text-yellow-300', 'drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)]');
    } else if (value > 0) {
        textDiv.innerText = `+${value} kg`;
        textDiv.classList.add('text-emerald-400', 'drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)]');
    } else {
        textDiv.innerText = `${value} kg`;
        textDiv.classList.add('text-red-500', 'drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)]');
    }

    wrapper.appendChild(textDiv);

    setTimeout(() => {
        textDiv.style.transform = "translate(-50%, -100px)";
        textDiv.style.opacity = "0";
    }, 50);

    setTimeout(() => {
        textDiv.remove();
    }, 800);
}

function getCartoonSpriteForFood(category) { 
    switch (category) {
        case 'lixo':        return 'lucas2.png';
        case 'easterEgg':   return 'leo1.png';
        case 'preparado':   return 'lucas3.png';
        case 'lanche':      return 'lucas3.png';
        case 'aberto':      return 'lucas4.png';
        case 'doce':        return 'lucas5.png';
        case 'super':       return 'lucas6.png';
        case 'manipulado':  return 'lucas1.png';
        default:            return 'lucas1.png';
    }
}

// =========================================
// POP-UP EDUCATIVO: primeira vez de cada categoria proibida
// =========================================
const eduPopupLayer = document.getElementById('edu-popup-layer');
const eduPopup = document.getElementById('edu-popup');
const eduPopupRibbon = document.getElementById('edu-popup-ribbon');
const eduPopupImg = document.getElementById('edu-popup-img');
const eduPopupTitle = document.getElementById('edu-popup-title');
const eduPopupText = document.getElementById('edu-popup-text');
const eduPopupBtn = document.getElementById('edu-popup-btn');
const eduPopupTimerBar = document.getElementById('edu-popup-timer-bar');

const EDU_HIT_STOP_MS = 250;          // congelada rápida antes de o pop-up aparecer
const EDU_BUTTON_DELAY_MS = 1000;     // o botão "Entendi!" só ativa depois de 1 s
const EDU_AUTO_CLOSE_MS = 6000;       // fecha sozinho
const EDU_AUTO_CLOSE_SPECIAL_MS = 8000; // easter egg: um pouco mais de tempo
const RESUME_GRACE_MS = 1000;         // 1 s sem colisão depois de retomar o jogo

// Textos (rascunho): ajuste aqui o que não estiver fiel às regras do Mesa Brasil
const CATEGORY_POPUPS = {
    manipulado: { title: 'Já foi manipulado!', text: 'Frutas e legumes cortados perdem a proteção da casca e estragam mais rápido.' },
    preparado:  { title: 'Comida pronta não!', text: 'Refeições já preparadas não entram na coleta. Ao menos que estejam congeladas e embaladas corretamente' },
    lanche:     { title: 'Lanche pronto não!', text: 'Fastfoods não fazem parte das doações que coletamos.' },
    aberto:     { title: 'Embalagem aberta!', text: 'Se a embalagem já foi aberta, não dá para garantir que o alimento está seguro.' },
    doce:       { title: 'Doce com recheio!', text: 'Bolos, donuts e doces recheados estragam rápido e não fazem parte da coleta.' },
    super:      { title: 'Isso nem pensar!', text: 'Bebidas alcoólicas e cogumelos não são coletados.' },
    easterEgg:  { title: 'Já foi a época!', text: 'Hahaha! O "Mesa São Paulo" entregava isso em 1994, hoje não mais!', special: true }
};

let isPaused = false;               // true enquanto o jogo está congelado pelo pop-up
let eduPopupOpen = false;           // true quando o pop-up já está visível
let collisionGraceUntil = 0;        // até quando (performance.now) a colisão fica desligada
let pendingAfterPause = [];         // ações de eventos que venceram durante a pausa
const seenPopupCategories = new Set(); // só na memória da página: F5 ou fechar o jogo zera
let eduShowTimeout = null;
let eduEnableTimeout = null;
let eduAutoCloseTimeout = null;

// Executa agora, ou guarda para quando o jogo voltar (usado pelos agendadores)
function runWhenNotPaused(fn) {
    if (isPaused) {
        pendingAfterPause.push(fn);
    } else {
        fn();
    }
}

function flushPendingAfterPause() {
    const list = pendingAfterPause;
    pendingAfterPause = [];
    list.forEach(fn => fn());
}

function clearEduPopupTimers() {
    if (eduShowTimeout) clearTimeout(eduShowTimeout);
    if (eduEnableTimeout) clearTimeout(eduEnableTimeout);
    if (eduAutoCloseTimeout) clearTimeout(eduAutoCloseTimeout);
    eduShowTimeout = eduEnableTimeout = eduAutoCloseTimeout = null;
}

// Devolve true se o pop-up vai aparecer (e então o aviso do canto não deve ser mostrado)
function tryShowEducationalPopup(category) {
    const info = CATEGORY_POPUPS[category];
    if (!info || seenPopupCategories.has(category)) return false;
    if (!isPlaying || isGameOver || isPaused) return false;

    seenPopupCategories.add(category);
    isPaused = true; // congela já; o pop-up entra depois da "batida" de impacto

    eduShowTimeout = setTimeout(() => openEduPopup(category, info), EDU_HIT_STOP_MS);
    return true;
}

function openEduPopup(category, info) {
    const isSpecial = !!info.special;

    eduPopupTitle.innerText = info.title;
    eduPopupText.innerText = info.text;
    eduPopupRibbon.classList.toggle('hidden', !isSpecial);
    eduPopup.classList.toggle('edu-popup-special', isSpecial);

    // Se o arquivo do personagem não existir, o onerror do HTML esconde a imagem
    eduPopupImg.style.display = '';
    eduPopupImg.src = `assets/sprite/cartoon/${getCartoonSpriteForFood(category)}`;

    eduPopupLayer.classList.remove('hidden');
    eduPopupLayer.classList.add('flex');

    // Reinicia o "pop" de entrada
    eduPopup.classList.remove('edu-popup-pop');
    void eduPopup.offsetWidth;
    eduPopup.classList.add('edu-popup-pop');

    // Botão inativo no primeiro segundo, para um toque rápido não fechar sem ler
    eduPopupBtn.disabled = true;
    eduEnableTimeout = setTimeout(() => { eduPopupBtn.disabled = false; }, EDU_BUTTON_DELAY_MS);

    // Barrinha de tempo e fechamento automático
    const autoCloseMs = isSpecial ? EDU_AUTO_CLOSE_SPECIAL_MS : EDU_AUTO_CLOSE_MS;
    eduPopupTimerBar.style.animation = 'none';
    void eduPopupTimerBar.offsetWidth;
    eduPopupTimerBar.style.animation = `eduTimerShrink ${autoCloseMs}ms linear forwards`;
    eduAutoCloseTimeout = setTimeout(closeEduPopup, autoCloseMs);

    eduPopupOpen = true;
}

function closeEduPopup() {
    if (!eduPopupOpen) return;

    clearEduPopupTimers();
    eduPopupOpen = false;
    eduPopupLayer.classList.add('hidden');
    eduPopupLayer.classList.remove('flex');

    isPaused = false;
    collisionGraceUntil = performance.now() + RESUME_GRACE_MS;
    flushPendingAfterPause();
}

// Usado ao reiniciar ou voltar ao menu: garante que nada fique pausado.
// O que já foi mostrado (seenPopupCategories) é mantido de propósito.
function resetEduPopupState() {
    clearEduPopupTimers();
    eduPopupOpen = false;
    eduPopupLayer.classList.add('hidden');
    eduPopupLayer.classList.remove('flex');
    isPaused = false;
    pendingAfterPause = [];
}

eduPopupBtn.addEventListener('click', closeEduPopup);


// LÓGICA DO DIÁLOGO CARTOON
function triggerToast(penalty, msg, fileOrSpriteName, isManualSprite = false, isGarbage = false) { 
    if (toastTimeout) clearTimeout(toastTimeout);

    let spriteName = "";
    if (isManualSprite) {
        spriteName = fileOrSpriteName; 
    } else {
        // Aqui fileOrSpriteName é a categoria do item (ex.: 'lixo', 'preparado')
        spriteName = getCartoonSpriteForFood(fileOrSpriteName);
    }


    const isSameSprite = (lastSpriteName === spriteName) && (!toastLayer.classList.contains('hidden'));
    lastSpriteName = spriteName;

    toastText.innerText = msg;

    if (isSameSprite) {
        // Personagem idêntico: mantém a imagem estática e apenas dá o pop elástico no balão!
        toastBalloon.classList.remove('balloon-pop');
        void toastBalloon.offsetWidth; // Força re-render
        toastBalloon.classList.add('balloon-pop');
    } else {
        // Personagem mudou ou o balão estava escondido: faz animação de entrada completa!
        toastCharImg.src = `assets/sprite/cartoon/${spriteName}`;

        toastLayer.classList.remove('hidden', 'flex-row', 'flex-row-reverse');
        toastCharImg.classList.remove('slide-in-left', 'slide-in-right');
        toastArrow.className = ''; 
        toastBalloon.classList.remove('balloon-pop');

        void toastLayer.offsetWidth; // Força re-render

        if (spriteName.toLowerCase().includes('leo')) {
            toastLayer.classList.add('flex-row-reverse');
            toastArrow.classList.add('toast-arrow-right');
            toastCharImg.classList.add('slide-in-right');
        } else {
            toastLayer.classList.add('flex-row');
            toastArrow.classList.add('toast-arrow-left');
            toastCharImg.classList.add('slide-in-left');
        }

        toastBalloon.classList.add('balloon-pop');
    }

    // Exibe o Toast
    toastLayer.style.display = 'flex';
    toastLayer.style.opacity = '1';

    // Oculta suavemente após 3 segundos
    toastTimeout = setTimeout(() => {
        toastLayer.style.transition = 'opacity 0.3s ease';
        toastLayer.style.opacity = '0';
        
        setTimeout(() => {
            toastLayer.style.display = '';
            toastLayer.classList.add('hidden');
            toastLayer.style.transition = '';
            lastSpriteName = ""; // Limpa o estado quando some de vez
        }, 300);
    }, 3000);
}

// =========================================
// TELA DO RANKING (abas TOP 10 e GERAL)
// =========================================
const btnRankTop = document.getElementById('btn-rank-top');
const btnRankAll = document.getElementById('btn-rank-all');
const TOP_VIEW_SIZE = 10;
let rankingTab = 'top';

function normalizeRankText(s) {
    return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

// Limpa o texto do mesmo jeito que o script faz ao gravar, para a comparação não falhar por causa de símbolos
function cleanLikeServer(s, max) {
    return String(s || '')
        .replace(/[^A-Za-zÀ-ÿ0-9 ._\-]/g, '')
        .replace(/^[^A-Za-zÀ-ÿ0-9]+/, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, max)
        .toLowerCase();
}

function isMyRankingEntry(entry) {
    let prefs = null;
    try { prefs = JSON.parse(localStorage.getItem(PLAYER_PREFS_KEY)); } catch (e) {}
    if (!prefs || !prefs.name) return false;
    const myName = cleanLikeServer(prefs.name, 15);
    const myUnit = prefs.isStaff ? cleanLikeServer(prefs.unit, 30) : '';
    return cleanLikeServer(entry.name, 30) === myName
        && cleanLikeServer(entry.unit, 40) === myUnit;
}

// Lista já ordenada da maior para a menor pontuação: fica só a melhor de cada pessoa (mesmo nome e unidade)
function bestPerPerson(sortedEntries) {
    const seen = new Set();
    const result = [];
    for (const entry of sortedEntries) {
        const key = normalizeRankText(entry.name) + '|' + normalizeRankText(entry.unit);
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(entry);
        if (result.length >= TOP_VIEW_SIZE) break;
    }
    return result;
}

// Desenha a lista. Nomes e unidades entram como texto puro (textContent), nunca como HTML
function renderRankingList(entries) {
    const rankingList = document.getElementById('ranking-list');
    if (!rankingList) return;

    rankingList.replaceChildren();
    rankingList.scrollTop = 0;

    if (entries.length === 0) {
        const empty = document.createElement('li');
        empty.className = 'rank-empty';
        empty.textContent = 'Ninguém no ranking ainda. Seja o primeiro!';
        rankingList.appendChild(empty);
        return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    const medalClasses = ['rank-gold', 'rank-silver', 'rank-bronze'];

    entries.forEach((entry, index) => {
        const li = document.createElement('li');
        li.className = 'rank-row';
        if (index < 3) li.classList.add(medalClasses[index]);
        if (isMyRankingEntry(entry)) li.classList.add('rank-me');
        if (index < 10) {
            li.classList.add('rank-row-anim');
            li.style.setProperty('--i', index);
        }

        const pos = document.createElement('span');
        pos.className = 'rank-pos';
        pos.textContent = index < 3 ? medals[index] : String(index + 1);

        const who = document.createElement('div');
        who.className = 'rank-who';
        const nameEl = document.createElement('span');
        nameEl.className = 'rank-name';
        nameEl.textContent = entry.name;
        who.appendChild(nameEl);
        if (entry.unit) {
            const unitEl = document.createElement('span');
            unitEl.className = 'rank-unit';
            unitEl.textContent = entry.unit;
            who.appendChild(unitEl);
        }

        const scoreEl = document.createElement('span');
        scoreEl.className = 'rank-score hud-text';
        scoreEl.textContent = `${entry.score} kg`;

        li.append(pos, who, scoreEl);
        rankingList.appendChild(li);
    });
}

// ---------- Ranking internacional: leitura da planilha ----------
const rankTabs = document.getElementById('rank-tabs');
const rankingStatus = document.getElementById('ranking-status');

const RANKING_CACHE_KEY = 'mesarun_ranking_cache'; // último ranking recebido da planilha
const RANKING_FETCH_TIMEOUT_MS = 8000;

let rankingMode = 'local';   // 'loading' (carregando), 'remote' (dados da planilha) ou 'local' (deste aparelho)
let remoteRanking = null;    // { top10: [...], general: [...] }
let rankingRequestId = 0;    // só a resposta do pedido mais novo vale

// Garante o formato certo e limita o tamanho dos textos (eles ainda entram só como textContent)
function cleanRankingEntries(list) {
    return list
        .map((e) => ({
            name: String((e && e.name) || '').slice(0, 30),
            unit: String((e && e.unit) || '').slice(0, 40),
            score: Number(e && e.score)
        }))
        .filter((e) => e.name && isFinite(e.score));
}

function saveRankingCache(data) {
    try { localStorage.setItem(RANKING_CACHE_KEY, JSON.stringify(data)); } catch (e) {}
}

function readRankingCache() {
    try {
        const d = JSON.parse(localStorage.getItem(RANKING_CACHE_KEY));
        if (d && Array.isArray(d.top10) && Array.isArray(d.general)) {
            return { top10: cleanRankingEntries(d.top10), general: cleanRankingEntries(d.general) };
        }
    } catch (e) {}
    return null;
}

// Devolve { top10, general } ou null (sem conexão, demora, resposta inválida)
async function fetchRemoteRanking() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), RANKING_FETCH_TIMEOUT_MS);
    try {
        const res = await fetch(`${RANKING_URL}?action=list&_=${Date.now()}`, { signal: controller.signal });
        const data = await res.json();
        if (!data || data.ok !== true || !Array.isArray(data.top10) || !Array.isArray(data.general)) return null;
        return { top10: cleanRankingEntries(data.top10), general: cleanRankingEntries(data.general) };
    } catch (err) {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

function renderRankingSkeleton() {
    const rankingList = document.getElementById('ranking-list');
    if (!rankingList) return;

    rankingList.replaceChildren();
    rankingList.scrollTop = 0;
    for (let i = 0; i < 5; i++) {
        const li = document.createElement('li');
        li.className = 'rank-row rank-skel';
        li.style.setProperty('--i', i);
        rankingList.appendChild(li);
    }
}

function setRankingStatus(text, kind) {
    rankingStatus.textContent = text || '';
    rankingStatus.classList.toggle('hidden', !text);
    rankingStatus.classList.remove('go-warn');
    if (kind === 'warn') rankingStatus.classList.add('go-warn');
}

function syncRankingTabButtons() {
    btnRankTop.classList.toggle('on', rankingTab === 'top');
    btnRankAll.classList.toggle('on', rankingTab === 'all');
    btnRankTop.setAttribute('aria-pressed', rankingTab === 'top' ? 'true' : 'false');
    btnRankAll.setAttribute('aria-pressed', rankingTab === 'all' ? 'true' : 'false');
}

// Com o ranking só deste aparelho as abas somem e a lista é sempre o TOP 10
function setRankingMode(mode) {
    rankingMode = mode;
    rankTabs.classList.toggle('is-off', mode === 'local');
    if (mode === 'local') {
        rankingTab = 'top';
        syncRankingTabButtons();
    }
}

function updateLeaderboardUI() {
    if (rankingMode === 'loading') {
        renderRankingSkeleton();
        return;
    }
    if (rankingMode === 'remote' && remoteRanking) {
        renderRankingList(rankingTab === 'top' ? remoteRanking.top10 : remoteRanking.general);
        return;
    }
    // Reserva: ranking deste aparelho
    const sorted = [...leaderboard].sort((a, b) => b.score - a.score);
    renderRankingList(rankingTab === 'top' ? bestPerPerson(sorted) : sorted);
}

function setRankingTab(tab) {
    rankingTab = tab;
    syncRankingTabButtons();
    updateLeaderboardUI();
}

// Chamada ao abrir o ranking: mostra o último guardado (ou o carregamento) e busca o novo na planilha
function loadRanking() {
    const requestId = ++rankingRequestId;
    rankingTab = 'top';
    syncRankingTabButtons();

    const cached = readRankingCache();
    if (cached) {
        remoteRanking = cached;
        setRankingMode('remote');
        setRankingStatus('Atualizando...');
    } else {
        remoteRanking = null;
        setRankingMode('loading');
        setRankingStatus('Carregando...');
    }
    updateLeaderboardUI();

    fetchRemoteRanking().then((data) => {
        if (requestId !== rankingRequestId) return; // o ranking foi reaberto: vale a resposta mais nova

        if (data) {
            const changed = JSON.stringify(data) !== JSON.stringify(remoteRanking);
            remoteRanking = data;
            saveRankingCache(data);
            setRankingMode('remote');
            setRankingStatus('');
            if (changed) updateLeaderboardUI(); // igual ao que já está na tela: não redesenha
        } else if (cached) {
            setRankingStatus('Sem conexão: mostrando o último ranking guardado.', 'warn');
        } else {
            setRankingMode('local');
            setRankingStatus('Sem conexão: mostrando o ranking deste aparelho', 'warn');
            updateLeaderboardUI();
        }
    });
}

btnRankTop.addEventListener('click', () => setRankingTab('top'));
btnRankAll.addEventListener('click', () => setRankingTab('all'));

// =========================================
// TELA DE FIM DE PARTIDA
// =========================================
const gameOverScorePill = document.getElementById('game-over-score-pill');
const gameOverTime = document.getElementById('game-over-time');
const gameOverGood = document.getElementById('game-over-good');
const recordBadge = document.getElementById('record-badge');
const recordFeedback = document.getElementById('record-feedback');
const btnStaffYes = document.getElementById('btn-staff-yes');
const btnStaffNo = document.getElementById('btn-staff-no');
const unitWrap = document.getElementById('unit-wrap');
const playerUnitInput = document.getElementById('player-unit-input');

const BEST_SCORE_KEY = 'mesarun_best';      // melhor pontuação deste aparelho
const PLAYER_PREFS_KEY = 'mesarun_player';  // nome e unidade lembrados
const SCORE_COUNT_MS = 900;                 // duração da contagem do placar
const SCORE_COUNT_DELAY_MS = 350;           // espera o card terminar de "pipocar"

let gameStartTime = 0;     // quando a partida começou (performance.now)
let gameDurationSec = 0;   // duração da última partida, em segundos
let goodCollected = 0;     // comidas boas coletadas na partida
let playerIsStaff = false;
let scoreCountFrame = null;

function formatDuration(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

function stopGameOverScoreAnimation() {
    if (scoreCountFrame) {
        cancelAnimationFrame(scoreCountFrame);
        scoreCountFrame = null;
    }
}

// O número sobe rápido até o valor final e dá um pulinho ao terminar
function animateGameOverScore(finalScore) {
    stopGameOverScoreAnimation();
    gameOverScore.innerText = '0 kg';
    if (finalScore <= 0) return;

    const startAt = performance.now() + SCORE_COUNT_DELAY_MS;
    const step = (now) => {
        if (now < startAt) {
            scoreCountFrame = requestAnimationFrame(step);
            return;
        }
        const t = Math.min((now - startAt) / SCORE_COUNT_MS, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        gameOverScore.innerText = `${Math.round(finalScore * eased)} kg`;
        if (t < 1) {
            scoreCountFrame = requestAnimationFrame(step);
        } else {
            scoreCountFrame = null;
            pulseHud(gameOverScorePill, 'gain');
        }
    };
    scoreCountFrame = requestAnimationFrame(step);
}

// Mensagem dentro do card (substitui os alert do navegador). kind: 'error', 'ok' ou nada
function setRecordFeedback(text, kind) {
    recordFeedback.innerText = text || '';
    recordFeedback.classList.toggle('hidden', !text);
    recordFeedback.classList.remove('go-error', 'go-ok', 'go-warn');
    if (kind === 'error') recordFeedback.classList.add('go-error');
    if (kind === 'ok') recordFeedback.classList.add('go-ok');
    if (kind === 'warn') recordFeedback.classList.add('go-warn');
}

// Chave "Funcionário Sesc? NÃO / SIM": SIM abre o campo da unidade
function setStaffMode(on) {
    playerIsStaff = on;
    btnStaffYes.classList.toggle('on', on);
    btnStaffNo.classList.toggle('on', !on);
    btnStaffYes.setAttribute('aria-pressed', on ? 'true' : 'false');
    btnStaffNo.setAttribute('aria-pressed', on ? 'false' : 'true');
    unitWrap.classList.toggle('open', on);
    playerUnitInput.disabled = !on;
}

btnStaffYes.addEventListener('click', () => setStaffMode(true));
btnStaffNo.addEventListener('click', () => setStaffMode(false));

// Enter nos campos de texto salva o recorde
[playerNameInput, playerUnitInput].forEach((input) => {
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') saveRecord();
    });
});

// Nome e unidade já vêm preenchidos com o que a pessoa usou da última vez
function loadPlayerPrefs() {
    let prefs = {};
    try { prefs = JSON.parse(localStorage.getItem(PLAYER_PREFS_KEY)) || {}; } catch (e) {}
    playerNameInput.value = prefs.name || '';
    playerUnitInput.value = prefs.unit || '';
    setStaffMode(prefs.isStaff === true);
}

// Monta a tela inteira quando o modal de fim de partida aparece
function setupGameOverScreen() {
    gameOverTime.innerText = formatDuration(gameDurationSec);
    gameOverGood.innerText = goodCollected;

    // Novo recorde = supera o melhor resultado salvo neste aparelho
    let best = 0;
    try { best = Number(localStorage.getItem(BEST_SCORE_KEY)) || 0; } catch (e) {}
    const isNewBest = score > 0 && score > best;
    if (isNewBest) {
        try { localStorage.setItem(BEST_SCORE_KEY, String(score)); } catch (e) {}
    }

    recordBadge.classList.toggle('hidden', !isNewBest);
    gameOverModal.classList.toggle('gameover-record', isNewBest);
    gameOverModal.classList.toggle('gameover-compact', score > 0);

    animateGameOverScore(score);
    setRecordFeedback('');
    gameOverSession++;          // uma "sessão" por tela de fim de partida
    isSubmittingScore = false;

    if (score > 0) {
        loadPlayerPrefs();
        resetSaveButton();
        recordForm.classList.remove('hidden');
        recordForm.classList.add('flex');
    } else {
        recordForm.classList.add('hidden');
        recordForm.classList.remove('flex');
    }
}

// =========================================
// ENVIO AO RANKING INTERNACIONAL (Google Apps Script)
// =========================================
const RANKING_URL = 'https://script.google.com/macros/s/AKfycbzc8VSpdIqK4-14V_y0dJmycfvMCz8-UIXOAmLxw863vCo7VvnQISVz56H3D0_9Ryxjaw/exec';
const CLIENT_ID_KEY = 'mesarun_client_id';       // identificador anônimo deste aparelho
const PENDING_SCORES_KEY = 'mesarun_pending';    // recordes que ficaram sem enviar
const MAX_PENDING = 3;
const SUBMIT_TIMEOUT_MS = 12000;
const PENDING_RETRY_GAP_MS = 21000;              // o script aceita 1 envio por aparelho a cada 20 s

// Erros que voltam ao formulário para a pessoa corrigir ou tentar de novo
const RANKING_MESSAGES = {
    blocked_name: 'Esse nome não é permitido. Escolha outro.',
    bad_name: 'Nome inválido. Use só letras e números.',
    bad_unit: 'Instituição inválida. Confira o nome da instituição.',
    rate_limited: 'Calma! Aguarde uns 10 segundos e tente de novo.',
    busy: 'O ranking está ocupado. Tente de novo em instantes.'
};
// Qualquer outro erro (pontuação recusada etc.) fecha o formulário
const RANKING_FINAL_MESSAGE = 'Essa partida não pôde ser registrada no ranking.';

let isSubmittingScore = false;
let gameOverSession = 0;
let flushingPending = false;

function getClientId() {
    let id = '';
    try { id = localStorage.getItem(CLIENT_ID_KEY) || ''; } catch (e) {}
    if (!id) {
        id = (window.crypto && crypto.randomUUID)
            ? crypto.randomUUID()
            : 'c-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
        try { localStorage.setItem(CLIENT_ID_KEY, id); } catch (e) {}
    }
    return id;
}

// Devolve { ok: true } ou { ok: false, error: '...' }. error 'network' = sem conexão ou demora.
async function sendScoreToRanking(payload) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);
    try {
        // text/plain evita o "preflight" do navegador, que o Apps Script não responde
        const res = await fetch(RANKING_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        const data = await res.json();
        if (data && data.ok === true) return { ok: true };
        return { ok: false, error: (data && data.error) || 'bad_request' };
    } catch (err) {
        return { ok: false, error: 'network' };
    } finally {
        clearTimeout(timer);
    }
}

function readPending() {
    try {
        const list = JSON.parse(localStorage.getItem(PENDING_SCORES_KEY));
        return Array.isArray(list) ? list : [];
    } catch (e) {
        return [];
    }
}

function writePending(list) {
    try { localStorage.setItem(PENDING_SCORES_KEY, JSON.stringify(list.slice(-MAX_PENDING))); } catch (e) {}
}

// Reenvia, um de cada vez, os recordes que ficaram guardados
async function flushPendingScores() {
    if (flushingPending) return;
    flushingPending = true;
    try {
        while (readPending().length > 0) {
            const result = await sendScoreToRanking(readPending()[0]);
            // Sem conexão, limite de frequência ou servidor ocupado: para e tenta numa próxima vez
            if (!result.ok && (result.error === 'network' || result.error === 'rate_limited' || result.error === 'busy')) break;
            // Enviado, ou recusado de vez: sai da fila
            writePending(readPending().slice(1));
            if (result.ok && readPending().length > 0) {
                await new Promise((resolve) => setTimeout(resolve, PENDING_RETRY_GAP_MS));
            }
        }
    } finally {
        flushingPending = false;
    }
}

window.addEventListener('online', flushPendingScores);

// Ranking local (reserva): só recebe o recorde quando o envio deu certo ou ficou na fila
function saveLocalRecord(name, unit, finalScore) {
    leaderboard.push({ name: name, unit: unit, score: finalScore });
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 10);
    try { localStorage.setItem('mesarun_ranking', JSON.stringify(leaderboard)); } catch (e) {}
    updateLeaderboardUI();
}

function resetSaveButton() {
    btnSaveRecord.disabled = false;
    btnSaveRecord.innerText = 'ENVIAR AO RANKING';
}

function hideRecordForm() {
    recordForm.classList.remove('flex');
    recordForm.classList.add('hidden');
}

async function saveRecord() { 
    if (isSubmittingScore) return;

    const name = playerNameInput.value.trim().toUpperCase();
    const unit = playerUnitInput.value.trim();

    if (name.length < 2) {
        setRecordFeedback('Digite seu nome (mínimo 2 letras).', 'error');
        playerNameInput.focus();
        return;
    }
    if (playerIsStaff && unit.length < 3) {
        setRecordFeedback('Digite a sua unidade (ex.: Sesc Pompéia).', 'error');
        playerUnitInput.focus();
        return;
    }

    const session = gameOverSession;
    const payload = {
        action: 'submit',
        clientId: getClientId(),
        name: name,
        isStaff: playerIsStaff,
        unit: playerIsStaff ? unit : '',
        score: score,
        durationSec: gameDurationSec
    };

    try {
        localStorage.setItem(PLAYER_PREFS_KEY, JSON.stringify({ name: name, isStaff: playerIsStaff, unit: unit }));
    } catch (e) {}

    isSubmittingScore = true;
    btnSaveRecord.disabled = true;
    btnSaveRecord.innerText = 'ENVIANDO...';
    setRecordFeedback('Enviando ao ranking...');

    const result = await sendScoreToRanking(payload);
    if (session === gameOverSession) isSubmittingScore = false;

    // O que importa para os dados vem antes da tela, mesmo que a pessoa já tenha saído dela
    if (!result.ok && result.error === 'network') {
        const list = readPending();
        list.push(payload);
        writePending(list);
    }
    if (result.ok && readPending().length > 0) {
        setTimeout(flushPendingScores, PENDING_RETRY_GAP_MS);
    }
    if (result.ok || result.error === 'network') {
        saveLocalRecord(payload.name, payload.unit, payload.score);
    }

    if (session !== gameOverSession) return; // a tela já é de outra partida

    if (result.ok) {
        hideRecordForm();
        setRecordFeedback('Enviado ao ranking!', 'ok');
    } else if (result.error === 'network') {
        hideRecordForm();
        setRecordFeedback('Sem conexão. Guardamos seu recorde e tentamos de novo depois.', 'warn');
    } else if (RANKING_MESSAGES[result.error]) {
        resetSaveButton();
        setRecordFeedback(RANKING_MESSAGES[result.error], 'error');
    } else {
        hideRecordForm();
        setRecordFeedback(RANKING_FINAL_MESSAGE, 'error');
    }
}

function startBiomeTimer() { 
    if (biomeTimer) clearInterval(biomeTimer);

    currentBiomeIndex = 0;
    isFlipped = false;
    setCameraFlippedState(false);
    setActiveBiome('nature');

    biomeTimer = setInterval(() => {
        if (isPlaying && !isGameOver) {
            runWhenNotPaused(requestBiomeTransition);
        }
    }, 50000); 
}

// A troca de bioma espera o evento especial terminar, para não ligar o spawn no meio do boss
function requestBiomeTransition() {
    if (specialEventActive) {
        biomeTransitionPending = true;
        return;
    }
    triggerBiomeTransition();
}

function triggerBiomeTransition() { 
    if (spawnerTimeout) clearTimeout(spawnerTimeout); 
    if (itemTimeout) clearTimeout(itemTimeout);

    biomeTransitionActive = true;
    setTruckTransitionTurn(isFlipped ? -0.20 : 0.20);

    setTimeout(() => {
        isFlipped = !isFlipped;
        setCameraFlippedState(isFlipped);
        currentBiomeIndex = (currentBiomeIndex + 1) % BIOMES_LIST.length;
        setActiveBiome(BIOMES_LIST[currentBiomeIndex]);

        setTimeout(() => {
            setTruckTransitionTurn(0);
            biomeTransitionActive = false;
            if (isPlaying && !isGameOver) {
                startObstacleSpawner();
                startItemSpawner();
            }
        }, 1500);
    }, 1500);
}

function startSpecialEventTimer() { 
    if (specialEventTimeout) clearTimeout(specialEventTimeout);

    specialEventTimeout = setTimeout(() => {
        if (isPlaying && !isGameOver) {
            runWhenNotPaused(requestSpecialEvent);
        }
    }, 30000); 
}

// O evento especial espera a troca de bioma acabar (confere de novo a cada 0,5 s)
function requestSpecialEvent() {
    if (!isPlaying || isGameOver) return;
    if (biomeTransitionActive) {
        specialEventTimeout = setTimeout(() => runWhenNotPaused(requestSpecialEvent), 500);
        return;
    }
    triggerSpecialEvent();
}

function triggerSpecialEvent() { 
    // O caminhão de lixo respeita o trânsito: os carros continuam nascendo. Polícia e ambulância ainda pausam o spawn.
    if (nextSpecialEvent !== 'garbage' && spawnerTimeout) clearTimeout(spawnerTimeout); 
    if (itemTimeout) clearTimeout(itemTimeout);

    specialEventActive = true;

    if (nextSpecialEvent === 'garbage') {
        triggerToast(0, "CUIDADO! Nosso inimigo, o Caminhão de lixo está vindo!", "leo2.png", true);

        setTimeout(() => {
            runWhenNotPaused(() => {
                if (isPlaying && !isGameOver) {
                    spawnGarbageTruck(handleSpecialEventComplete);
                }
            });
        }, 1500);

        nextSpecialEvent = 'police'; 
    } 
        else if (nextSpecialEvent === 'police' || nextSpecialEvent === 'ambulance') {
        const isPolice = (nextSpecialEvent === 'police');
        policeWarningIndex = Math.floor(Math.random() * 3);

        showEmergencyLight(policeWarningIndex);

        triggerToast(0, "Algum veículo está vindo rápido demais!", "leo3.png", true);

        setTimeout(() => {
            runWhenNotPaused(() => {
                hideEmergencyLight();
                if (isPlaying && !isGameOver) {
                    if (isPolice) {
                        spawnPoliceCar(policeWarningIndex, handleSpecialEventComplete);
                    } else {
                        spawnAmbulance(policeWarningIndex, handleSpecialEventComplete);
                    }
                }
            });
        }, 1800);

        nextSpecialEvent = isPolice ? 'ambulance' : 'garbage'; 
    }
}

// =========================================
// FAROLETE DE AVISO (polícia e ambulância)
// =========================================
const emergencyLight = document.getElementById('emergency-light');
const EMERGENCY_SPAWN_Z = -45;   // onde polícia e ambulância nascem (o mesmo valor do entities.js)
const LIGHT_MIN_X = 10;          // região segura da tela, em % (fora do HUD e dos avisos de Léo e Lucas)
const LIGHT_MAX_X = 90;
const LIGHT_MIN_Y = 14;
const LIGHT_MAX_Y = 64;

function clampNumber(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

// Mostra o farolete na faixa do evento. Anda pela faixa, no sentido em que o veículo vai,
// até achar o primeiro ponto que cai na região segura da tela (vale para as 3 câmeras).
function showEmergencyLight(laneIndex) {
    const laneX = getLaneX(laneIndex);
    let first = null;
    let spot = null;

    for (let z = EMERGENCY_SPAWN_Z; z <= 40; z += 5) {
        const p = worldToScreenPercent(laneX, 2.4, z);
        if (!p) continue;
        if (!first) first = p;
        if (p.y >= LIGHT_MIN_Y && p.y <= LIGHT_MAX_Y) {
            spot = p;
            break;
        }
    }
    if (!spot) spot = first || { x: 50, y: 60 };

    emergencyLight.style.left = `${clampNumber(spot.x, LIGHT_MIN_X, LIGHT_MAX_X)}%`;
    emergencyLight.style.top = `${clampNumber(spot.y, LIGHT_MIN_Y, LIGHT_MAX_Y)}%`;
    emergencyLight.classList.remove('hidden');
}

function hideEmergencyLight() {
    emergencyLight.classList.add('hidden');
}

function handleSpecialEventComplete() { 
    specialEventActive = false;
    if (isPlaying && !isGameOver) {
        if (biomeTransitionPending) {
            // A troca de bioma estava esperando: ela religa os spawners quando terminar
            biomeTransitionPending = false;
            triggerBiomeTransition();
        } else {
            startObstacleSpawner(); 
            startItemSpawner(); 
        }
        startSpecialEventTimer(); 
    } 
}

function updateCameraButtonsUI(activeIndex) { 
    const buttons = [btnCamIsometric, btnCamTopdown, btnCamChase]; 
    const baseClasses = "w-full text-white font-bold py-1.5 rounded-lg border border-slate-950 shadow-[2px_2px_0px_#020617] active:translate-y-[2px] active:shadow-none transition-all text-[10px]";

    buttons.forEach((btn, index) => { 
        const colorClasses = (index === activeIndex)
            ? "bg-emerald-600 hover:bg-emerald-500"
            : "bg-slate-700 hover:bg-slate-600";
        btn.className = `${colorClasses} ${baseClasses}`;
    }); 
}
