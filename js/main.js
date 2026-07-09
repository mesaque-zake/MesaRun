/**
 * js/main.js
 * Maestro e Controlador Geral do MesaRun!
 * Gerencia ciclo de vida, entradas de usuário (teclado/touch) e interface do usuário (HTML).
 */

const main = {
    isGameActive: false,
    score: 0,
    selectedPlayerId: '',
    selectedPlayerName: '',
    
    // Controle de gestos touch para dispositivos móveis
    touchStartX: 0,
    touchThreshold: 50, // Distância mínima em pixels para registrar um deslize de tela (swipe)

    /**
     * Inicialização primária do jogo. Executada quando a página termina de carregar.
     */
    async init() {
        console.log("[Main] Inicializando maestro do jogo...");
        
        // 1. Renderiza os ícones do Lucide no HTML
        lucide.createIcons();

        // 2. Registra os ouvintes de eventos dos botões da interface HTML
        this.setupUIEvents();

        // 3. Busca a lista de motoristas da API (offline-first)
        await this.loadPlayersList();
    },

    /**
     * Configura os cliques dos botões de iniciar, reiniciar e controles do jogo.
     */
    setupUIEvents() {
        const btnStart = document.getElementById("btn-start");
        const btnRestart = document.getElementById("btn-restart");
        const playerSelect = document.getElementById("player-select");

        // Habilita o botão de iniciar apenas após um jogador ser selecionado
        playerSelect.addEventListener("change", (e) => {
            this.selectedPlayerId = e.target.value;
            // Busca o nome amigável do jogador selecionado
            const selectedOption = e.target.options[e.target.selectedIndex];
            this.selectedPlayerName = selectedOption.text;

            if (this.selectedPlayerId) {
                btnStart.removeAttribute("disabled");
            } else {
                btnStart.setAttribute("disabled", "true");
            }
        });

        // Eventos de clique nos botões das telas HTML
        btnStart.addEventListener("click", () => this.startGame());
        btnRestart.addEventListener("click", () => this.restartGame());

        // Ouvinte de controles do Teclado (Computador)
        window.addEventListener("keydown", (e) => this.handleKeyboardInput(e));

        // Ouvintes de gestos Touch (Celulares/PWA)
        const gameContainer = document.getElementById("game-container");
        gameContainer.addEventListener("touchstart", (e) => {
            this.touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        gameContainer.addEventListener("touchend", (e) => {
            const touchEndX = e.changedTouches[0].screenX;
            this.handleSwipeInput(this.touchStartX, touchEndX);
        }, { passive: true });
    },

    /**
     * Consome a API de dados para listar os motoristas cadastrados na planilha.
     */
    async loadPlayersList() {
        const playerSelect = document.getElementById("player-select");
        
        try {
            const players = await api.fetchPlayers();
            
            // Limpa o seletor HTML
            playerSelect.innerHTML = '<option value="">-- Escolha um motorista --</option>';
            
            // Adiciona cada jogador como uma opção de escolha
            players.forEach(player => {
                const option = document.createElement("option");
                option.value = player.id;
                option.text = player.nome;
                playerSelect.appendChild(option);
            });
        } catch (e) {
            console.error("[Main] Erro ao preencher lista de motoristas.", e);
            playerSelect.innerHTML = '<option value="">Erro ao carregar motoristas</option>';
        }
    },

    /**
     * Captura comandos de direção do teclado.
     */
    handleKeyboardInput(e) {
        if (!this.isGameActive) return;

        // Suporta setas direcionais e teclas clássicas de computador (A e D)
        if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
            entities.moveLane(-1); // Move para a esquerda
        } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
            entities.moveLane(1);  // Move para a direita
        }
    },

    /**
     * Processa gestos de deslizar a tela no celular para mover o caminhão.
     */
    handleSwipeInput(startX, endX) {
        if (!this.isGameActive) return;

        const diffX = endX - startX;

        // Se o arrasto ultrapassar a margem mínima, move na direção correspondente
        if (Math.abs(diffX) > this.touchThreshold) {
            if (diffX > 0) {
                entities.moveLane(1);  // Deslizou para a direita
            } else {
                entities.moveLane(-1); // Deslizou para a esquerda
            }
        }
    },

    /**
     * Transiciona da tela de login para a tela de gameplay ativa.
     */
    async startGame() {
        console.log(`[Main] Rota iniciada por: ${this.selectedPlayerName}`);

        // Oculta a tela de seleção e exibe o HUD do jogo
        document.getElementById("screen-login").classList.add("hidden");
        document.getElementById("hud").classList.remove("hidden");
        
        // Atualiza as informações do jogador no painel superior
        document.getElementById("hud-player-name").innerText = this.selectedPlayerName;
        this.updateHUDScore(0);

        // 1. Inicializa o motor gráfico (caso ainda não tenha sido iniciado)
        const engineReady = engine.init();
        if (!engineReady) {
            console.error("[Main] O motor gráfico não pôde ser inicializado.");
            return;
        }

        // 2. Inicializa os assets de cenário e entidades
        await world.init();
        await entities.init();

        // 3. Adiciona o loop de renderização contínuo do PixiJS (Ticker)
        engine.app.ticker.add(this.tick, this);

        this.score = 0;
        this.isGameActive = true;
    },

    /**
     * O Loop Principal do Jogo executado a cada quadro (aproximadamente 60 FPS).
     */
    tick() {
        if (!this.isGameActive) return;

        // Obtém o deltaTime para normalizar a velocidade independente da taxa de quadros (FPS)
        const deltaTime = engine.app.ticker.deltaTime;

        // Atualiza a rolagem contínua do cenário de fundo
        world.update(deltaTime);

        // Atualiza a física do caminhão, tráfego e alimentos na tela
        entities.update(deltaTime);
    },

    /**
     * Adiciona ou subtrai pontuação quando o jogador colide com um alimento.
     */
    collectItem(isGood) {
        if (isGood) {
            this.score += 10;
            this.updateHUDScore(this.score);
        } else {
            // Penalidade por colidir com comida estragada/negativa
            this.score = Math.max(0, this.score - 5); // Pontuação mínima é 0
            this.updateHUDScore(this.score);

            // Dispara feedback visual de sujeira na tela e aviso textual
            this.triggerSplatFeedback();
        }
    },

    /**
     * Atualiza o valor do placar no painel superior HTML.
     */
    updateHUDScore(val) {
        document.getElementById("hud-score").innerText = val.toString();
    },

    /**
     * Pisca a tela em verde-limão e mostra um alerta textual para alimentos negativos.
     */
    triggerSplatFeedback() {
        const splatOverlay = document.getElementById("splat-overlay");
        const toastMessage = document.getElementById("toast-message");
        const toastText = document.getElementById("toast-text");

        // Frases engraçadas e educativas que podem aparecer na notificação
        const badFoodWarnings = [
            "Lanche industrializado! -5 pontos",
            "Bolo mofado! -5 pontos",
            "Alimento estragado! -5 pontos",
            "Metade de fruta oxidada! -5 pontos"
        ];
        
        // Sorteia o alerta a ser exibido
        toastText.innerText = badFoodWarnings[Math.floor(Math.random() * badFoodWarnings.length)];

        // Ativa o flash translúcido de sujeira (CSS overlay)
        splatOverlay.classList.remove("bg-lime-500/0");
        splatOverlay.classList.add("bg-lime-500/15");

        // Faz o aviso textual flutuar e aparecer na tela
        toastMessage.classList.remove("opacity-0", "translate-y-4");
        toastMessage.classList.add("opacity-100", "translate-y-0");

        // Remove os efeitos visuais após 1.5 segundos
        setTimeout(() => {
            splatOverlay.classList.remove("bg-lime-500/15");
            splatOverlay.classList.add("bg-lime-500/0");

            toastMessage.classList.remove("opacity-100", "translate-y-0");
            toastMessage.classList.add("opacity-0", "translate-y-4");
        }, 1500);
    },

    /**
     * Interrompe o jogo, desativa os loops gráficos e exibe a tela de pontuação final.
     */
    async triggerGameOver() {
        console.log("[Main] Game Over detectado.");
        this.isGameActive = false;

        // Para o loop de renderização gráfica
        engine.app.ticker.remove(this.tick, this);

        // Oculta o HUD e exibe a tela de encerramento
        document.getElementById("hud").classList.add("hidden");
        
        const screenGameOver = document.getElementById("screen-gameover");
        screenGameOver.classList.remove("hidden");

        // Mostra o resultado final obtido na interface
        document.getElementById("final-score").innerText = this.score;

        const uploadStatus = document.getElementById("upload-status");
        uploadStatus.innerText = "Salvando recorde localmente...";

        // Envia os pontos para processamento local e tentativa de sincronização (offline-first)
        try {
            const result = await api.submitScore(this.selectedPlayerId, this.score);
            
            // Exibe o melhor score pessoal atualizado
            document.getElementById("best-score").innerText = result.bestScore;

            if (result.isNewRecord) {
                uploadStatus.innerText = "🔥 Novo Recorde Batido!";
                uploadStatus.classList.add("text-emerald-400", "font-bold");
            } else {
                uploadStatus.innerText = "Recorde salvo com sucesso no dispositivo.";
                uploadStatus.classList.remove("text-emerald-400", "font-bold");
            }
        } catch (e) {
            console.error("[Main] Erro ao salvar pontuação.", e);
            uploadStatus.innerText = "Pontuação salva apenas localmente.";
        }
    },

    /**
     * Reinicia o estado das entidades e reinicia a partida diretamente.
     */
    restartGame() {
        // Oculta a tela de Game Over
        document.getElementById("screen-gameover").classList.add("hidden");
        
        // Reseta o cenário e o caminhão do jogo
        world.createInitialWorld();
        entities.reset();

        // Inicia o jogo novamente
        this.startGame();
    }
};

// Vincula a inicialização do jogo ao carregamento completo da janela do navegador
window.onload = () => {
    main.init();
};
