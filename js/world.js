/**
 * js/world.js
 * Gerenciamento do Cenário Infinito e Transições de Bioma.
 * Controla a movimentação das pistas, terrenos e obstáculos laterais.
 */

const world = {
    // Velocidade base de rolagem do cenário (Z-axis)
    scrollSpeed: 0.08,

    // Configurações de proporções dos segmentos do chão
    segmentLength: 3.0,     // Comprimento físico de cada bloco de estrada no mundo 3D
    totalSegments: 12,      // Quantidade de blocos mantidos na "esteira" infinita

    // Armazenamento de Recursos Carregados
    textures: {},
    models: {},

    // Listas de controle de entidades ativas no cenário
    activeSegments: [],     // Blocos de pista e chão ativos na tela
    currentBiome: 'forest', // Biomas ativos: 'forest' ou 'city'
    distanceTraveled: 0,    // Distância total percorrida pelo jogador

    /**
     * Carrega todos os recursos gráficos (PNGs e GLBs) do cenário.
     */
    async init() {
        console.log("[World] Carregando assets do cenário...");

        // 1. Carrega as Texturas 2D (Chão e Rua)
        this.textures.road = await PIXI.Assets.load('assets/sprites/street/road-straight.png');
        this.textures.forestGround = await PIXI.Assets.load('assets/models/biome/florest/ground.png');

        // 2. Carrega as Texturas 2D das Árvores (Billboard)
        this.textures.trees = [
            await PIXI.Assets.load('assets/models/biome/florest/tree/stump_square_SE.png'),
            await PIXI.Assets.load('assets/models/biome/florest/tree/tree_blocks_NE.png'),
            await PIXI.Assets.load('assets/models/biome/florest/tree/tree_blocks_SE.png'),
            await PIXI.Assets.load('assets/models/biome/florest/tree/tree_blocks_dark_NE.png'),
            await PIXI.Assets.load('assets/models/biome/florest/tree/tree_blocks_fall_NE.png')
        ];

        // 3. Carrega a Textura de Cores dos Prédios 3D
        this.textures.cityColormap = await PIXI.Assets.load('assets/models/biome/city/Textures/colormap.png');

        // 4. Carrega os Modelos 3D dos Prédios (GLB)
        this.models.buildings = [
            await PIXI.Assets.load('assets/models/biome/city/building-a.glb'),
            await PIXI.Assets.load('assets/models/biome/city/building-b.glb'),
            await PIXI.Assets.load('assets/models/biome/city/building-c.glb'),
            await PIXI.Assets.load('assets/models/biome/city/building-f.glb'),
            await PIXI.Assets.load('assets/models/biome/city/building-g.glb')
        ];

        // 5. Inicializa os blocos da pista
        this.createInitialWorld();
    },

    /**
     * Cria a sequência inicial de pistas de forma alinhada na tela.
     */
    createInitialWorld() {
        for (let i = 0; i < this.totalSegments; i++) {
            // Posiciona cada segmento sequencialmente no eixo Z de profundidade
            const zPosition = i * this.segmentLength;
            this.spawnSegment(zPosition);
        }
    },

    /**
     * Instancia um bloco de cenário (Estrada + Terrenos laterais + Decoração).
     * @param {number} zPosition Posição no eixo Z de profundidade
     */
    spawnSegment(zPosition) {
        const segmentContainer = new PIXI.Container();

        // 1. Cria a Estrada central (deitada no chão)
        const road = new PIXI3D.Sprite3D(this.textures.road);
        road.rotationQuaternion.setEulerAngles(90, 0, 0); // Rotaciona 90 graus para deitar horizontalmente
        road.scale.set(0.015, 0.015, 0.015);             // Ajusta escala proporcional do PNG no mundo 3D
        road.position.set(0, 0, 0);
        segmentContainer.addChild(road);

        // 2. Cria o Terreno da Esquerda
        const groundLeft = new PIXI3D.Sprite3D(this.textures.forestGround);
        groundLeft.rotationQuaternion.setEulerAngles(90, 0, 0);
        groundLeft.scale.set(0.015, 0.015, 0.015);
        groundLeft.position.set(-this.segmentLength, 0, 0);
        segmentContainer.addChild(groundLeft);

        // 3. Cria o Terreno da Direita
        const groundRight = new PIXI3D.Sprite3D(this.textures.forestGround);
        groundRight.rotationQuaternion.setEulerAngles(90, 0, 0);
        groundRight.scale.set(0.015, 0.015, 0.015);
        groundRight.position.set(this.segmentLength, 0, 0);
        segmentContainer.addChild(groundRight);

        // 4. Cria decorações nas laterais dependendo do Bioma Ativo
        let leftDecor = null;
        let rightDecor = null;

        if (this.currentBiome === 'forest') {
            // Sorteia e instancia as árvores 2D na esquerda e direita (Billboards)
            leftDecor = this.createTreeDecoration(-this.segmentLength - 0.5);
            rightDecor = this.createTreeDecoration(this.segmentLength + 0.5);
        } else if (this.currentBiome === 'city') {
            // Sorteia e instancia os prédios 3D na esquerda e direita
            leftDecor = this.createBuildingDecoration(-this.segmentLength - 1.2, true);
            rightDecor = this.createBuildingDecoration(this.segmentLength + 1.2, false);
        }

        if (leftDecor) segmentContainer.addChild(leftDecor);
        if (rightDecor) segmentContainer.addChild(rightDecor);

        // Define a posição Z inicial do bloco de cenário
        segmentContainer.position.set(0, 0, zPosition);

        // Adiciona o bloco ao palco principal do motor gráfico
        engine.scene3D.addChild(segmentContainer);

        // Salva na lista de segmentos ativos para monitoramento
        this.activeSegments.push({
            container: segmentContainer,
            zPosition: zPosition,
            decorations: [leftDecor, rightDecor]
        });
    },

    /**
     * Cria e configura um sprite 2D de árvore de pé.
     */
    createTreeDecoration(xOffset) {
        // Seleciona um sprite aleatório do array de árvores
        const randomIndex = Math.floor(Math.random() * this.textures.trees.length);
        const texture = this.textures.trees[randomIndex];

        const tree = new PIXI3D.Sprite3D(texture);
        // Deixa a árvore "de pé" (olhando ligeiramente para cima) para manter o volume
        tree.rotationQuaternion.setEulerAngles(15, 45, 0);
        tree.scale.set(0.012, 0.012, 0.012);
        tree.position.set(xOffset, 0.5, 0); // Eleva um pouco no eixo Y para não afundar no chão

        return tree;
    },

    /**
     * Cria e configura um modelo 3D de prédio.
     */
    createBuildingDecoration(xOffset, rotateToRoad) {
        const randomIndex = Math.floor(Math.random() * this.models.buildings.length);
        const gltf = this.models.buildings[randomIndex];

        // Instancia o modelo 3D a partir do arquivo GLB
        const building = PIXI3D.Model.from(gltf);

        // Aplica a colormap de texturas ao material do prédio para colorir o modelo
        building.meshes.forEach(mesh => {
            if (mesh.material && mesh.material instanceof PIXI3D.StandardMaterial) {
                mesh.material.baseColorTexture = this.textures.cityColormap;
            }
        });

        // Rotaciona o prédio para ficar de frente para a avenida dependendo da lateral
        const rotationAngle = rotateToRoad ? 90 : -90;
        building.rotationQuaternion.setEulerAngles(0, rotationAngle, 0);
        building.scale.set(0.4, 0.4, 0.4);
        building.position.set(xOffset, 0, 0);

        return building;
    },

    /**
     * Atualiza a rolagem do cenário em tempo de execução (Game Loop).
     * @param {number} deltaTime Tempo decorrido desde o último quadro
     */
    update(deltaTime) {
        this.distanceTraveled += this.scrollSpeed * deltaTime;

        // Gerencia a transição dinâmica de Bioma baseada na distância percorrida
        // Quando ultrapassa 250 de distância, o cenário muda suavemente para cidade
        if (this.distanceTraveled > 250 && this.currentBiome === 'forest') {
            this.currentBiome = 'city';
            console.log("[World] Mudando bioma para: CITY");
        }

        for (let i = this.activeSegments.length - 1; i >= 0; i--) {
            const segment = this.activeSegments[i];

            // Move o segmento em direção à câmera (reduzindo o eixo Z)
            segment.zPosition -= this.scrollSpeed * deltaTime;
            segment.container.position.z = segment.zPosition;

            // Se o segmento passou completamente por trás da câmera, recicla-o
            if (segment.zPosition < -this.segmentLength) {
                // Remove o segmento antigo do palco gráfico
                engine.scene3D.removeChild(segment.container);
                this.activeSegments.splice(i, 1);

                // Descobre a posição Z do bloco mais distante atual
                let maxZ = -999;
                for (let s of this.activeSegments) {
                    if (s.zPosition > maxZ) maxZ = s.zPosition;
                }

                // Spawna um novo bloco na frente de todos (efeito esteira)
                const newZ = maxZ + this.segmentLength;
                this.spawnSegment(newZ);
            }
        }
    }
};
