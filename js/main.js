import { initEngine, renderEngine, scene, triggerCameraShake,
    setCameraFlippedState, setCameraPreset, renderer } from './engine.js';
import { createWorld, updateWorld, setBrakingState, currentSpeed,
    setActiveBiome, spawnMacumbaSpecialEvent, resetWorldScenery } from './world.js';
import { createEntities, movePlayerLeft, movePlayerRight, updateEntities,
    spawnObstacle, checkCollisions, resetEntities, spawnItem, checkItemCollections,
    setTruckTransitionTurn, spawnGarbageTruck, spawnPoliceCar,
    spawnAmbulance, NEGATIVE_FOODS } from './entities.js';

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

function init() { 
    initEngine();

    // --- CARREGAMENTO IMEDIATO DO CENÁRIO ---
    createWorld(scene);
    createEntities(scene);

    // Liga as funções de clique dos botões do menu
    setupMenu();

    // Começa o loop da engine injetando o tempo via API do navegador
    requestAnimationFrame(gameLoop);
}

function setupMenu() { 
    // Abrir o Ranking
    btnRanking.addEventListener('click', () => { 
        updateLeaderboardUI(); 
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
        icon.classList.add('grayscale', 'opacity-30'); 
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

        gameOverScore.innerText = `${score} kg`;
        checkAndShowRecordForm();
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

    for (let i = 1; i <= 3; i++) {
        const icon = document.getElementById(`brake-icon-${i}`);
        if (icon) icon.classList.remove('grayscale', 'opacity-30');
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

    triggerFloatingText(item.value, itemX);

    if (!item.isHealthy) {
        goodStreak = 0; // pegar item proibido quebra a sequência
        // Primeira vez da categoria: pop-up educativo. Depois, o aviso no canto como antes.
        if (!tryShowEducationalPopup(item.category)) {
            triggerToast(item.value, item.msg, item.category, false, item.isGarbage);
        }
    } else {
        goodStreak++;
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
    manipulado: { title: 'Já foi mexido!', text: 'Frutas e legumes cortados perdem a proteção da casca e estragam mais rápido. Só coletamos alimentos inteiros.' },
    preparado:  { title: 'Comida pronta não!', text: 'Refeições já preparadas não entram na coleta. Coletamos alimentos crus ou fechados, que duram mais e chegam seguros.' },
    lanche:     { title: 'Lanche pronto não!', text: 'Lanches prontos, como hambúrguer, cachorro-quente e taco, não fazem parte das doações que coletamos.' },
    aberto:     { title: 'Embalagem aberta!', text: 'Se a embalagem já foi aberta, não dá para garantir que o alimento está seguro. Só coletamos produtos lacrados.' },
    doce:       { title: 'Doce com recheio!', text: 'Bolos, donuts e doces recheados estragam rápido e não fazem parte da coleta.' },
    super:      { title: 'Isso nem pensar!', text: 'Bebidas alcoólicas e cogumelos não são coletados. É a maior penalidade do jogo, por isso o aviso é mais forte.' },
    easterEgg:  { title: 'Isso é história!', text: 'HAHAHA! O "Mesa São Paulo" entregava isso em 1994, hoje não mais!', special: true }
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

function updateLeaderboardUI() { 
    const rankingList = document.getElementById('ranking-list'); 
    if (!rankingList) return;

    rankingList.innerHTML = '';

    if (leaderboard.length === 0) {
        rankingList.innerHTML = `<li class="text-center text-slate-400 italic py-6 text-xs">Nenhum recorde registrado ainda. Seja o primeiro!</li>`;
        return;
    }

    leaderboard.forEach((entry, index) => {
        const li = document.createElement('li');
        li.className = "flex justify-between border-b border-white/5 pb-1 text-xs md:text-sm";

        let positionIndicator = `${index + 1}. `;
        if (index === 0) positionIndicator = "🥇 ";
        else if (index === 1) positionIndicator = "🥈 ";
        else if (index === 2) positionIndicator = "🥉 ";

        li.innerHTML = `<span>${positionIndicator}${entry.name}</span><span class="text-emerald-400 font-bold">${entry.score} kg</span>`;
        rankingList.appendChild(li);
    });
}

function checkAndShowRecordForm() { 
    if (score <= 0) {
        recordForm.classList.add('hidden'); 
        recordForm.classList.remove('flex'); 
        return;
    }

    const isNewRecord = leaderboard.length < 10 || score > leaderboard[leaderboard.length - 1].score;

    if (isNewRecord) {
        recordForm.classList.remove('hidden');
        recordForm.classList.add('flex');
        playerNameInput.value = '';
    } else {
        recordForm.classList.add('hidden');
        recordForm.classList.remove('flex');
    }
}

function saveRecord() { 
    const name = playerNameInput.value.trim().toUpperCase();
    if (!name) { 
        alert("Por favor, digite seu nome!"); 
        return; 
    }

    leaderboard.push({ name: name, score: score });
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 10);

    localStorage.setItem('mesarun_ranking', JSON.stringify(leaderboard));

    recordForm.classList.remove('flex');
    recordForm.classList.add('hidden');

    updateLeaderboardUI();
    alert("Recorde gravado com sucesso!");
}

function startBiomeTimer() { 
    if (biomeTimer) clearInterval(biomeTimer);

    currentBiomeIndex = 0;
    isFlipped = false;
    setCameraFlippedState(false);
    setActiveBiome('nature');

    biomeTimer = setInterval(() => {
        if (isPlaying && !isGameOver) {
            runWhenNotPaused(triggerBiomeTransition);
        }
    }, 20000); 
}

function triggerBiomeTransition() { 
    if (spawnerTimeout) clearTimeout(spawnerTimeout); 
    if (itemTimeout) clearTimeout(itemTimeout);

    setTruckTransitionTurn(isFlipped ? -0.20 : 0.20);

    setTimeout(() => {
        isFlipped = !isFlipped;
        setCameraFlippedState(isFlipped);
        currentBiomeIndex = (currentBiomeIndex + 1) % BIOMES_LIST.length;
        setActiveBiome(BIOMES_LIST[currentBiomeIndex]);

        setTimeout(() => {
            setTruckTransitionTurn(0);
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
            runWhenNotPaused(triggerSpecialEvent);
        }
    }, 30000); 
}

function triggerSpecialEvent() { 
    if (spawnerTimeout) clearTimeout(spawnerTimeout); 
    if (itemTimeout) clearTimeout(itemTimeout);

    if (nextSpecialEvent === 'garbage') {
        triggerToast(0, "CUIDADO! Caminhão de lixo à frente!", "leo2.png", true);

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

        const siren = document.getElementById(`warning-siren-${policeWarningIndex}`);
        if (siren) siren.classList.remove('hidden');

        triggerToast(0, "Algum veículo está vindo rápido demais!", "leo3.png", true);

        setTimeout(() => {
            runWhenNotPaused(() => {
                if (siren) siren.classList.add('hidden');
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

function handleSpecialEventComplete() { 
    if (isPlaying && !isGameOver) {
        startObstacleSpawner(); 
        startItemSpawner(); 
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
