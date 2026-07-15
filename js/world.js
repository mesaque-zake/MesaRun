import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { scene, dirLight, hemisphereLight } from './engine.js'; // <-- IMPORTA AS LUZES

export let roadGroup;
let dashedLines = [];
let roadPieces = [];

const ROAD_LENGTH = 360; 

// --- CONTROLE DE VELOCIDADE DINÂMICA (FREIO) ---
export let currentSpeed = 0.5;     // Velocidade que flutua dinamicamente
const NORMAL_SPEED = 0.5;          // Velocidade padrão de cruzeiro
const DECEL_RATE = 0.08;           // Quão rápido o caminhão desacelera ao pisar no freio
const ACCEL_RATE = 0.02;           // Quão rápido ele acelera de volta ao soltar
let isBraking = false;             // Flag que monitora o estado de freio

let tireMarks = [];                // Array para armazenar as marcas de pneu na pista

// --- CONFIGURAÇÃO COMPLETA E HIGIENIZADA DOS BIOMAS (MesaRun!) ---
const BIOME_CONFIG = {
    nature: {
        folder: 'assets/model/biome/nature/',
        // Todos os 50 modelos de árvores que você mapeou
        models: [
            'tree_cone.glb', 'tree_cone_dark.glb', 'tree_cone_fall.glb', 'tree_default.glb',
            'tree_default_dark.glb', 'tree_default_fall.glb', 'tree_detailed.glb',
            'tree_detailed_dark.glb', 'tree_detailed_fall.glb', 'tree_fat.glb', 'tree_fat_darkh.glb',
            'tree_fat_fall.glb', 'tree_oak.glb', 'tree_oak_dark.glb', 'tree_oak_fall.glb', 'tree_palm.glb',
            'tree_palmBend.glb', 'tree_palmDetailedShort.glb', 'tree_palmDetailedTall.glb',
            'tree_palmShort.glb', 'tree_palmTall.glb', 'tree_pineDefaultA.glb', 'tree_pineDefaultB.glb',
            'tree_pineGroundA.glb', 'tree_pineGroundB.glb', 'tree_pineRoundA.glb',
            'tree_pineRoundB.glb', 'tree_pineRoundC.glb', 'tree_pineRoundD.glb', 'tree_pineRoundE.glb',
            'tree_pineRoundF.glb', 'tree_pineSmallA.glb', 'tree_pineSmallB.glb', 'tree_pineSmallC.glb',
            'tree_pineSmallD.glb', 'tree_pineTallA.glb', 'tree_pineTallA_detailed.glb',
            'tree_pineTallB.glb', 'tree_pineTallB_detailed.glb', 'tree_pineTallC.glb',
            'tree_pineTallC_detailed.glb', 'tree_pineTallD.glb', 'tree_pineTallD_detailed.glb',
            'tree_plateau.glb', 'tree_plateau_dark.glb', 'tree_simple_dark.glb', 'tree_simple_fall.glb',
            'tree_tall.glb', 'tree_thin.glb', 'tree_thin_dark.glb'
        ],
        detailFolder: 'assets/model/biome/nature/detail/',
        // Todos os 29 detalhes que você mapeou (incluindo o pote de macumba)
        details: [
            'cactus_tall.glb', 'crops_wheatStageA.glb', 'flower_redA.glb', 'flower_yellowB.glb',
            'grass_large.glb', 'grass_leafsLarge.glb', 'macumba.glb', 'mushroom_redGroup.glb',
            'mushroom_redTall.glb', 'mushroom_tanGroup.glb', 'path_stoneCircle.glb',
            'plant_bushDetailed.glb', 'plant_bushLarge.glb', 'plant_bushLargeTriangle.glb',
            'plant_bushTriangle.glb', 'rock_largeB.glb', 'rock_largeE.glb', 'rock_smallA.glb',
            'rock_smallFlatA.glb', 'rock_smallTopA.glb', 'rock_smallTopB.glb', 'rock_tallA.glb',
            'sign.glb', 'stone_largeA.glb', 'stone_largeD.glb', 'stone_smallF.glb', 'stone_tallA.glb',
            'tree_blocks.glb', 'tree_blocks_fall.glb'
        ]
    },
    suburban: {
        folder: 'assets/model/biome/suburban/',
        // Todos os 18 modelos de casas residenciais que você mapeou
        models: [
            'building-type-a.glb', 'building-type-b.glb', 'building-type-c.glb', 'building-type-d.glb',
            'building-type-e.glb', 'building-type-f.glb', 'building-type-g.glb', 'building-type-h.glb',
            'building-type-i.glb', 'building-type-j.glb', 'building-type-k.glb', 'building-type-m.glb',
            'building-type-n.glb', 'building-type-o.glb', 'building-type-r.glb', 'building-type-s.glb',
            'building-type-t.glb', 'building-type-u.glb'
        ],
        detailFolder: 'assets/model/biome/nature/detail/',
        // REGRA DE HIGIENIZAÇÃO: Apenas tufos de gramas crescerão nas calçadas do subúrbio [2]
        details: [
            'grass_large.glb', 'grass_leafsLarge.glb'
        ]
    },
    industrial: {
        folder: 'assets/model/biome/industrial/',
        // Todos os 20 modelos de galpões e indústrias que você mapeou
        models: [
            'building-a.glb', 'building-b.glb', 'building-c.glb', 'building-d.glb', 'building-e.glb',
            'building-f.glb', 'building-g.glb', 'building-h.glb', 'building-i.glb', 'building-j.glb',
            'building-k.glb', 'building-l.glb', 'building-m.glb', 'building-n.glb', 'building-o.glb',
            'building-p.glb', 'building-q.glb', 'building-r.glb', 'building-s.glb', 'building-t.glb'
        ],
        detailFolder: null, // Sem pasta de detalhes naturais (Adeus natureza!) [2]
        details: []         // Sem grama ou pedras (Habilita apenas o poste de luz urbano) [2]
    },
    city: {
        folder: 'assets/model/biome/city/',
        // Todos os 17 modelos de prédios comerciais e arranha-céus que você mapeou unidos [2]
        models: [
            'building-a.glb', 'building-c.glb', 'building-e.glb', 'building-f.glb', 'building-g.glb',
            'building-h.glb', 'building-i.glb', 'building-j.glb', 'building-k.glb', 'building-l.glb',
            'building-m.glb', 'building-n.glb', 'skyscraper-a.glb', 'skyscraper-b.glb', 'skyscraper-c.glb',
            'skyscraper-d.glb', 'skyscraper-e.glb'
        ],
        detailFolder: null, // Sem pasta de detalhes naturais [2]
        details: []         // Sem vegetação (Habilita apenas o poste de luz urbano) [2]
    }
};
export let streetlightTemplate = null;
export let activeBiome = 'nature';    // Bioma atualmente ativo na pista
export let groundPlane;                // Chão infinito que "pinta" o fundo [1]
let biomeTemplates = {                 // Guarda os templates carregados por bioma [1]
    nature: { models: [], details: [] },
    suburban: { models: [], details: [] },
    industrial: { models: [], details: [] },
    city: { models: [], details: [] }
};

// Altera o bioma, pinta o chão e ajusta a iluminação e clima dinamicamente [2]
export function setActiveBiome(biomeName) {
    activeBiome = biomeName;
    
    // 1. PINTA O CHÃO INFINITO DE ACORDO COM A FASE [1, 2]
    if (groundPlane && groundPlane.material) {
        let groundColor = 0x557a2b; // Verde Grama (Floresta)
        if (biomeName === 'suburban') groundColor = 0x8a7d6e; // Cinza-Terra
        if (biomeName === 'industrial') groundColor = 0xa0a0a0; // CINZA CIMENTO CLARO (MUDADO!)
        if (biomeName === 'city') groundColor = 0xa0a0a0; // CINZA CIMENTO CLARO (MUDADO!)
        
        groundPlane.material.color.setHex(groundColor);
    }

    // 2. AJUSTE DE CLIMA E ILUMINAÇÃO DINÂMICA NAS LUZES [2]
    if (dirLight && hemisphereLight) {
        if (biomeName === 'nature') {
            // Floresta: Luz solar amarelada quente e forte [2]
            dirLight.color.setHex(0xfcecca);
            dirLight.intensity = 1.15;
            hemisphereLight.intensity = 0.5;
            scene.fog = null; // Sem neblina
        } 
        else if (biomeName === 'suburban') {
            // Subúrbio: Luz neutra, branca e clara do dia [2]
            dirLight.color.setHex(0xfcfbe3);
            dirLight.intensity = 1.0;
            hemisphereLight.intensity = 0.45;
            scene.fog = null; // Sem neblina
        } 
        else if (biomeName === 'industrial') {
            // Indústria: "O céu fechou" moderadamente (luz um pouco mais fria e nublada) [2]
            dirLight.color.setHex(0xe1ecf0);
            dirLight.intensity = 0.70; // Brilho de segurança excelente para visibilidade!
            hemisphereLight.intensity = 0.40;
            scene.fog = null; // Sem neblina
        } 
        else if (biomeName === 'city') {
            // Centro Urbano: Entardecer limpo, elegante e muito luminoso (sem névoa escura) [2]
            dirLight.color.setHex(0xfcd2dc);
            dirLight.intensity = 0.85;
            hemisphereLight.intensity = 0.45;
            scene.fog = null; // Sem neblina cinza cobrindo a rua
        }
    }
}


// Função para o main.js ativar/desativar o estado do freio
export function setBrakingState(state) {
    isBraking = state;
}

// === PAINEL DE CONTROLE DA RUA ===
// Diminuímos a largura de 7.5 para 4.5 para uma proporção perfeita de 3 faixas
const LARGURA = 4.5; 
const ALTURA = 3.5;  
const PIECE_LENGTH = 4.5; // Z acompanha a largura para as peças não se sobreporem
const NUM_PIECES = 85; // Aumentamos a quantidade porque as peças ficaram mais curtas
const ROAD_HEIGHT = 2.4; 

export function createWorld(scene) {
    roadGroup = new THREE.Group();
    scene.add(roadGroup);

    const loader = new GLTFLoader();
    
    // --- CARREGAMENTO ASSÍNCRONO DOS ASSETS DE BIOMAS [1] ---
    Object.keys(BIOME_CONFIG).forEach((bKey) => {
        const conf = BIOME_CONFIG[bKey];
        
        // Carrega modelos principais (árvores ou prédios)
        conf.models.forEach((file) => {
            loader.load(conf.folder + file, (gltf) => {
                const model = gltf.scene;
                // Floresta usa tamanho 3.2, subúrbio e indústrias usam prédios maiores (escala 6.5) [1]
                normalizeScenery(model, bKey === 'nature' ? 3.2 : 6.5);
                biomeTemplates[bKey].models.push(model);
            });
        });

        // Carrega modelos de detalhes (vegetações, flores e o pote de barro)
        conf.details.forEach((file) => {
            loader.load(conf.detailFolder + file, (gltf) => {
                const detail = gltf.scene;
                
                // CORREÇÃO CRUCIAL: Salva o nome do arquivo limpo (ex: 'macumba') para podermos identificá-lo [1]
                detail.name = file.replace('.glb', ''); 
                
                normalizeScenery(detail, 1.2);
                biomeTemplates[bKey].details.push(detail);
            });
        });

        // --- CRIAÇÃO DO CHÃO INFINITO (Pinta o fundo sob a rua) [1] ---
        const groundGeo = new THREE.PlaneGeometry(1000, 1000);
        const groundMat = new THREE.MeshLambertMaterial({ color: 0x557a2b }); // Inicia com o verde da grama
        groundPlane = new THREE.Mesh(groundGeo, groundMat);
        groundPlane.rotation.x = -Math.PI / 2;
    
        // Posiciona em Y: 2.38 (ligeiramente abaixo do asfalto que está em 2.4 para não piscar)
        groundPlane.position.set(0, 2, 0); 
        groundPlane.receiveShadow = true;
        scene.add(groundPlane);
        
        // --- CARREGAMENTO DO POSTE DE LUZ URBANO [1, 2] ---
       const sLoader = new GLTFLoader();
       sLoader.load(
           'assets/sprite/road/light-square.glb',
           (gltf) => {
               const streetlight = gltf.scene;
               // Normaliza a altura do poste em 5.0 unidades (tamanho padrão de iluminação pública) [1, 2]
               normalizeScenery(streetlight, 5.0);
               streetlightTemplate = streetlight;
               console.log("Template do Poste de Luz carregado com sucesso!");
           },
           undefined,
           (error) => {
               console.error("Erro ao carregar o poste de luz:", error);
           }
       );
    });

    loader.load(
        'assets/sprite/road/road-side.gltf', 
        function (gltf) {
            const baseModel = gltf.scene;
            baseModel.scale.set(LARGURA, ALTURA, LARGURA);

            const box = new THREE.Box3().setFromObject(baseModel);
            const bordaDoAsfalto = box.max.x; 

            const posicaoDaLinha = 3.5; 
            const lineXPositions = [-posicaoDaLinha, posicaoDaLinha]; 

            const lineGeometry = new THREE.PlaneGeometry(0.3, 3);
            const lineMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x999999,
                transparent: true,
                opacity: 0.5
            });

            for (let x of lineXPositions) {
                for (let z = -ROAD_LENGTH / 2; z < ROAD_LENGTH / 2; z += 6) {
                    const line = new THREE.Mesh(lineGeometry, lineMaterial);
                    line.rotation.x = -Math.PI / 2;
                    line.position.set(x, ROAD_HEIGHT, z); 
                    roadGroup.add(line);
                    dashedLines.push(line);
                }
            }

            for (let i = 0; i < NUM_PIECES; i++) {
                const zPos = (i * PIECE_LENGTH) - (ROAD_LENGTH / 2);

                const leftSide = baseModel.clone();
                leftSide.position.set(-bordaDoAsfalto, 0, zPos);

                const rightSide = baseModel.clone();
                rightSide.scale.set(-LARGURA, ALTURA, LARGURA); 
                rightSide.position.set(bordaDoAsfalto, 0, zPos);

                roadGroup.add(leftSide);
                roadGroup.add(rightSide);

                const pieceObj = { left: leftSide, right: rightSide };
                
                // --- DECORA AS CALÇADAS INICIAIS DA PARTIDA ---
                // Aguardamos 1 segundo para garantir que as árvores já carregaram na memória
                setTimeout(() => {
                    decoratePiece(pieceObj, activeBiome);
                }, 1000);

                roadPieces.push(pieceObj);
            }
        }, 
        undefined, 
        function (error) {
            console.error("Erro ao carregar a rua:", error);
        }
    );
}

export function updateWorld() {
    if (!roadGroup) return;

    // 1. Interpolação de velocidade baseada no freio
    if (isBraking) {
        // Desacelera até quase parar (0.01 de velocidade residual para manter a física em movimento)
        currentSpeed += (0.01 - currentSpeed) * DECEL_RATE;
    } else {
        // Acelera suavemente de volta ao normal
        currentSpeed += (NORMAL_SPEED - currentSpeed) * ACCEL_RATE;
    }

    // Move as linhas pontilhadas usando a currentSpeed
    dashedLines.forEach(line => {
        line.position.z -= currentSpeed; 
        if (line.position.z < -ROAD_LENGTH / 2) {
            line.position.z += ROAD_LENGTH;
        }
    });

    // Move a rua na direção negativa (vindo para trás)
    roadPieces.forEach((piece, i) => { // <-- ADICIONADO "i" AQUI! [1]
        piece.left.position.z -= currentSpeed;
        piece.right.position.z -= currentSpeed;

        // Se a calçada passou da câmera, teletransporta lá para o fundo do horizonte
        if (piece.left.position.z < -ROAD_LENGTH / 2) {
            piece.left.position.z += (NUM_PIECES * PIECE_LENGTH);
            piece.right.position.z += (NUM_PIECES * PIECE_LENGTH);

            // Redecora passando o índice para controle de espaçamento [1, 2]
            decoratePiece(piece, activeBiome, i); // <-- ADICIONADO "i" NO PARÂMETRO!
        }
    });

    // Move e limpa as marcas de pneu
    updateTireMarks();
}

// Normaliza o tamanho dos elementos de cenário e ativa as sombras [1]
function normalizeScenery(model, targetSize) {
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const scaleFactor = (maxDim > 0.01) ? (targetSize / maxDim) : 1;
    model.scale.set(scaleFactor, scaleFactor, scaleFactor);
    
    model.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
}

// Limpa e re-decora as calçadas e a paisagem lateral de forma inteligente [2]
function decoratePiece(piece, biomeName, pieceIndex) {
    if (piece.leftDecor) piece.left.remove(piece.leftDecor);
    if (piece.rightDecor) piece.right.remove(piece.rightDecor);
    if (piece.leftDetail) piece.left.remove(piece.leftDetail);
    if (piece.rightDetail) piece.right.remove(piece.rightDetail);

    const templates = biomeTemplates[biomeName];
    if (!templates || templates.models.length === 0) return;

    // --- CONTROLE DE ESPAÇAMENTO LONGITUDINAL (EVITA SOBREPOSIÇÃO DE CONSTRUÇÕES) [1] ---
    let shouldSpawnDecor = true;
    if (biomeName !== 'nature') {
        // Casas do subúrbio nascem a cada 5 peças. Galpões e arranha-céus gigantes nascem a cada 7 peças! [1, 2]
        const spacingModulo = (biomeName === 'suburban') ? 5 : 7;
        shouldSpawnDecor = (pieceIndex % spacingModulo === 0);
    }

    // --- CÁLCULO DE AFASTAMENTO E ESPALHAMENTO DOS BIOMAS ---
    let xOffsetLeft = -2.3;
    let xOffsetRight = -2.3; // Compensa escala negativa da calçada direita
    let zOffsetLeft = 0;
    let zOffsetRight = 0;

    if (biomeName === 'nature') {
        // Floresta: Espalha de forma orgânica
        xOffsetLeft = -2.1 - Math.random() * 1;
        xOffsetRight = -2.1 - Math.random() * 1;
        zOffsetLeft = (Math.random() - 0.5) * 4.0;
        zOffsetRight = (Math.random() - 0.5) * 4.0;
    } else {
        // Biomas urbanos: Pushed significativamente para trás (de -3.6 para -5.0!) [2]
        // Isso joga as construções gigantes profundamente para a margem, limpando 100% a visão da pista
        xOffsetLeft = -5.0;
        xOffsetRight = -5.0;
    }

    // --- PAISAGEM LATERAL (Árvores e Prédios) ---
    if (shouldSpawnDecor) {
        const leftModelTemp = templates.models[Math.floor(Math.random() * templates.models.length)];
        piece.leftDecor = leftModelTemp.clone();
        piece.leftDecor.position.set(xOffsetLeft, 0, zOffsetLeft);
        piece.left.add(piece.leftDecor);

        const rightModelTemp = templates.models[Math.floor(Math.random() * templates.models.length)];
        piece.rightDecor = rightModelTemp.clone();
        piece.rightDecor.position.set(xOffsetRight, 0, zOffsetRight);
        piece.right.add(piece.rightDecor);
    }

    // --- DETALHES DA CALÇADA (Flores, Gramas e Potes de Barro - Macumba) ---
    if (templates.details.length > 0) {
        
        // --- DETALHES DA CALÇADA (Flores, Gramas, Macumba ou POSTES DE LUZ) [2] ---
        // Sorteamos a presença do poste de luz nos biomas urbanos a cada 4 calçadas (intervalo de 18m) [1, 2]
        const isUrban = (biomeName !== 'nature');
        const shouldSpawnStreetlight = isUrban && streetlightTemplate && (pieceIndex % 18 === 0);

        if (shouldSpawnStreetlight) {
            // Calçada Esquerda: Posiciona e rotaciona -90° para o braço apontar para a pista [2]
            piece.leftDetail = streetlightTemplate.clone();
            piece.leftDetail.position.set(-0.6, 0.4, 0);
            piece.leftDetail.rotation.y = Math.PI / 2; // Gira o braço para a direita (asfalto) [2]
            piece.left.add(piece.leftDetail);

            // Calçada Direita: Posiciona e rotaciona +90° para compensar o espelhamento e apontar para a pista [2]
            piece.rightDetail = streetlightTemplate.clone();
            piece.rightDetail.position.set(-0.6, 0.4, 0);
            piece.rightDetail.rotation.y = -Math.PI / 2; // Gira o braço para a esquerda (asfalto) [2]
            piece.right.add(piece.rightDetail);
        }
        else if (templates.details.length > 0) {
            // Se não for peça de poste (ou se for floresta), gera os detalhes comuns (flores, gramas ou macumba) [2]
        
            // --- CALÇADA ESQUERDA ---
            const hasMacumbaLeft = biomeName === 'nature' && Math.random() < 0.05 && templates.details.some(d => d.name === 'macumba');
        
            if (hasMacumbaLeft) {
                const macumbaTemp = templates.details.find(d => d.name === 'macumba');
                const group = new THREE.Group();
                group.position.set(-0.6, 0.4, 0);

                for (let j = 0; j < 3; j++) {
                const pot = macumbaTemp.clone();
                pot.scale.set(0.65, 0.65, 0.65);
                
                const offsetX = (j === 0) ? 0 : (j === 1 ? 0.25 : -0.25);
                const offsetZ = (j === 0) ? -0.2 : (j === 1 ? 0.15 : 0.15);
                pot.position.set(offsetX, 0, offsetZ);
                
                group.add(pot);
            }
            piece.leftDetail = group;
            piece.left.add(piece.leftDetail);
            } else {
                const allowedDetails = templates.details.filter(d => d.name !== 'macumba');
                if (allowedDetails.length > 0) {
                    const leftDetailTemp = allowedDetails[Math.floor(Math.random() * allowedDetails.length)];
                    piece.leftDetail = leftDetailTemp.clone();
                    piece.leftDetail.position.set(-0.6, 0.4, 0);
                    piece.left.add(piece.leftDetail);
                }
            }
        }

        // --- CALÇADA DIREITA ---
        const hasMacumbaRight = biomeName === 'nature' && Math.random() < 0.05 && templates.details.some(d => d.name === 'macumba');

        if (hasMacumbaRight) {
            const macumbaTemp = templates.details.find(d => d.name === 'macumba');
            const group = new THREE.Group();
            group.position.set(-0.6, 0.4, 0);

            for (let j = 0; j < 3; j++) {
                const pot = macumbaTemp.clone();
                pot.scale.set(0.65, 0.65, 0.65);
                
                const offsetX = (j === 0) ? 0 : (j === 1 ? 0.25 : -0.25);
                const offsetZ = (j === 0) ? -0.2 : (j === 1 ? 0.15 : 0.15);
                pot.position.set(offsetX, 0, offsetZ);
                
                group.add(pot);
            }
            piece.rightDetail = group;
            piece.right.add(piece.rightDetail);
        } else {
            const allowedDetails = templates.details.filter(d => d.name !== 'macumba');
            if (allowedDetails.length > 0) {
                const rightDetailTemp = allowedDetails[Math.floor(Math.random() * allowedDetails.length)];
                piece.rightDetail = rightDetailTemp.clone();
                piece.rightDetail.position.set(-0.6, 0.4, 0);
                piece.right.add(piece.rightDetail);
            }
        }
    }
}

// Reseta as posições Z da pista de forma limpa e re-decora tudo com a Floresta (nature) [1]
export function resetWorldScenery() {
    if (!roadGroup) return;

    activeBiome = 'nature'; // Força o bioma de volta para a Floresta

    // 1. Reseta as posições iniciais de grid das linhas pontilhadas [1]
    let lineIndex = 0;
    const posicaoDaLinha = 3.5; 
    const lineXPositions = [-posicaoDaLinha, posicaoDaLinha]; 
    
    for (let x of lineXPositions) {
        for (let z = -ROAD_LENGTH / 2; z < ROAD_LENGTH / 2; z += 6) {
            if (dashedLines[lineIndex]) {
                dashedLines[lineIndex].position.set(x, ROAD_HEIGHT, z);
            }
            lineIndex++;
        }
    }

    // 2. Reseta as calçadas para as posições iniciais de grid e as re-decora com árvores [1, 2]
    roadPieces.forEach((piece, i) => {
        const zPos = (i * PIECE_LENGTH) - (ROAD_LENGTH / 2);
        piece.left.position.z = zPos;
        piece.right.position.z = zPos;

        // Força a re-decoração imediata de todas as calçadas com a Floresta inicial [1, 2]
        decoratePiece(piece, 'nature', i);
    });
}

// Cria uma marca de pneu procedural na posição X fornecida
export function addTireMark(x) {
    if (!roadGroup) return;

    // Criamos um plano escuro, fino e translúcido para simular a borracha queimada
    const geometry = new THREE.PlaneGeometry(0.3, 1.2); 
    const material = new THREE.MeshBasicMaterial({
        color: 0x111111,
        transparent: true,
        opacity: 0.25,
        depthWrite: false // Evita problemas de renderização e sobreposição (z-fighting)
    });
    
    const mark = new THREE.Mesh(geometry, material);
    mark.rotation.x = -Math.PI / 2; // Deita o plano no chão
    
    // Posiciona logo atrás da roda traseira. A rua está em Y: 2.4, colocamos em 2.41 para não piscar
    mark.position.set(x, 2.41, 0); 
    
    roadGroup.add(mark);
    tireMarks.push(mark);
}

// Atualiza a posição dos rastros acompanhando o movimento da rua e os limpa da memória
function updateTireMarks() {
    for (let i = tireMarks.length - 1; i >= 0; i--) {
        const mark = tireMarks[i];
        mark.position.z -= currentSpeed;

        // Se o rastro passou da tela, destrói e libera memória
        if (mark.position.z < -ROAD_LENGTH / 2) {
            roadGroup.remove(mark);
            mark.geometry.dispose();
            mark.material.dispose();
            tireMarks.splice(i, 1);
        }
    }
}
