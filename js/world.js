import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { scene, dirLight, hemisphereLight, currentPresetIndex, getSpawnZ } from './engine.js';

let roadGroup; 
let dashedLines = []; 
let roadPieces = [];

const ROAD_LENGTH = 360;

// --- CONTROLE DE VELOCIDADE DINÂMICA ---
export let currentSpeed = 0.5;
const DECEL_RATE = 0.08;
const ACCEL_RATE = 0.02;
let isBraking = false;

let tireMarks = [];
// Otimização: Geometria e Material únicos criados na memória uma só vez
const sharedTireGeo = new THREE.PlaneGeometry(0.3, 1.2);
const sharedTireMat = new THREE.MeshBasicMaterial({
    color: 0x111111,
    transparent: true,
    opacity: 0.23,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
});
// Armazena grupos especiais como o triângulo de macumbas
let activeSpecialScenery = [];

// --- CONFIGURAÇÃO COMPLETA DOS BIOMAS ---
const BIOME_CONFIG = {
    nature: {
        folder: 'assets/model/biome/nature/',
        models: [
            'tree_cone.glb', 'tree_cone_dark.glb', 'tree_cone_fall.glb', 'tree_default.glb',
            'tree_default_dark.glb', 'tree_default_fall.glb', 'tree_detailed.glb',
            'tree_detailed_dark.glb', 'tree_detailed_fall.glb', 'tree_fat.glb',
            'tree_fat_darkh.glb', 'tree_fat_fall.glb', 'tree_oak.glb', 'tree_oak_dark.glb',
            'tree_oak_fall.glb', 'tree_palm.glb', 'tree_palmBend.glb',
            'tree_palmDetailedShort.glb', 'tree_palmDetailedTall.glb', 'tree_palmShort.glb',
            'tree_palmTall.glb', 'tree_pineDefaultA.glb', 'tree_pineDefaultB.glb',
            'tree_pineGroundA.glb', 'tree_pineGroundB.glb', 'tree_pineRoundA.glb',
            'tree_pineRoundB.glb', 'tree_pineRoundC.glb', 'tree_pineRoundD.glb',
            'tree_pineRoundE.glb', 'tree_pineRoundF.glb', 'tree_pineSmallA.glb',
            'tree_pineSmallB.glb', 'tree_pineSmallC.glb', 'tree_pineSmallD.glb',
            'tree_pineTallA.glb', 'tree_pineTallA_detailed.glb', 'tree_pineTallB.glb',
            'tree_pineTallB_detailed.glb', 'tree_pineTallC.glb',
            'tree_pineTallC_detailed.glb', 'tree_pineTallD.glb',
            'tree_pineTallD_detailed.glb', 'tree_plateau.glb', 'tree_plateau_dark.glb',
            'tree_simple_dark.glb', 'tree_simple_fall.glb', 'tree_tall.glb',
            'tree_thin.glb', 'tree_thin_dark.glb'
        ],
        detailFolder: 'assets/model/biome/nature/detail/',
        details: [
            'cactus_tall.glb', 'crops_wheatStageA.glb', 'flower_redA.glb', 'flower_yellowB.glb',
            'grass_large.glb', 'grass_leafsLarge.glb', 'macumba.glb',
            'mushroom_redGroup.glb', 'mushroom_redTall.glb', 'mushroom_tanGroup.glb',
            'path_stoneCircle.glb', 'plant_bushDetailed.glb', 'plant_bushLarge.glb',
            'plant_bushLargeTriangle.glb', 'plant_bushTriangle.glb', 'rock_largeB.glb',
            'rock_largeE.glb', 'rock_smallA.glb', 'rock_smallFlatA.glb',
            'rock_smallTopA.glb', 'rock_smallTopB.glb', 'rock_tallA.glb', 'sign.glb',
            'stone_largeA.glb', 'stone_largeD.glb', 'stone_smallF.glb', 'stone_tallA.glb',
            'tree_blocks.glb', 'tree_blocks_fall.glb'
        ]
    },
    suburban: {
        folder: 'assets/model/biome/suburban/',
        models: [
            'building-type-a.glb', 'building-type-b.glb', 'building-type-c.glb', 'building-type-d.glb',
            'building-type-e.glb', 'building-type-f.glb', 'building-type-g.glb', 'building-type-h.glb',
            'building-type-i.glb', 'building-type-j.glb', 'building-type-k.glb', 'building-type-m.glb',
            'building-type-n.glb', 'building-type-o.glb', 'building-type-r.glb', 'building-type-s.glb',
            'building-type-t.glb', 'building-type-u.glb'
        ],
        detailFolder: 'assets/model/biome/nature/detail/',
        details: [
            'grass_large.glb', 'grass_leafsLarge.glb'
        ]
    },
    industrial: {
        folder: 'assets/model/biome/industrial/',
        models: [
            'building-a.glb', 'building-b.glb', 'building-c.glb', 'building-d.glb', 'building-e.glb',
            'building-f.glb', 'building-g.glb', 'building-h.glb', 'building-i.glb', 'building-j.glb',
            'building-k.glb', 'building-l.glb', 'building-m.glb', 'building-n.glb', 'building-o.glb',
            'building-p.glb', 'building-q.glb', 'building-r.glb', 'building-s.glb', 'building-t.glb'
        ],
        detailFolder: null,
        details: []
    },
    city: {
        folder: 'assets/model/biome/city/',
        models: [
            'building-a.glb', 'building-c.glb', 'building-e.glb', 'building-f.glb', 'building-g.glb',
            'building-h.glb', 'building-i.glb', 'building-j.glb', 'building-k.glb', 'building-l.glb',
            'building-m.glb', 'building-n.glb', 'skyscraper-a.glb', 'skyscraper-b.glb', 'skyscraper-c.glb',
            'skyscraper-d.glb', 'skyscraper-e.glb'
        ],
        detailFolder: null,
        details: []
    }
};

let streetlightTemplate = null; 
let activeBiome = 'nature'; 
let groundPlane;

let storedBordaDoAsfalto = 9.5; // Valor de fallback seguro

// Lote 3: Estado Atual e Estado Alvo para o Fade Suave da Iluminação
const currentLightState = {
    dirColor: new THREE.Color(0xfff1b5), dirIntensity: 1.1,
    hemiColor: new THREE.Color(0xdbe9f4), hemiGround: new THREE.Color(0x6b8f35), hemiIntensity: 0.6,
    fogColor: new THREE.Color(0xa0a8b0), fogDensity: 0
};
const targetLightState = {
    dirColor: new THREE.Color(0xfff1b5), dirIntensity: 1.1,
    hemiColor: new THREE.Color(0xdbe9f4), hemiGround: new THREE.Color(0x6b8f35), hemiIntensity: 0.6,
    fogColor: new THREE.Color(0xa0a8b0), fogDensity: 0
};

// Foto do estado de luz no instante em que o bioma troca (ponto de partida da transição)
const startLightState = {
    dirColor: new THREE.Color(0xfff1b5), dirIntensity: 1.1,
    hemiColor: new THREE.Color(0xdbe9f4), hemiGround: new THREE.Color(0x6b8f35), hemiIntensity: 0.6,
    fogColor: new THREE.Color(0xa0a8b0), fogDensity: 0
};

// Duração da transição de luz entre biomas (em milissegundos) e relógio dela
const LIGHT_TRANSITION_MS = 10000;
let lightTransitionStartTime = 0;

// Guarda o estado atual como ponto de partida e reinicia o relógio da transição
function beginLightTransition() {
    startLightState.dirColor.copy(currentLightState.dirColor);
    startLightState.hemiColor.copy(currentLightState.hemiColor);
    startLightState.hemiGround.copy(currentLightState.hemiGround);
    startLightState.fogColor.copy(currentLightState.fogColor);
    startLightState.dirIntensity = currentLightState.dirIntensity;
    startLightState.hemiIntensity = currentLightState.hemiIntensity;
    startLightState.fogDensity = currentLightState.fogDensity;
    lightTransitionStartTime = performance.now();
}

let biomeTemplates = {
    nature: { models: [], details: [] },
    suburban: { models: [], details: [] },
    industrial: { models: [], details: [] },
    city: { models: [], details: [] }
};

// Altera o bioma, pinta o chão, névoa e ajusta a iluminação dinamicamente
export function setActiveBiome(biomeName) {
    beginLightTransition();
    activeBiome = biomeName;

    if (biomeName === 'nature') {
        // 7h-8h: Manhã suave, sol amarelo pastel, chão gramado mais vivo
        targetLightState.dirColor.setHex(0xfff1b5);
        targetLightState.dirIntensity = 1.1;
        targetLightState.hemiColor.setHex(0xdbe9f4);
        targetLightState.hemiGround.setHex(0x6b8f35);
        targetLightState.hemiIntensity = 0.6;
        targetLightState.fogDensity = 0;
    }
    else if (biomeName === 'suburban') {
        // 12h: Sol do meio-dia, amarelo forte e alegre, grama seca e iluminada
        targetLightState.dirColor.setHex(0xfce292);
        targetLightState.dirIntensity = 1.3;
        targetLightState.hemiColor.setHex(0xc4e0f2);
        targetLightState.hemiGround.setHex(0x7d9440);
        targetLightState.hemiIntensity = 0.65;
        targetLightState.fogDensity = 0;
    } 
    else if (biomeName === 'industrial') {
        // Dia nublado: sol fraco e frio, muita luz de ambiente, névoa fina de leve poluição
        targetLightState.dirColor.setHex(0xdcf2f7);
        targetLightState.dirIntensity = 0.65;
        targetLightState.hemiColor.setHex(0xb4bcc0);
        targetLightState.hemiGround.setHex(0x7a7e80);
        targetLightState.hemiIntensity = 1.0;
        targetLightState.fogColor.setHex(0xb2b6b4);
        targetLightState.fogDensity = 0.003;
    } 
    else if (biomeName === 'city') {
        // Golden hour: sol dourado de fim de tarde, sombras com ambiente malva suave, bruma quente
        targetLightState.dirColor.setHex(0xffd987);
        targetLightState.dirIntensity = 1.3;
        targetLightState.hemiColor.setHex(0xb89aa8);
        targetLightState.hemiGround.setHex(0x6f6a55);
        targetLightState.hemiIntensity = 0.6;
        targetLightState.fogColor.setHex(0xe0b48a);
        targetLightState.fogDensity = 0.0015;
    }
}

// Função para o main.js ativar/desativar o estado do freio
export function setBrakingState(state) { 
    isBraking = state; 
}

// === PAINEL DE CONTROLE DA RUA ===
const LARGURA = 4.5; 
const ALTURA = 3.5;
const PIECE_LENGTH = 4.5; 
const NUM_PIECES = 105; // era 85: a pista precisa chegar além da borda de cima em telas estreitas (múltiplo de 5 e de 7, que são os ritmos dos prédios)
const ROAD_HEIGHT = 2.4;

export function createWorld(scene) { 
    roadGroup = new THREE.Group();
    scene.add(roadGroup);

    const loader = new GLTFLoader();

    // --- CARREGAMENTO ASSÍNCRONO DOS ASSETS ---
    Object.keys(BIOME_CONFIG).forEach((bKey) => {
        const conf = BIOME_CONFIG[bKey];
        
        conf.models.forEach((file) => {
            loader.load(conf.folder + file, (gltf) => {
                const model = gltf.scene;
                normalizeScenery(model, bKey === 'nature' ? 2.8 : 6.5);
                biomeTemplates[bKey].models.push(model);
            });
        });

        conf.details.forEach((file) => {
            loader.load(conf.detailFolder + file, (gltf) => {
                const detail = gltf.scene;
                detail.name = file.replace('.glb', ''); 
                normalizeScenery(detail, 1.2);
                biomeTemplates[bKey].details.push(detail);
            });
        });
    });

    // --- CRIAÇÃO DO CHÃO INFINITO (SÓ UMA VEZ FORA DO LOOP!) ---
    const groundGeo = new THREE.PlaneGeometry(1000, 1000);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x557a2b }); 
    groundPlane = new THREE.Mesh(groundGeo, groundMat);
    groundPlane.rotation.x = -Math.PI / 2;

    groundPlane.position.set(0, 2, 0); 
    groundPlane.receiveShadow = true;
    scene.add(groundPlane);
    
    // --- CARREGAMENTO DO POSTE DE LUZ URBANO (SÓ UMA VEZ FORA DO LOOP!) ---
    loader.load(
        'assets/sprite/road/light-square.glb',
        (gltf) => {
            const streetlight = gltf.scene;
            normalizeScenery(streetlight, 3.2);
            streetlightTemplate = streetlight;
        },
        undefined,
        (error) => {
            console.error("Erro ao carregar o poste de luz:", error);
        }
    );

    // --- CARREGAMENTO DA RUA ---
    loader.load(
        'assets/sprite/road/road-side.gltf', 
        function (gltf) {
            const baseModel = gltf.scene;
            baseModel.scale.set(LARGURA, ALTURA, LARGURA);

            // Faz a rua (asfalto e calçada) receber sombra. Os clones herdam a flag.
            baseModel.traverse((child) => {
                if (child.isMesh) {
                    child.receiveShadow = true;
                }
            });

            const box = new THREE.Box3().setFromObject(baseModel);
            const bordaDoAsfalto = box.max.x; 
            storedBordaDoAsfalto = bordaDoAsfalto; // Salva globalmente para o alinhamento da Macumba

            const posicaoDaLinha = 3.5; 
            const lineXPositions = [-posicaoDaLinha, posicaoDaLinha]; 

            const lineGeometry = new THREE.PlaneGeometry(0.3, 3);
            const lineMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x999999,
                transparent: true,
                opacity: 0.5
            });

            // Otimização: InstancedMesh para as linhas (1 Draw Call em vez de 120)
            const lineSpan = NUM_PIECES * PIECE_LENGTH; // mesma extensão das peças da rua
            const linesPerLane = Math.ceil(lineSpan / 6);
            const totalLines = lineXPositions.length * linesPerLane;
            const instancedLines = new THREE.InstancedMesh(lineGeometry, lineMaterial, totalLines);
            instancedLines.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
            
            const dummy = new THREE.Object3D();
            let lineIdx = 0;
            for (let x of lineXPositions) {
                for (let z = -ROAD_LENGTH / 2; z < -ROAD_LENGTH / 2 + lineSpan; z += 6) {
                    dummy.position.set(x, ROAD_HEIGHT, z);
                    dummy.rotation.x = -Math.PI / 2;
                    dummy.updateMatrix();
                    instancedLines.setMatrixAt(lineIdx++, dummy.matrix);
                }
            }
            roadGroup.add(instancedLines);
            // Salva no array como único item para o loop movimentar a esteira inteira
            dashedLines.push(instancedLines);

            for (let i = 0; i < NUM_PIECES; i++) {
                const zPos = (i * PIECE_LENGTH) - (ROAD_LENGTH / 2);

                const leftSide = baseModel.clone();
                leftSide.position.set(-bordaDoAsfalto, 0, zPos);

                const rightSide = baseModel.clone();
                rightSide.scale.set(-LARGURA, ALTURA, LARGURA); 
                rightSide.position.set(bordaDoAsfalto, 0, zPos);

                roadGroup.add(leftSide);
                roadGroup.add(rightSide);

                const pieceObj = { 
                    left: leftSide, 
                    right: rightSide,
                    leftDecorations: [], // Arrays de controle para a floresta caótica
                    rightDecorations: []
                };
                
                decoratePiece(pieceObj, activeBiome, i);
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

    // --- SISTEMA DE FADE SUAVE DA ILUMINAÇÃO ---
    if (dirLight && hemisphereLight && scene.fog) {
        // Progresso da transição (0 a 1) calculado pelo tempo real, igual em qualquer tela
        const rawProgress = Math.min((performance.now() - lightTransitionStartTime) / LIGHT_TRANSITION_MS, 1);
        // Curva suave nas duas pontas: começa devagar, acelera no meio e assenta devagar
        const eased = rawProgress * rawProgress * (3 - 2 * rawProgress);

        // Cores: da foto inicial até o alvo
        currentLightState.dirColor.lerpColors(startLightState.dirColor, targetLightState.dirColor, eased);
        currentLightState.hemiColor.lerpColors(startLightState.hemiColor, targetLightState.hemiColor, eased);
        currentLightState.hemiGround.lerpColors(startLightState.hemiGround, targetLightState.hemiGround, eased);
        currentLightState.fogColor.lerpColors(startLightState.fogColor, targetLightState.fogColor, eased);

        // Intensidades e neblina: da foto inicial até o alvo
        currentLightState.dirIntensity = startLightState.dirIntensity + (targetLightState.dirIntensity - startLightState.dirIntensity) * eased;
        currentLightState.hemiIntensity = startLightState.hemiIntensity + (targetLightState.hemiIntensity - startLightState.hemiIntensity) * eased;
        currentLightState.fogDensity = startLightState.fogDensity + (targetLightState.fogDensity - startLightState.fogDensity) * eased;

        // Aplica o resultado em tempo real no Motor do Jogo
        dirLight.color.copy(currentLightState.dirColor);
        dirLight.intensity = currentLightState.dirIntensity;
        
        hemisphereLight.color.copy(currentLightState.hemiColor);
        hemisphereLight.groundColor.copy(currentLightState.hemiGround);
        hemisphereLight.intensity = currentLightState.hemiIntensity;

        scene.fog.color.copy(currentLightState.fogColor);
        // Respiração lenta da névoa (±15%, ciclo de uns 16s). Como é proporcional à densidade,
        // só aparece onde há névoa (Indústria e Cidade) e não mexe nos outros biomas.
        const fogBreath = 1 + 0.15 * Math.sin(performance.now() / 2500);
        scene.fog.density = currentLightState.fogDensity * fogBreath;
        
        // Colore o chão liso base pra acompanhar o horizonte
        if (groundPlane && groundPlane.material) {
            groundPlane.material.color.copy(currentLightState.hemiGround);
        }
    }

    // Decide a velocidade alvo de cruzeiro com base na câmera ativa
    let targetCruiseSpeed = 0.50;
    if (currentPresetIndex === 1) targetCruiseSpeed = 0.65;
    if (currentPresetIndex === 2) targetCruiseSpeed = 0.75;

    // Interpolação de velocidade baseada no freio ou na velocidade alvo da câmera
    if (isBraking) {
        currentSpeed += (0.01 - currentSpeed) * DECEL_RATE;
    } else {
        currentSpeed += (targetCruiseSpeed - currentSpeed) * ACCEL_RATE;
    }

    // Otimização do Treadmill (Esteira) para as linhas Instanciadas
    if (dashedLines.length > 0) {
        const instancedLines = dashedLines[0];
        instancedLines.position.z -= currentSpeed;
        // O espaçamento é 6. Ao andar -6 unidades, recuamos +6 para criar um loop invisível
        if (instancedLines.position.z < -6) {
            instancedLines.position.z += 6;
        }
    }

    roadPieces.forEach((piece, i) => { 
        piece.left.position.z -= currentSpeed;
        piece.right.position.z -= currentSpeed;

        if (piece.left.position.z < -ROAD_LENGTH / 2) {
            piece.left.position.z += (NUM_PIECES * PIECE_LENGTH);
            piece.right.position.z += (NUM_PIECES * PIECE_LENGTH);

            decoratePiece(piece, activeBiome, i); 
        }
    });

    // Atualiza os elementos dinâmicos especiais (como o triângulo de macumbas)
    for (let i = activeSpecialScenery.length - 1; i >= 0; i--) {
        const group = activeSpecialScenery[i];
        group.position.z -= currentSpeed;
        if (group.position.z < -ROAD_LENGTH / 2) {
            scene.remove(group);
            activeSpecialScenery.splice(i, 1);
        }
    }

    updateTireMarks();
}

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

const buildingBox = new THREE.Box3();

// Posiciona o prédio pela caixa dele, e não pela origem do .glb: a borda mais próxima da rua
// fica em xNearEdge e o prédio fica centrado ao longo da pista. A altura (y) não muda.
function placeBuildingByBox(decor, xNearEdge) {
    decor.position.set(0, 0.6, 0);
    buildingBox.setFromObject(decor);
    decor.position.x = xNearEdge - buildingBox.max.x;
    decor.position.z = -(buildingBox.min.z + buildingBox.max.z) / 2;
}

function decoratePiece(piece, biomeName, pieceIndex) { 
    // 1. Limpa todas as decorações antigas existentes para evitar memory leaks
        if (piece.leftDecor) piece.left.remove(piece.leftDecor); 
    if (piece.rightDecor) piece.right.remove(piece.rightDecor); 
    if (piece.leftDetail) piece.left.remove(piece.leftDetail); 
    if (piece.rightDetail) piece.right.remove(piece.rightDetail);
    piece.leftDecor = piece.rightDecor = piece.leftDetail = piece.rightDetail = null;

    if (piece.leftDecorations) {

        piece.leftDecorations.forEach(item => piece.left.remove(item));
    }
    piece.leftDecorations = [];

    if (piece.rightDecorations) {
        piece.rightDecorations.forEach(item => piece.right.remove(item));
    }
    piece.rightDecorations = [];

    const templates = biomeTemplates[biomeName];

    if (!templates || templates.models.length === 0) {
        setTimeout(() => {
            decoratePiece(piece, biomeName, pieceIndex);
        }, 300);
        return;
    }

    const isStraightView = (currentPresetIndex === 1 || currentPresetIndex === 2);

    // --- COMPORTAMENTO PROCEDURAL EXCLUSIVO PARA BIOMA NATURE (PONTO 5) ---
    if (biomeName === 'nature') {
        // Unifica árvores e decorações rasteiras num único pool, excluindo a macumba (que virou evento fixo de 15s)
        const naturePool = [...templates.models, ...templates.details.filter(d => d.name !== 'macumba')];

        if (naturePool.length > 0) {
            // Sorteia de 1 a 3 itens para cada lado da calçada
            const leftCount = Math.floor(Math.random() * 3) + 1;
            const rightCount = Math.floor(Math.random() * 3) + 1;

            // Dispersão Caótica - Lado Esquerdo
            for (let k = 0; k < leftCount; k++) {
                const temp = naturePool[Math.floor(Math.random() * naturePool.length)];
                const clone = temp.clone();

                // Posição irregular: localX varia de -3.5 (terra/grama) até 0.1 (podendo invadir levemente o concreto)
                const localX = -3.5 + Math.random() * 3.6;
                const localZ = (Math.random() - 0.5) * 4.0;

                // Variação orgânica de tamanho (0.8x a 1.25x) e rotação livre (360 graus)
                const randScale = 0.75 + Math.random() * 0.35;
                clone.scale.multiplyScalar(randScale);
                clone.rotation.y = Math.random() * Math.PI * 2;

                clone.position.set(localX, 0.4, localZ);
                piece.left.add(clone);
                piece.leftDecorations.push(clone);
            }

            // Dispersão Caótica - Lado Direito
            for (let k = 0; k < rightCount; k++) {
                const temp = naturePool[Math.floor(Math.random() * naturePool.length)];
                const clone = temp.clone();

                const localX = -3.5 + Math.random() * 3.6;
                const localZ = (Math.random() - 0.5) * 4.0;

                const randScale = 0.8 + Math.random() * 0.45;
                clone.scale.multiplyScalar(randScale);
                clone.rotation.y = Math.random() * Math.PI * 2;

                clone.position.set(localX, 0.4, localZ);
                piece.right.add(clone);
                piece.rightDecorations.push(clone);
            }
        }
    } 
    // --- COMPORTAMENTO PADRÃO DOS BIOMAS URBANOS (SUBURBAN, INDUSTRIAL, CITY) ---
    else {
        let shouldSpawnDecor = true;
        const spacingModulo = (biomeName === 'suburban') ? 5 : 7;
        shouldSpawnDecor = (pieceIndex % spacingModulo === 0);

        // Cidade e Indústria: a margem é a distância da borda do prédio até a calçada (posicionado pela caixa).
        // A peça da rua multiplica o x por 4,5, então 0,1 aqui vale cerca de 0,45 unidade na tela.
        const alignByBox = (biomeName === 'city' || biomeName === 'industrial');
        const baseMargin = (biomeName === 'suburban') ? 2.4 : 0.5;
        const diagonalExtra = alignByBox ? 0.4 : 0.8;
        let xOffsetLeft = isStraightView ? -baseMargin : -(baseMargin + diagonalExtra);
        let xOffsetRight = isStraightView ? -baseMargin : -(baseMargin + diagonalExtra);
        const footprint = 0.6;
        // Giro para a frente do prédio olhar a pista. Cada pacote de modelos tem a frente em um eixo.
        const FACE_STREET_BY_BIOME = { suburban: Math.PI / 2, industrial: Math.PI, city: Math.PI };
        const FACE_STREET = FACE_STREET_BY_BIOME[biomeName];

        if (shouldSpawnDecor) {
            const leftModelTemp = templates.models[Math.floor(Math.random() * templates.models.length)];
            piece.leftDecor = leftModelTemp.clone();
            piece.leftDecor.scale.x *= footprint;
            piece.leftDecor.scale.z *= footprint;
            piece.leftDecor.rotation.y = FACE_STREET;
            if (alignByBox) placeBuildingByBox(piece.leftDecor, xOffsetLeft);
            else piece.leftDecor.position.set(xOffsetLeft, 0.6, 0);
            piece.left.add(piece.leftDecor);

            const rightModelTemp = templates.models[Math.floor(Math.random() * templates.models.length)];
            piece.rightDecor = rightModelTemp.clone();
            piece.rightDecor.scale.x *= footprint;
            piece.rightDecor.scale.z *= footprint;
            piece.rightDecor.rotation.y = FACE_STREET;
            if (alignByBox) placeBuildingByBox(piece.rightDecor, xOffsetRight);
            else piece.rightDecor.position.set(xOffsetRight, 0.6, 0);
            piece.right.add(piece.rightDecor);
        }

        // Geração de Postes e Detalhes Urbanos Rasteiros
        const isUrban = (biomeName !== 'nature');
        const shouldSpawnStreetlight = isUrban && streetlightTemplate && (pieceIndex % 18 === 0);

        if (shouldSpawnStreetlight) {
            piece.leftDetail = streetlightTemplate.clone();
            piece.leftDetail.position.set(0.4, 0.5, -1); 
            piece.leftDetail.rotation.y = -Math.PI / 2; 
            piece.left.add(piece.leftDetail);

            piece.rightDetail = streetlightTemplate.clone();
            piece.rightDetail.position.set(0.4, 0.4, -1); 
            piece.rightDetail.rotation.y = -Math.PI / 2; 
            piece.right.add(piece.rightDetail);
        }
        else if (templates.details.length > 0) {
            const leftDetailTemp = templates.details[Math.floor(Math.random() * templates.details.length)];
            piece.leftDetail = leftDetailTemp.clone();
            piece.leftDetail.position.set(-0.6, 0.4, 0);
            piece.left.add(piece.leftDetail);

            const rightDetailTemp = templates.details[Math.floor(Math.random() * templates.details.length)];
            piece.rightDetail = rightDetailTemp.clone();
            piece.rightDetail.position.set(-0.6, 0.4, 0);
            piece.right.add(piece.rightDetail);
        }
    }
}

// SPAWN DINÂMICO DOS 3 POTES DE MACUMBA ALINHADOS EM TRIÂNGULO (PONTO 5.1)
export function spawnMacumbaSpecialEvent() {
    const template = biomeTemplates.nature.details.find(d => d.name === 'macumba');
    if (!template) return;

    const group = new THREE.Group();
    
    // Forma o triângulo perfeito com 3 potes clonados
    for (let j = 0; j < 3; j++) {
        const pot = template.clone();
        pot.scale.set(0.65, 0.65, 0.65);
        const offsetX = (j === 0) ? 0 : (j === 1 ? 0.25 : -0.25);
        const offsetZ = (j === 0) ? -0.2 : (j === 1 ? 0.15 : 0.15);
        pot.position.set(offsetX, 0, offsetZ);
        group.add(pot);
    }

    // Escolhe aleatoriamente a calçada esquerda ou direita para spawnar
    const isLeft = Math.random() < 0.5;
    
    // Alinha perfeitamente sobre a calçada usando a mesma matemática de margem do poste de luz
    const spawnX = isLeft ? (-storedBordaDoAsfalto + 0.4) : (storedBordaDoAsfalto - 0.4);

    group.position.set(spawnX, ROAD_HEIGHT, getSpawnZ()); // Surge além da borda de cima da tela (Z = 120 no computador)    scene.add(group);
    activeSpecialScenery.push(group);
}

export function resetWorldScenery() { 
    if (!roadGroup) return;

    activeBiome = 'nature'; 

    // Limpa os elementos especiais (Macumbas) remanescentes na cena
    activeSpecialScenery.forEach(mesh => {
        scene.remove(mesh);
    });
    activeSpecialScenery = [];

    // Limpa as marcas de pneu acumuladas (Bug fix)
    tireMarks.forEach(mark => {
        roadGroup.remove(mark);
        // O material e geometria agora são únicos (shared), não damos dispose aqui
    });
    tireMarks = [];

    // Otimização: Só zera a posição da esteira das linhas
    if (dashedLines.length > 0) {
        dashedLines[0].position.z = 0;
    }

    roadPieces.forEach((piece, i) => {
        const zPos = (i * PIECE_LENGTH) - (ROAD_LENGTH / 2);
        piece.left.position.z = zPos;
        piece.right.position.z = zPos;

        decoratePiece(piece, 'nature', i);
    });
}

export function addTireMark(x) { 
    if (!roadGroup) return;

    const mark = new THREE.Mesh(sharedTireGeo, sharedTireMat);
    mark.rotation.x = -Math.PI / 2; 

    mark.position.set(x, 2.41, 0);  

    roadGroup.add(mark);
    tireMarks.push(mark);
}

function updateTireMarks() { 
    for (let i = tireMarks.length - 1; i >= 0; i--) {
        const mark = tireMarks[i]; 
        mark.position.z -= currentSpeed;

        if (mark.position.z < -ROAD_LENGTH / 2) {
            roadGroup.remove(mark);
            mark.geometry.dispose();
            mark.material.dispose();
            tireMarks.splice(i, 1);
        }
    }
}
