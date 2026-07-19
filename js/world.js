import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { scene, dirLight, hemisphereLight, currentPresetIndex } from './engine.js';

export let roadGroup; 
let dashedLines = []; 
let roadPieces = [];

const ROAD_LENGTH = 360;

// --- CONTROLE DE VELOCIDADE DINÂMICA ---
export let currentSpeed = 0.5;
const NORMAL_SPEED = 0.5;
const DECEL_RATE = 0.08;
const ACCEL_RATE = 0.02;
let isBraking = false;

let tireMarks = [];
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

export let streetlightTemplate = null; 
export let activeBiome = 'nature'; 
export let groundPlane;

let storedBordaDoAsfalto = 9.5; // Valor de fallback seguro

let biomeTemplates = {
    nature: { models: [], details: [] },
    suburban: { models: [], details: [] },
    industrial: { models: [], details: [] },
    city: { models: [], details: [] }
};

// Altera o bioma, pinta o chão, névoa e ajusta a iluminação dinamicamente
export function setActiveBiome(biomeName) {
    activeBiome = biomeName;

    // 1. PINTA O CHÃO INFINITO DE ACORDO COM A FASE
    if (groundPlane && groundPlane.material) {
        let groundColor = 0x557a2b; // Verde Grama (Floresta)
        if (biomeName === 'suburban') groundColor = 0x8a7d6e; // Cinza-Terra
        if (biomeName === 'industrial') groundColor = 0x6a6d73; // Cinza Cimento
        if (biomeName === 'city') groundColor = 0x5d5e62; // Asfalto escuro
        
        groundPlane.material.color.setHex(groundColor);
    }

    // 2. AJUSTE DE CLIMA, ILUMINAÇÃO E ATIVAÇÃO DE NEBLINA DINÂMICA
    if (dirLight && hemisphereLight) {
        let skyColor = 0x87CEEB; 
        
        if (scene) {
            if (biomeName === 'nature') {
                skyColor = 0x87CEEB; // Azul ensolarado
                dirLight.color.setHex(0xfcecca);
                dirLight.intensity = 1.15; // Sol quente forte
                hemisphereLight.intensity = 0.5;
                scene.fog = null; // Sem neblina na floresta
            } 
            else if (biomeName === 'suburban') {
                skyColor = 0xa1c6e7; // Azul claro
                dirLight.color.setHex(0xfcfbe3);
                dirLight.intensity = 0.90; // Um pouco mais fraco no subúrbio
                hemisphereLight.intensity = 0.45;
                scene.fog = null; // Sem neblina no subúrbio
            } 
            else if (biomeName === 'industrial') {
                skyColor = 0x9aa4b0; // Cinza poluído
                dirLight.color.setHex(0xe1ecf0);
                dirLight.intensity = 0.70; // Luz cinza fraca
                hemisphereLight.intensity = 0.40;
                
                // LEVE NEBLINA pontual exclusiva do industrial para simular atmosfera poluída
                scene.fog = new THREE.FogExp2('#9aa4b0', 0.005); 
            } 
            else if (biomeName === 'city') {
                skyColor = 0xfcd2dc; // Golden hour (Rosa do entardecer)
                dirLight.color.setHex(0xfcd2dc);
                dirLight.intensity = 0.85; // Luz suave dourada
                hemisphereLight.intensity = 0.45;
                scene.fog = null; // Sem neblina na cidade
            }

            // Atualiza o background e a cor da névoa
            scene.background.setHex(skyColor);
            if (scene.fog) {
                scene.fog.color.setHex(skyColor);
            }
        }
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
const NUM_PIECES = 85; 
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
                normalizeScenery(model, bKey === 'nature' ? 3.2 : 6.5);
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
            normalizeScenery(streetlight, 5.0);
            streetlightTemplate = streetlight;
            console.log("Template do Poste de Luz carregado com sucesso!");
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

    dashedLines.forEach(line => {
        line.position.z -= currentSpeed; 
        if (line.position.z < -ROAD_LENGTH / 2) {
            line.position.z += ROAD_LENGTH;
        }
    });

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

function decoratePiece(piece, biomeName, pieceIndex) { 
    // 1. Limpa todas as decorações antigas existentes para evitar memory leaks
    if (piece.leftDecor) piece.left.remove(piece.leftDecor); 
    if (piece.rightDecor) piece.right.remove(piece.rightDecor); 
    if (piece.leftDetail) piece.left.remove(piece.leftDetail); 
    if (piece.rightDetail) piece.right.remove(piece.rightDetail);

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
                const randScale = 0.8 + Math.random() * 0.45;
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

        let xOffsetLeft = isStraightView ? -3.2 : -5.0;
        let xOffsetRight = isStraightView ? -3.2 : -5.0;

        if (shouldSpawnDecor) {
            const leftModelTemp = templates.models[Math.floor(Math.random() * templates.models.length)];
            piece.leftDecor = leftModelTemp.clone();
            piece.leftDecor.position.set(xOffsetLeft, 0.6, 0);
            piece.left.add(piece.leftDecor);

            const rightModelTemp = templates.models[Math.floor(Math.random() * templates.models.length)];
            piece.rightDecor = rightModelTemp.clone();
            piece.rightDecor.position.set(xOffsetRight, 0.6, 0);
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

    group.position.set(spawnX, ROAD_HEIGHT, 120); // Surge lá atrás no horizonte (Z = 120)
    scene.add(group);
    activeSpecialScenery.push(group);

    console.log("Macumba especial de 15 segundos gerada na calçada!");
}

export function resetWorldScenery() { 
    if (!roadGroup) return;

    activeBiome = 'nature'; 

    // Limpa os elementos especiais (Macumbas) remanescentes na cena
    activeSpecialScenery.forEach(mesh => {
        scene.remove(mesh);
    });
    activeSpecialScenery = [];

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

    roadPieces.forEach((piece, i) => {
        const zPos = (i * PIECE_LENGTH) - (ROAD_LENGTH / 2);
        piece.left.position.z = zPos;
        piece.right.position.z = zPos;

        decoratePiece(piece, 'nature', i);
    });
}

export function addTireMark(x) { 
    if (!roadGroup) return;

    const geometry = new THREE.PlaneGeometry(0.3, 1.2); 
    const material = new THREE.MeshBasicMaterial({
        color: 0x111111,
        transparent: true,
        opacity: 0.23,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1
    });

    const mark = new THREE.Mesh(geometry, material);
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
