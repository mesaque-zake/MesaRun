import { initEngine, renderEngine, scene, triggerCameraShake, setCameraFlippedState } from './engine.js';
import { createWorld, updateWorld, setBrakingState, currentSpeed, setActiveBiome } from './world.js';
import { createEntities, movePlayerLeft, movePlayerRight, updateEntities, spawnObstacle, checkCollisions, resetEntities, spawnItem, checkItemCollections, setTruckTransitionTurn, updateLaneOffsets } from './entities.js';
// Elementos da Interface (UI)
const menuBackdrop = document.getElementById('menu-backdrop');
const mainMenu = document.getElementById('main-menu');
const rankingModal = document.getElementById('ranking-modal');
const footer = document.getElementById('footer');
const countdownLayer = document.getElementById('countdown-layer');
const countdownText = document.getElementById('countdown-text');
const hudLayer = document.getElementById('hud-layer');

// --- VARIÁVEIS DO CRONÔMETRO DE BIOMAS ---
let biomeTimer = null;                         // Timer de 60 segundos [2]
const BIOMES_LIST = ['nature', 'suburban', 'industrial', 'city']; // Lista de fases [1]
let currentBiomeIndex = 0;                     // Índice da fase ativa
let isFlipped = false;                         // Flag que monitora a inversão de câmera

// Botões
const btnPlay = document.getElementById('btn-play');
const btnRanking = document.getElementById('btn-ranking');
const btnCloseRanking = document.getElementById('btn-close-ranking');

// --- CONTROLE DE FREIOS (MesaRun!) ---
let isGameOver = false;     // Controla o congelamento (Hit Stop) da tela
let isPlaying = false; 
let brakeCharges = 3;       // Limite de 3 cargas por partida
let activeBraking = false;  // Monitora se o botão de freio está pressionado agora
let spawnerInterval = null; // Armazena o timer do spawn para podermos parar no game over

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
const toastLayer = document.getElementById('toast-layer');
const toastText = document.getElementById('toast-text');

// --- VARIÁVEIS DE PONTUAÇÃO E SPAWN ---
let score = 0;              // Total de kg arrecadados
let itemTimeout = null;     // Temporizador dinâmico para novos alimentos
let toastTimeout = null;    // Temporizador para esconder o balão de alerta
let leaderboard = JSON.parse(localStorage.getItem('mesarun_ranking')) || [];

function init() {
    console.log("MesaRun! Motor 3D Inicializado...");
    initEngine();
    
    // --- CARREGAMENTO IMEDIATO DO CENÁRIO (Roda em desfoque atrás do menu) ---
    createWorld(scene);
    createEntities(scene);
    
    // Liga as funções de clique dos botões do menu
    setupMenu();

    // Começa o loop da engine
    gameLoop();
}

function setupMenu() {
    // Abrir o Ranking (Carrega os dados reais do dispositivo antes de abrir)
    btnRanking.addEventListener('click', () => {
        updateLeaderboardUI(); // Atualiza a lista visualmente
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

    // Adiciona escuta do teclado (Ação contínua e limites de freio padrão de corrida)
    window.addEventListener('keydown', (e) => {
        if (!isPlaying) return;

        // Comportamento padrão simples: esquerda vai para a esquerda, direita vai para a direita
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
            movePlayerLeft();
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
            movePlayerRight();
        }
        
        // Ativa o Freio (Pressionar)
        if ((e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') && !activeBraking && brakeCharges > 0) {
            activeBraking = true;
            brakeCharges--;
            setBrakingState(true);
            updateBrakeUI(); // Apaga um ícone na tela
        }
    });

    // ESCUTA DE SOLTURA DE TECLA: Percebe quando você solta a seta para baixo (o down) ou a tecla "S" [2]
    window.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
            activeBraking = false;  // Libera o estado de freio interno
            setBrakingState(false); // Libera a física do asfalto para voltar a andar!
        }
    });

    // ESCUTA DE PERDA DE FOCO: Desativa o freio caso o jogador mude de aba ou clique fora do jogo (Evita tecla presa!) [2]
    window.addEventListener('blur', () => {
        activeBraking = false;
        setBrakingState(false);
    });

    // Conecta as ações dos botões do painel de Game Over
    btnRestart.addEventListener('click', () => {
        restartGame();
    });

    btnBackMenu.addEventListener('click', () => {
        backToMenu();
    });

    // Conecta a ação de salvar o nome no ranking
    btnSaveRecord.addEventListener('click', () => {
        saveRecord();
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
    
    // 4. Limpa a tela, esconde o blur suavemente e inicia os obstáculos
    setTimeout(() => {
        countdownLayer.classList.add('hidden');
        
        // Remove o efeito de vidro fosco suavemente
        menuBackdrop.style.opacity = '0'; 
        
        setTimeout(() => {
            menuBackdrop.classList.add('hidden'); 
            hudLayer.classList.remove('hidden'); // Mostra os ícones de freio
            speedometerLayer.classList.remove('hidden');

            // --- ATIVA O GAMEPLAY ATIVO NA TELA ---
            isPlaying = true;        // Libera comandos do jogador e freios
            startObstacleSpawner();  // Começa a gerar os carros na pista
            startBiomeTimer(); 
            
            
            // --- INICIALIZAÇÃO DE PLACARES E ALIMENTOS (MOVIDO PARA O MOMENTO ATIVO!) ---
            score = 0;
            scoreText.innerText = "0 kg";
            scoreLayer.classList.remove('hidden');       // Exibe o placar âmbar
            toastLayer.classList.add('hidden');          // Garante que o toast inicie fechado
            startItemSpawner();                          // Ativa o spawner dinâmico de alimentos
            
            console.log("Sinal Verde! Os caminhões estão na pista!");
        }, 500); // Aguarda o meio segundo do Fade Out do desfoque
        
    }, 4500);
}

function gameLoop() {
    requestAnimationFrame(gameLoop);
    
    if (!isGameOver) {
        updateWorld();
        updateEntities(activeBraking);
        
        // --- DINÂMICA DO VELOCÍMETRO EM TEMPO REAL ---
        if (isPlaying) {
            const displaySpeed = Math.round((currentSpeed / 0.5) * 53 + 2);
            speedText.innerText = `${displaySpeed} km/h`;
        }
    }

    if (isPlaying && !isGameOver) {
        if (checkCollisions()) {
            triggerGameOver();
        }
        
        // CHECA A COLETA DOS ITENS DE COMIDA A CADA FRAME
        checkItemCollections(handleItemCollection);
    }
    
    renderEngine(isPlaying);
}

window.onload = init;

// Atualiza a opacidade do ícone de freio usado, deixando-o cinza
function updateBrakeUI() {
    // Como as cargas caem de 3 para 0, desativamos o ícone correspondente
    // Carga 2 resta = apaga o ícone 3. Carga 1 resta = apaga o ícone 2. Carga 0 resta = apaga o ícone 1.
    const iconIndex = brakeCharges + 1; 
    const icon = document.getElementById(`brake-icon-${iconIndex}`);
    if (icon) {
        icon.classList.add('grayscale', 'opacity-30');
    }
}
// Inicia o gerador de obstáculos a cada 2.5 segundos
function startObstacleSpawner() {
    if (spawnerInterval) clearInterval(spawnerInterval);

    // Dispara o primeiro obstáculo após 2 segundos de jogo e repete a cada 2.5s
    spawnerInterval = setInterval(() => {
        spawnObstacle();
    }, 2500); 
}

// Dispara o fluxo cinematográfico da colisão
function triggerGameOver() {
    isGameOver = true;
    isPlaying = false;

    if (biomeTimer) clearInterval(biomeTimer);
    
    // Para o temporizador de novos obstáculos imediatamente
    if (spawnerInterval) clearInterval(spawnerInterval);

    // 1. Dispara o Tremor de Tela na câmera
    triggerCameraShake(1.5); 

    // 2. Aguarda 2 segundos de Congelamento de Impacto (Hit Stop)
    setTimeout(() => {
        // Reativa a camada de desfoque suave (blur)
        menuBackdrop.classList.remove('hidden');
        menuBackdrop.style.opacity = '1';
        
        // Esconde o HUD de freios, velocímetro e placar âmbar
        hudLayer.classList.add('hidden');
        speedometerLayer.classList.add('hidden');
        scoreLayer.classList.add('hidden'); // <-- ADICIONADO!
        toastLayer.classList.add('hidden'); // <-- ADICIONADO!

        // Limpa o timer de alimentos
        if (itemTimeout) clearTimeout(itemTimeout);

        // 4. Exibe o painel de resultados de Game Over (Opção B)
        gameOverModal.classList.remove('hidden');
        gameOverModal.classList.add('flex');
        
        // ESCOVA O PLACAR REAL DA PARTIDA NO MODAL!
        gameOverScore.innerText = `${score} kg`; // <-- MUDADO! Escreve os kg reais coletados
        checkAndShowRecordForm();
    }, 2000);

}

// Reinicia a partida imediatamente sem passar pelo menu inicial
function restartGame() {
    gameOverModal.classList.add('hidden');
    gameOverModal.classList.remove('flex');
    menuBackdrop.classList.add('hidden');
    if (biomeTimer) clearInterval(biomeTimer);
    if (itemTimeout) clearTimeout(itemTimeout);
    
    // Reseta todas as variáveis de estado
    isGameOver = false;
    brakeCharges = 3;
    activeBraking = false;
    setBrakingState(false);
    
    // Restaura visualmente os 3 ícones de freio na tela
    for (let i = 1; i <= 3; i++) {
        const icon = document.getElementById(`brake-icon-${i}`);
        if (icon) icon.classList.remove('grayscale', 'opacity-30');
    }

    // Limpa a tela e reseta o caminhão do jogador
    resetEntities();

    // Começa a contagem regressiva direto!
    startGameSequence();
}

function backToMenu() {
    gameOverModal.classList.add('hidden');
    gameOverModal.classList.remove('flex');
    if (biomeTimer) clearInterval(biomeTimer);
    if (itemTimeout) clearTimeout(itemTimeout);
    scoreLayer.classList.add('hidden'); // Oculta o placar âmbar
    
    isGameOver = false;
    isPlaying = false;
    brakeCharges = 3;
    activeBraking = false;
    setBrakingState(false);

    // Oculta o velocímetro ao retornar para o menu inicial
    speedometerLayer.classList.add('hidden');

    for (let i = 1; i <= 3; i++) {
        const icon = document.getElementById(`brake-icon-${i}`);
        if (icon) icon.classList.remove('grayscale', 'opacity-30');
    }

    resetEntities();

    // Reexibe o Menu Principal e o Rodapé por trás do vidro fosco [1]
    mainMenu.classList.remove('hidden');
    footer.classList.remove('hidden');
    menuBackdrop.style.opacity = '1';
}
// Dispara o gerador de alimentos com tempos variáveis sem padrão (entre 1 e 2 segundos)
function startItemSpawner() {
    if (itemTimeout) clearTimeout(itemTimeout);

    function scheduleNextItem() {
        if (!isPlaying || isGameOver) return;
        const randomDelay = Math.random() * 1000 + 2500; // Sorteia entre 1000ms e 2000ms
        itemTimeout = setTimeout(() => {
            spawnItem();
            scheduleNextItem(); // Recursivamente agenda o próximo spawn de forma dinâmica!
        }, randomDelay);
    }
    
    scheduleNextItem();
}

// Processa a pontuação, o texto flutuante e os alertas
function handleItemCollection(item, itemX) {
    // 1. Atualiza a pontuação de quilos
    score += item.value;
    if (score < 0) score = 0; // Impede que o caminhão fique com kg negativos
    scoreText.innerText = `${score} kg`;

    // 2. Dispara o texto 3D flutuante subindo na pista
    triggerFloatingText(item.value, itemX);

    // 3. Se for uma coleta proibida, exibe o balão de alerta (Toast) [3]
    if (!item.isHealthy) {
        triggerToast(item.value, item.msg);
    }
}

// Gera e anima o balão de texto flutuante exatamente no local de colisão
function triggerFloatingText(value, xPos) {
    const gameWrapper = document.getElementById('game-wrapper');
    if (!gameWrapper) return;

    const textDiv = document.createElement('div');
    textDiv.className = `absolute bottom-[28%] font-[Bangers] text-4xl tracking-wide z-30 pointer-events-none transition-all duration-700 transform translate-y-0 opacity-100`;
    
    // Alinha a coluna horizontal de surgimento do texto baseado na pista de coleta [1]
    let leftPercent = "50%";
    if (xPos > 2) leftPercent = "28%";
    else if (xPos < -5) leftPercent = "72%";
    textDiv.style.left = leftPercent;
    textDiv.style.transform = "translateX(-50%)";

    if (value > 0) {
        textDiv.innerText = `+${value} kg`;
        textDiv.classList.add('text-green-400', 'drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)]');
    } else {
        textDiv.innerText = `${value} kg`;
        textDiv.classList.add('text-red-500', 'drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)]');
    }

    gameWrapper.appendChild(textDiv);

    // Animação CSS subindo e sumindo
    setTimeout(() => {
        textDiv.style.transform = "translate(-50%, -100px)";
        textDiv.style.opacity = "0";
    }, 50);

    // Desmonta o elemento do DOM após a animação acabar
    setTimeout(() => {
        textDiv.remove();
    }, 800);
}

// Gerencia a entrada suave e o fechamento do Toast Notification de alimentos proibidos
function triggerToast(penalty, msg) {
    if (toastTimeout) clearTimeout(toastTimeout);

    // Se for neutral (Mesa 1994), mostra apenas o texto, senão mostra a penalidade [3]
    const penaltyText = penalty === 0 ? "" : `${penalty} kg | `;
    toastText.innerText = `${penaltyText}${msg}`;

    // Mostra o balão e aciona a transição do Tailwind (escala e opacidade)
    toastLayer.classList.remove('hidden');
    setTimeout(() => {
        toastLayer.classList.remove('scale-95', 'opacity-0');
        toastLayer.classList.add('scale-100', 'opacity-100');
    }, 10);

    // Oculta suavemente após 2.5 segundos
    toastTimeout = setTimeout(() => {
        toastLayer.classList.remove('scale-100', 'opacity-100');
        toastLayer.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            toastLayer.classList.add('hidden');
        }, 300);
    }, 2500);
}
// Atualiza a lista do ranking HTML com os dados reais salvos no LocalStorage [1]
function updateLeaderboardUI() {
    const rankingList = document.getElementById('ranking-list');
    if (!rankingList) return;

    rankingList.innerHTML = ''; // Limpa os registros antigos da tela

    // Se o ranking estiver totalmente em branco, mostra uma mensagem elegante [1]
    if (leaderboard.length === 0) {
        rankingList.innerHTML = `<li class="text-center text-slate-400 italic py-6 text-sm">Nenhum recorde registrado ainda. Seja o primeiro a pontuar!</li>`;
        return;
    }

    // Renderiza o Top 10 na tela
    leaderboard.forEach((entry, index) => {
        const li = document.createElement('li');
        li.className = "flex justify-between border-b border-white/10 pb-2 text-sm md:text-base";
        
        // Destaca o TOP 3 com medalhas de ouro, prata e bronze!
        let positionIndicator = `${index + 1}. `;
        if (index === 0) positionIndicator = "🥇 ";
        else if (index === 1) positionIndicator = "🥈 ";
        else if (index === 2) positionIndicator = "🥉 ";

        li.innerHTML = `<span>${positionIndicator}${entry.name}</span><span class="text-green-400 font-bold">${entry.score} kg</span>`;
        rankingList.appendChild(li);
    });
}

// Checa se o jogador acumulou pontos suficientes para entrar no Top 10 [1]
function checkAndShowRecordForm() {
    // Se não fez pontos ou fez 0, não qualifica para recorde
    if (score <= 0) {
        recordForm.classList.add('hidden');
        recordForm.classList.remove('flex');
        return;
    }

    // Qualifica se a lista tiver menos de 10 nomes ou se os kg atuais forem maiores que o último colocado
    const isNewRecord = leaderboard.length < 10 || score > leaderboard[leaderboard.length - 1].score;

    if (isNewRecord) {
        recordForm.classList.remove('hidden');
        recordForm.classList.add('flex');
        playerNameInput.value = ''; // Limpa o campo para o novo nome
    } else {
        recordForm.classList.add('hidden');
        recordForm.classList.remove('flex');
    }
}

// Salva o nome e os kg no banco de dados local do dispositivo [1]
function saveRecord() {
    const name = playerNameInput.value.trim().toUpperCase();
    if (!name) {
        alert("Por favor, digite seu nome!");
        return;
    }

    // Adiciona a nova pontuação na lista
    leaderboard.push({ name: name, score: score });

    // Ordena do maior para o menor (ordem decrescente)
    leaderboard.sort((a, b) => b.score - a.score);

    // Limita a lista estritamente aos 10 melhores
    leaderboard = leaderboard.slice(0, 10);

    // Salva a lista convertida em texto de forma permanente no navegador [1]
    localStorage.setItem('mesarun_ranking', JSON.stringify(leaderboard));

    // Esconde o formulário de recorde de forma suave
    recordForm.classList.remove('flex');
    recordForm.classList.add('hidden');

    updateLeaderboardUI(); // Atualiza a lista interna
    alert("Recorde gravado com sucesso no ranking local!");
}

// Inicia o cronômetro para mudar de bioma a cada 60 segundos de partida [2]
function startBiomeTimer() {
    if (biomeTimer) clearInterval(biomeTimer);
    
    currentBiomeIndex = 0;
    isFlipped = false;
    setCameraFlippedState(false);
    updateLaneOffsets(false);
    setActiveBiome('nature');

    // Dispara a transição a cada 60 segundos [2]
    biomeTimer = setInterval(() => {
        if (isPlaying && !isGameOver) {
            triggerBiomeTransition();
        }
    }, 60000); 
}

// Orquestra a transição cinematográfica de fase com curva, luzes e inversão de faixas [2]
function triggerBiomeTransition() {
    // 1. Pausa os temporizadores de spawn imediatamente (A pista esvazia por 1.5s de segurança) [2]
    if (spawnerInterval) clearInterval(spawnerInterval);
    if (itemTimeout) clearTimeout(itemTimeout);

    // 2. Faz o caminhão dobrar sutilmente para o lado da nova via [2]
    setTruckTransitionTurn(isFlipped ? -0.20 : 0.20);

    // 3. Após 1.5 segundos de pista limpa, inverte a diagonal da câmera e muda o bioma [2]
    setTimeout(() => {
        isFlipped = !isFlipped;
        setCameraFlippedState(isFlipped);   // Inverte a câmera no engine.js
        updateLaneOffsets(isFlipped);       // Inverte as coordenadas 3D das faixas [2]

        // Avança de fase [1]
        currentBiomeIndex = (currentBiomeIndex + 1) % BIOMES_LIST.length;
        setActiveBiome(BIOMES_LIST[currentBiomeIndex]); // Ativa a nova iluminação e cor de chão no world.js [2]

        // 4. Após mais 1.5 segundos, endireita o caminhão e retoma o tráfego [2]
        setTimeout(() => {
            setTruckTransitionTurn(0); // Endireita o caminhão
            
            if (isPlaying && !isGameOver) {
                startObstacleSpawner();
                startItemSpawner();
            }
        }, 1500);

    }, 1500);
}