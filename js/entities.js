/**
 * js/entities.js
 * Gerenciamento do Jogador (Caminhão Sesc), Tráfego de Obstáculos e Itens Colecionáveis.
 * Controla movimentação, inércia, spawn dinâmico e colisões com assets reais mapeados.
 */

const entities = {
    // 1. Configurações do Jogador (Caminhão)
    player: {
        model: null,
        currentLane: 1,       // Faixa inicial: 0 (Esquerda), 1 (Centro), 2 (Direita)
        targetX: 0,           // Posição X de destino no mundo 3D
        currentX: 0,          // Posição X atual no mundo 3D
        zPos: 1.5,            // Posição Z fixa do caminhão na pista (perto da câmera)
        laneWidth: 0.95,      // Distância física entre as faixas no mundo 3D
        laneTransitionSpeed: 0.18, // Velocidade de interpolação (suavidade) da troca de faixa
        rollAmount: 0,        // Grau de inclinação da carroceria (Body Roll)
    },

    // 2. Controle de Spawners e Listas de Entidades
    activeObstacles: [],      // Carros inimigos ativos na pista
    activeItems: [],          // Alimentos 2D colecionáveis ativos na pista
    spawnTimer: 0,            // Temporizador geral de spawn
    spawnInterval: 90,        // Intervalo base de spawn (em frames)

    // Caminhos Reais dos Obstáculos (Modelos 3D GLB do Kenney)
    obstacleModels: [
        'assets/models/cars/police.glb',
        'assets/models/cars/sedan.glb',
        'assets/models/cars/suv-luxury.glb',
        'assets/models/cars/suv.glb',
        'assets/models/cars/taxi.glb'
    ],

    // Caminhos de Assets de Alimentos (Imagens PNG)
    foodSprites: [
        'assets/sprites/food/apple.png',
        'assets/sprites/food/milk.png'
    ],
    negativeFoodSprites: [
        'assets/sprites/negativefood/rotten_apple.png',
        'assets/sprites/negativefood/spoiled_milk.png'
    ],

    textures: {},             // Armazenamento de texturas carregadas para alimentos
    carColormap: null,        // Paleta de cores geral compartilhada para carros e caminhão

    /**
     * Inicializa os modelos e carrega as texturas dos alimentos.
     */
    async init() {
        console.log("[Entities] Carregando assets das entidades...");

        // 1. Carrega a paleta de cores real do Kenney para veículos
        this.carColormap = await PIXI.Assets.load('assets/models/cars/Textures/colormap.png');

        // 2. Carrega o Caminhão Sesc (delivery.glb)
        const truckGltf = await PIXI.Assets.load('assets/models/mycar/delivery.glb');
        this.player.model = PIXI3D.Model.from(truckGltf);
        this.applyCarColormap(this.player.model);
        
        // Ajusta a escala e rotação inicial do caminhão para ficar na pista olhando para frente
        this.player.model.scale.set(0.4, 0.4, 0.4);
        this.player.model.rotationQuaternion.setEulerAngles(0, 180, 0); // Olha na direção oposta do cenário
        this.player.model.position.set(0, 0, this.player.zPos);
        engine.scene3D.addChild(this.player.model);

        // 3. Carrega as texturas PNG dos alimentos 2D (Colecionáveis)
        this.textures.goodFood = [];
        for (let path of this.foodSprites) {
            try {
                this.textures.goodFood.push(await PIXI.Assets.load(path));
            } catch (e) {
                console.warn(`[Entities] Falha ao carregar o alimento: ${path}`);
            }
        }

        this.textures.badFood = [];
        for (let path of this.negativeFoodSprites) {
            try {
                this.textures.badFood.push(await PIXI.Assets.load(path));
            } catch (e) {
                console.warn(`[Entities] Falha ao carregar o alimento negativo: ${path}`);
            }
        }

        this.reset();
    },

    /**
     * Reseta o estado do jogo para reiniciar a partida.
     */
    reset() {
        // Limpa obstáculos existentes do palco gráfico
        for (let obs of this.activeObstacles) {
            engine.scene3D.removeChild(obs.model);
        }
        this.activeObstacles = [];

        // Limpa alimentos existentes do palco gráfico
        for (let item of this.activeItems) {
            engine.scene3D.removeChild(item.sprite);
        }
        this.activeItems = [];

        // Reseta o jogador para a faixa central
        this.player.currentLane = 1;
        this.player.targetX = 0;
        this.player.currentX = 0;
        this.player.rollAmount = 0;
        if (this.player.model) {
            this.player.model.position.set(0, 0, this.player.zPos);
            this.player.model.rotationQuaternion.setEulerAngles(0, 180, 0);
        }

        this.spawnTimer = 0;
    },

    /**
     * Aplica a paleta de cores padrão do Kenney nos modelos 3D de veículos.
     */
    applyCarColormap(model) {
        model.meshes.forEach(mesh => {
            if (mesh.material && mesh.material instanceof PIXI3D.StandardMaterial) {
                mesh.material.baseColorTexture = this.carColormap;
            }
        });
    },

    /**
     * Move o jogador para a faixa da esquerda (-1) ou direita (+1).
     * @param {number} direction -1 para esquerda, 1 para direita
     */
    moveLane(direction) {
        let newLane = this.player.currentLane + direction;
        // Impede que o caminhão saia das 3 faixas da estrada (0, 1, 2)
        if (newLane >= 0 && newLane <= 2) {
            this.player.currentLane = newLane;
            // Calcula a coordenada X correspondente à faixa no espaço 3D
            this.player.targetX = (newLane - 1) * this.player.laneWidth;
        }
    },

    /**
     * Ciclo de Atualização Física e de Spawns (Game Loop).
     */
    update(deltaTime) {
        this.updatePlayerMovement(deltaTime);
        this.updateObstacles(deltaTime);
        this.updateItems(deltaTime);
        this.checkCollisions();
        this.handleSpawning(deltaTime);
    },

    /**
     * Gerencia a movimentação horizontal do caminhão com inércia e efeito de inclinação (Body Roll).
     */
    updatePlayerMovement(deltaTime) {
        if (!this.player.model) return;

        // 1. Calcula a diferença de posição (Inércia da troca de faixa)
        const diffX = this.player.targetX - this.player.currentX;
        
        // Aplica a velocidade de transição usando interpolação linear (lerp)
        this.player.currentX += diffX * this.player.laneTransitionSpeed * deltaTime;
        this.player.model.position.x = this.player.currentX;

        // 2. Calcula o Body Roll (Efeito de inclinação da carroceria)
        const targetRoll = -diffX * 12; // Multiplicador de intensidade de inclinação
        this.player.rollAmount += (targetRoll - this.player.rollAmount) * 0.15 * deltaTime;

        // Aplica a rotação de inclinação no eixo Z, mantendo a direção para frente (Y = 180)
        this.player.model.rotationQuaternion.setEulerAngles(0, 180, this.player.rollAmount);
    },

    /**
     * Controla o spawn programado de novos carros e alimentos baseado em probabilidades.
     */
    handleSpawning(deltaTime) {
        this.spawnTimer += deltaTime;

        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;

            // Sorteia aleatoriamente em qual faixa (0, 1 ou 2) o item vai surgir
            const randomLane = Math.floor(Math.random() * 3);
            const spawnX = (randomLane - 1) * this.player.laneWidth;

            // Sorteia o tipo de entidade: 65% Alimento, 35% Carro obstáculo
            const spawnType = Math.random();

            if (spawnType < 0.65) {
                const isGood = Math.random() < 0.8;
                this.spawnFoodItem(spawnX, isGood);
            } else {
                this.spawnObstacle(spawnX);
            }
        }
    },

    /**
     * Instancia um alimento 2D na pista flutuando no ar.
     */
    spawnFoodItem(xPos, isGood) {
        const pool = isGood ? this.textures.goodFood : this.textures.badFood;
        if (pool.length === 0) return;

        const texture = pool[Math.floor(Math.random() * pool.length)];
        const sprite = new PIXI3D.Sprite3D(texture);

        // Deixa o sprite "de pé" olhando na direção da câmera isométrica
        sprite.rotationQuaternion.setEulerAngles(15, 45, 0);
        sprite.scale.set(0.012, 0.012, 0.012);
        sprite.position.set(xPos, 0.4, 25.0); // Spawna no final da pista (Z = 25)

        engine.scene3D.addChild(sprite);

        this.activeItems.push({
            sprite: sprite,
            xPos: xPos,
            zPos: 25.0,
            isGood: isGood,
            hoverTimer: Math.random() * 10
        });
    },

    /**
     * Instancia um carro obstáculo 3D na pista vindo no contra-fluxo.
     */
    async spawnObstacle(xPos) {
        const path = this.obstacleModels[Math.floor(Math.random() * this.obstacleModels.length)];
        try {
            const gltf = await PIXI.Assets.load(path);
            const model = PIXI3D.Model.from(gltf);

            this.applyCarColormap(model);
            model.scale.set(0.4, 0.4, 0.4);
            model.rotationQuaternion.setEulerAngles(0, 0, 0); // Olha na direção do tráfego vindo (Z negativo)
            model.position.set(xPos, 0, 25.0);

            engine.scene3D.addChild(model);

            this.activeObstacles.push({
                model: model,
                xPos: xPos,
                zPos: 25.0,
                speed: 0.12 // Velocidade de aproximação do tráfego
            });
        } catch (e) {
            console.error("[Entities] Erro ao carregar carro inimigo.", e);
        }
    },

    /**
     * Atualiza a posição de todos os carros de tráfego ativos.
     */
    updateObstacles(deltaTime) {
        for (let i = this.activeObstacles.length - 1; i >= 0; i--) {
            const obs = this.activeObstacles[i];

            // Move o carro na direção do caminhão do jogador (Z diminui)
            obs.zPos -= (world.scrollSpeed + obs.speed) * deltaTime;
            obs.model.position.z = obs.zPos;

            // Se o carro passou completamente por trás do caminhão, remove-o
            if (obs.zPos < -1.0) {
                engine.scene3D.removeChild(obs.model);
                this.activeObstacles.splice(i, 1);
            }
        }
    },

    /**
     * Atualiza a flutuação (onda senoidal) e a rolagem de todos os alimentos 2D ativos.
     */
    updateItems(deltaTime) {
        for (let i = this.activeItems.length - 1; i >= 0; i--) {
            const item = this.activeItems[i];

            // Move o item em direção ao caminhão
            item.zPos -= world.scrollSpeed * deltaTime;
            item.sprite.position.z = item.zPos;

            // Animação de Flutuação Suave (Onda Senoidal)
            item.hoverTimer += 0.1 * deltaTime;
            item.sprite.position.y = 0.4 + Math.sin(item.hoverTimer) * 0.12;

            // Se o item passou do caminhão, remove-o
            if (item.zPos < -1.0) {
                engine.scene3D.removeChild(item.sprite);
                this.activeItems.splice(i, 1);
            }
        }
    },

    /**
     * Algoritmo de Detecção de Colisão em Caixa de Delimitação 3D (Bounding Box).
     */
    checkCollisions() {
        if (!this.player.model) return;

        const pX = this.player.model.position.x;
        const pZ = this.player.model.position.z;

        const colWidth = 0.45;  // Margem lateral de colisão
        const colDepth = 0.65;  // Margem de profundidade de colisão

        // 1. Verifica Colisão com Veículos de Tráfego (Gera Game Over)
        for (let obs of this.activeObstacles) {
            const dx = Math.abs(pX - obs.model.position.x);
            const dz = Math.abs(pZ - obs.model.position.z);

            if (dx < colWidth && dz < colDepth) {
                main.triggerGameOver();
                return;
            }
        }

        // 2. Verifica Colisão com Alimentos Colecionáveis
        for (let i = this.activeItems.length - 1; i >= 0; i--) {
            const item = this.activeItems[i];
            const dx = Math.abs(pX - item.sprite.position.x);
            const dz = Math.abs(pZ - item.sprite.position.z);

            if (dx < colWidth && dz < colDepth) {
                // Item coletado com sucesso!
                main.collectItem(item.isGood);

                engine.scene3D.removeChild(item.sprite);
                this.activeItems.splice(i, 1);
            }
        }
    }
};
