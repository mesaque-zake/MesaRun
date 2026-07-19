import { initEngine, renderEngine, scene, triggerCameraShake, setCameraFlippedState, triggerCrashZoom, resetCrashZoom, setCameraPreset } from './engine.js';
import { createWorld, updateWorld, setBrakingState, currentSpeed, setActiveBiome } from './world.js';
import { createEntities, movePlayerLeft, movePlayerRight, updateEntities, spawnObstacle, checkCollisions, resetEntities, spawnItem, checkItemCollections, setTruckTransitionTurn, updateLaneOffsets, spawnGarbageTruck, activeGarbageTruck, spawnPoliceCar, activePolice, spawnAmbulance } from './entities.js';

// Elementos da Interface (UI)
const menuBackdrop = document.getElementById('menu-backdrop');
const mainMenu = document.getElementById('main-menu');
const rankingModal = document.getElementById('ranking-modal');
const footer = document.getElementById('footer');
const countdownLayer = document.getElementById('countdown-layer');
const countdownText = document.getElementById('countdown-text');
const hudLayer = document.getElementById('hud-layer');
const gameWrapper = document.getElementById('game-wrapper');

// Elementos do Painel de Configurações
const btnSettings = document.getElementById('btn-settings');
const settingsModal = document.getElementById('settings-modal');
const btnCloseSettings = document.getElementById('btn-close-settings');
const btnCloseSettingsX = document.getElementById('btn-close-settings-x'); // Novo X
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
const btnCloseRankingX = document.getElementById('btn-close-ranking-x'); // Novo X

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

// Novos Elementos do Toast
const toastLayer = document.getElementById('toast-layer');
const toastText = document.getElementById('toast-text');
const toastCharImg = document.getElementById('toast-char-img'); 
const toastBalloon = document.getElementById('toast-balloon');
const toastArrow = document.getElementById('toast-arrow');

// --- VARIÁVEIS DE PONTUAÇÃO E SPAWN ---
let score = 0;              
let itemTimeout = null;     
let toastTimeout = null;    
let leaderboard = JSON.parse(localStorage.getItem('mesarun_ranking')) || [];
let lastTime = performance.now();

// --- CONTROLE DE EVENTOS ESPECIAIS (UNIFICADO) ---
let specialEventTimeout = null;  
let nextSpecialEvent = 'garbage'; 
let policeWarningIndex = 0;      

function init() {
    console.log("MesaRun! Motor 3D Inicializado...");
    initEngine();

    // --- CARREGAMENTO IMEDIATO DO CENÁRIO ---
    createWorld(scene);
    createEntities(scene);

    // Liga as funções de clique dos botões do menu
    setupMenu();

    // Começa o loop da engine
    gameLoop();
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

    // Clicar no Play (Inicia a sequência)
    btnPlay.addEventListener('click', () => {
        startGameSequence();
    });

    // Adiciona escuta do teclado
    window.addEventListener('keydown', (e) => {
        if (!isPlaying) return;

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
        if (!isPlaying || isGameOver) return;

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

function startGameSequence() {
    const topLogos = document.getElementById('top-logos');
    mainMenu.classList.add('hidden');
    footer.classList.add('hidden');
    if (topLogos) topLogos.classList.add('hidden'); // Oculta as logos do topo também

    triggerToast(0, "3...", "leo.png", true);

    setTimeout(() => { 
        triggerToast(0, "2...", "leo.png", true);
    }, 1000);

    setTimeout(() => { 
        triggerToast(0, "1... Acelerando!", "leo.png", true);
    }, 2000);

    setTimeout(() => { 
        triggerToast(0, "Colete o máximo de doações que conseguir!", "lucas.png", true);
    }, 3000);

    setTimeout(() => {
        menuBackdrop.style.opacity = '0'; 

        setTimeout(() => {
            menuBackdrop.classList.add('hidden'); 
            hudLayer.classList.remove('hidden'); 
            speedometerLayer.classList.remove('hidden');
            scoreLayer.classList.remove('hidden'); 

            isPlaying = true;
            startObstacleSpawner();
            startItemSpawner();
            startBiomeTimer(); 

            nextSpecialEvent = 'garbage';
            startSpecialEventTimer();
        }, 500);

    }, 4500);
}

function gameLoop(time) {
    requestAnimationFrame(gameLoop);

    const deltaTime = Math.min((time - lastTime) / 1000, 0.1); 
    lastTime = time;

    if (!isGameOver) {
        updateWorld();
        updateEntities(activeBraking, deltaTime);

        if (isPlaying) {
            const displaySpeed = Math.round((currentSpeed / 0.5) * 53 + 2);
            speedText.innerText = `${displaySpeed} km/h`;
        }
    }

    if (isPlaying && !isGameOver) {
        if (checkCollisions()) {
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
        if (!isPlaying || isGameOver) return;
        const randomDelay = Math.random() * 1000 + 1800; 
        spawnerTimeout = setTimeout(() => {
            spawnObstacle();
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

    triggerCameraShake(1.5); 

    setTimeout(() => {
        menuBackdrop.classList.remove('hidden');
        menuBackdrop.style.opacity = '1';

        hudLayer.classList.add('hidden');
        speedometerLayer.classList.add('hidden');
        scoreLayer.classList.add('hidden');
        toastLayer.classList.add('hidden');

        if (itemTimeout) clearTimeout(itemTimeout);
        if (specialEventTimeout) clearTimeout(specialEventTimeout);

        gameOverModal.classList.remove('hidden');
        gameOverModal.classList.add('flex');

        gameOverScore.innerText = `${score} kg`;
        checkAndShowRecordForm();
    }, 2000);
}

function restartGame() {
    gameOverModal.classList.add('hidden');
    gameOverModal.classList.remove('flex');
    menuBackdrop.classList.add('hidden');
    if (biomeTimer) clearInterval(biomeTimer);
    if (itemTimeout) clearTimeout(itemTimeout);
    if (specialEventTimeout) clearTimeout(specialEventTimeout);

    isGameOver = false;
    brakeCharges = 3;
    activeBraking = false;
    setBrakingState(false);
    score = 0;
    scoreText.innerText = `0 kg`;

    for (let i = 1; i <= 3; i++) {
        const icon = document.getElementById(`brake-icon-${i}`);
        if (icon) icon.classList.remove('grayscale', 'opacity-30');
    }

    resetEntities();
    startGameSequence();
}

function backToMenu() {
    const topLogos = document.getElementById('top-logos');
    gameOverModal.classList.add('hidden');
    gameOverModal.classList.remove('flex');
    if (biomeTimer) clearInterval(biomeTimer);
    if (itemTimeout) clearTimeout(itemTimeout);
    if (specialEventTimeout) clearTimeout(specialEventTimeout);

    scoreLayer.classList.add('hidden');

    isGameOver = false;
    isPlaying = false;
    brakeCharges = 3;
    activeBraking = false;
    setBrakingState(false);
    score = 0;
    scoreText.innerText = `0 kg`;

    speedometerLayer.classList.add('hidden');

    for (let i = 1; i <= 3; i++) {
        const icon = document.getElementById(`brake-icon-${i}`);
        if (icon) icon.classList.remove('grayscale', 'opacity-30');
    }

    resetEntities();

    mainMenu.classList.remove('hidden');
    footer.classList.remove('hidden');
    if (topLogos) topLogos.classList.remove('hidden'); // Volta as logos pro menu
    menuBackdrop.style.opacity = '1';
}

function startItemSpawner() {
    if (itemTimeout) clearTimeout(itemTimeout);

    function scheduleNextItem() {
        if (!isPlaying || isGameOver) return;
        const randomDelay = Math.random() * 1000 + 2500;
        itemTimeout = setTimeout(() => {
            spawnItem();
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
        triggerToast(item.value, item.msg, item.file, false, item.isGarbage);
    }
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

    if (value > 0) {
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

function getCartoonSpriteForFood(itemFile, isGarbage) {
    if (isGarbage) return 'lucas2.png'; 
    if (!itemFile) return 'lucas1.png';

    if (itemFile === 'styrofoam-dinner.glb') return 'leo1.png'; 

    if (itemFile.includes('-half') || itemFile.includes('-slice')) {
        return 'lucas1.png'; 
    }

    const readyMeals = [
        'bowl-broth.glb', 'burger.glb', 'chinese.glb', 'egg-cooked.glb', 
        'fries.glb', 'hot-dog.glb', 'meat-ribs.glb', 'rice-ball.glb', 
        'sandwich.glb', 'sushi-egg.glb', 'taco.glb', 'turkey.glb'
    ];
    if (readyMeals.includes(itemFile)) return 'lucas3.png'; 

    const openWrappers = ['can-open.glb', 'candy-bar-wrapper.glb', 'chocolate-wrapper.glb'];
    if (openWrappers.includes(itemFile)) return 'lucas4.png'; 

    const sweets = ['donut-sprinkles.glb', 'cake.glb'];
    if (sweets.includes(itemFile)) return 'lucas5.png'; 

    const forbidden = ['wine-red.glb', 'wine-white.glb', 'mushroom-half.glb', 'mushroom.glb'];
    if (forbidden.includes(itemFile)) return 'lucas6.png'; 

    return 'lucas1.png'; 
}

// NOVA LÓGICA DO DIÁLOGO CARTOON 
function triggerToast(penalty, msg, fileOrSpriteName, isManualSprite = false, isGarbage = false) {
    if (toastTimeout) clearTimeout(toastTimeout);

    let spriteName = "";
    if (isManualSprite) {
        spriteName = fileOrSpriteName; 
    } else {
        spriteName = getCartoonSpriteForFood(fileOrSpriteName, isGarbage); 
    }
    
    toastCharImg.src = `assets/sprite/cartoon/${spriteName}`;
    toastText.innerText = msg;

    // 1. Limpa todas as classes de layout e animação anteriores
    toastLayer.classList.remove('hidden', 'flex-row', 'flex-row-reverse');
    toastCharImg.classList.remove('slide-in-left', 'slide-in-right');
    toastArrow.className = ''; 
    toastBalloon.classList.remove('balloon-pop');

    // Força o navegador a recalcular o DOM para reiniciar a animação do zero
    void toastLayer.offsetWidth;

    // 2. Define o lado com base no personagem
    if (spriteName.toLowerCase().includes('leo')) {
        // Léo fala da Direita
        toastLayer.classList.add('flex-row-reverse');
        toastArrow.classList.add('toast-arrow-right');
        toastCharImg.classList.add('slide-in-right');
    } else {
        // Lucas fala da Esquerda
        toastLayer.classList.add('flex-row');
        toastArrow.classList.add('toast-arrow-left');
        toastCharImg.classList.add('slide-in-left');
    }

    // 3. Adiciona a classe que faz o balão inflar
    toastBalloon.classList.add('balloon-pop');

    // Garante que o toast esteja visível
    toastLayer.style.display = 'flex';
    toastLayer.style.opacity = '1';

    // 4. Oculta suavemente após 3 segundos
    toastTimeout = setTimeout(() => {
        toastLayer.style.transition = 'opacity 0.3s ease';
        toastLayer.style.opacity = '0';
        
        setTimeout(() => {
            toastLayer.style.display = '';
            toastLayer.classList.add('hidden');
            toastLayer.style.transition = '';
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
    updateLaneOffsets(false);
    setActiveBiome('nature');

    biomeTimer = setInterval(() => {
        if (isPlaying && !isGameOver) {
            triggerBiomeTransition();
        }
    }, 60000); 
}

function triggerBiomeTransition() {
    if (spawnerTimeout) clearTimeout(spawnerTimeout);
    if (itemTimeout) clearTimeout(itemTimeout);

    setTruckTransitionTurn(isFlipped ? -0.20 : 0.20);

    setTimeout(() => {
        isFlipped = !isFlipped;
        setCameraFlippedState(isFlipped);
        updateLaneOffsets(isFlipped);

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
            triggerSpecialEvent();
        }
    }, 30000); 
}

function triggerSpecialEvent() {
    if (spawnerTimeout) clearTimeout(spawnerTimeout);
    if (itemTimeout) clearTimeout(itemTimeout);

    if (nextSpecialEvent === 'garbage') {
        triggerToast(0, "CUIDADO! CAMINHÃO DE LIXO À FRENTE!", "leo2.png", true);

        setTimeout(() => {
            if (isPlaying && !isGameOver) {
                spawnGarbageTruck(handleSpecialEventComplete);
            }
        }, 1500);

        nextSpecialEvent = 'police'; 
    } 
    else if (nextSpecialEvent === 'police') {
        policeWarningIndex = Math.floor(Math.random() * 3);

        const siren = document.getElementById(`warning-siren-${policeWarningIndex}`);
        if (siren) siren.classList.remove('hidden');

        triggerToast(0, "Algum veículo está vindo rápido demais!", "leo3.png", true);

        setTimeout(() => {
            if (siren) siren.classList.add('hidden');
            if (isPlaying && !isGameOver) {
                spawnPoliceCar(policeWarningIndex, handleSpecialEventComplete);
            }
        }, 1800);

        nextSpecialEvent = 'ambulance'; 
    }
    else if (nextSpecialEvent === 'ambulance') {
        policeWarningIndex = Math.floor(Math.random() * 3);

        const siren = document.getElementById(`warning-siren-${policeWarningIndex}`);
        if (siren) siren.classList.remove('hidden');

        triggerToast(0, "Algum veículo está vindo rápido demais!", "leo3.png", true);

        setTimeout(() => {
            if (siren) siren.classList.add('hidden');
            if (isPlaying && !isGameOver) {
                spawnAmbulance(policeWarningIndex, handleSpecialEventComplete);
            }
        }, 1800);

        nextSpecialEvent = 'garbage'; 
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
    buttons.forEach((btn, index) => {
        if (index === activeIndex) {
            btn.className = "w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 rounded-lg border border-slate-950 shadow-[2px_2px_0px_#020617] active:translate-y-[2px] active:shadow-none transition-all text-[10px]";
        } else {
            btn.className = "w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-1.5 rounded-lg border border-slate-950 shadow-[2px_2px_0px_#020617] active:translate-y-[2px] active:shadow-none transition-all text-[10px]";
        }
    });
}
