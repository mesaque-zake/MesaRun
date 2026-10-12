import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { currentSpeed, addTireMark } from './world.js';
import { scene, getSpawnZ, getDespawnZ } from './engine.js';

let truckModel = null;

// --- VARIÁVEIS E FROTA DE OBSTÁCULOS ---
const OBSTACLE_NAMES = [
    'hatchback-sports.glb', 'sedan.glb', 'suv-luxury.glb', 'suv.glb', 'taxi.glb',
    'truck-flat.glb', 'truck.glb', 'van.glb'
];
let obstacleTemplates = [];
let activeObstacles = [];
let garbageTruckTemplate = null;
const loader = new GLTFLoader();

// --- CATEGORIAS E ARRAYS DE ALIMENTOS (MESA BRASIL) ---
const HEALTHY_FOODS = [
    'apple.glb', 'banana.glb', 'beet.glb', 'broccoli.glb', 'cabbage.glb',
    'can-small.glb', 'can.glb', 'carrot.glb', 'carton-small.glb', 'carton.glb',
    'cauliflower.glb', 'cherries.glb', 'coconut.glb', 'corn.glb', 'egg.glb',
    'eggplant.glb', 'fish.glb', 'grapes.glb', 'leek.glb', 'lemon.glb',
    'loaf-baguette.glb', 'loaf-round.glb', 'loaf.glb', 'meat-raw.glb', 'onion.glb',
    'orange.glb', 'paprika.glb', 'pear.glb', 'pepper.glb', 'pineapple.glb',
    'pumpkin.glb', 'radish.glb', 'soda-bottle.glb', 'soda-can.glb',
    'strawberry.glb', 'tomato.glb', 'watermelon.glb'
];

export const NEGATIVE_FOODS = [
    { file: 'advocado-half.glb', msg: 'Hey... Isso já foi manipulado!', penalty: 20, category: 'manipulado' },
    { file: 'apple-half.glb', msg: 'Hey... Isso já foi manipulado!', penalty: 20, category: 'manipulado' },
    { file: 'coconut-half.glb', msg: 'Hey... Isso já foi manipulado!', penalty: 20, category: 'manipulado' },
    { file: 'lemon-half.glb', msg: 'Hey... Isso já foi manipulado!', penalty: 20, category: 'manipulado' },
    { file: 'paprika-slice.glb', msg: 'Hey... Isso já foi manipulado!', penalty: 20, category: 'manipulado' },
    { file: 'pear-half.glb', msg: 'Hey... Isso já foi manipulado!', penalty: 20, category: 'manipulado' },
    { file: 'onion-half.glb', msg: 'Hey... Isso já foi manipulado!', penalty: 20, category: 'manipulado' },
    { file: 'tomato-slice.glb', msg: 'Hey... Isso já foi manipulado!', penalty: 20, category: 'manipulado' },
    { file: 'bowl-broth.glb', msg: 'Não coletamos refeições prontas.', penalty: 10, category: 'preparado' },
    { file: 'burger.glb', msg: 'Não coletamos lanches prontos.', penalty: 10, category: 'lanche' },
    { file: 'chinese.glb', msg: 'Não coletamos refeições prontas.', penalty: 10, category: 'preparado' },
    { file: 'egg-cooked.glb', msg: 'Não coletamos alimentos que já foram preparados', penalty: 10, category: 'preparado' },
    { file: 'fries.glb', msg: 'Não coletamos refeições prontas.', penalty: 10, category: 'preparado' },
    { file: 'hot-dog.glb', msg: 'Não coletamos lanches prontos.', penalty: 10, category: 'lanche' },
    { file: 'meat-ribs.glb', msg: 'Não coletamos alimentos que já foram preparados', penalty: 10, category: 'preparado' },
    { file: 'rice-ball.glb', msg: 'Não coletamos alimentos que já foram preparados', penalty: 10, category: 'preparado' },
    { file: 'sandwich.glb', msg: 'Não coletamos lanches prontos.', penalty: 10, category: 'lanche' },
    { file: 'sushi-egg.glb', msg: 'Não coletamos alimentos que já foram preparados', penalty: 10, category: 'preparado' },
    { file: 'taco.glb', msg: 'Não coletamos lanches prontos.', penalty: 10, category: 'lanche' },
    { file: 'sub.glb', folder: 'food', msg: 'Não coletamos lanches prontos.', penalty: 10, category: 'lanche' },
    { file: 'turkey.glb', msg: 'Não coletamos alimentos que já foram preparados', penalty: 10, category: 'preparado' },
    { file: 'can-open.glb', msg: 'A embalagem já está aberta!', penalty: 20, category: 'aberto' },
    { file: 'candy-bar-wrapper.glb', msg: 'A embalagem já está aberta!', penalty: 20, category: 'aberto' },
    { file: 'chocolate-wrapper.glb', msg: 'A embalagem já está aberta!', penalty: 20, category: 'aberto' },
    { file: 'donut-sprinkles.glb', msg: 'Não coletamos doces com recheio!', penalty: 10, category: 'doce' },
    { file: 'cake.glb', msg: 'Não coletamos doces com recheio!', penalty: 10, category: 'doce' },
    { file: 'pudding.glb', folder: 'food', msg: 'Não coletamos doces com recheio!', penalty: 10, category: 'doce' },
    { file: 'wine-red.glb', msg: 'NÃO COLETAMOS ISSO!', penalty: 50, category: 'super' },
    { file: 'wine-white.glb', msg: 'NÃO COLETAMOS ISSO!', penalty: 50, category: 'super' },
    { file: 'mushroom-half.glb', msg: 'NÃO COLETAMOS ISSO!', penalty: 50, category: 'super' },
    { file: 'mushroom.glb', msg: 'NÃO COLETAMOS ISSO!', penalty: 50, category: 'super' },
    { file: 'styrofoam-dinner.glb', msg: 'HAHAHA! O "Mesa São Paulo" entregava isso em 1994, hoje não mais!', penalty: 0, category: 'easterEgg' },
    { file: 'egg-half.glb', msg: 'Espera... isso aí é lixo!', penalty: 20, category: 'lixo' },
    { file: 'fish-bones.glb', msg: 'Espera... isso aí é lixo!', penalty: 20, category: 'lixo' },
    { file: 'soda-can-crushed.glb', msg: 'Espera... isso aí é lixo!', penalty: 20, category: 'lixo' }
];


// --- SISTEMA EVENTO CAMINHÃO DE LIXO (BOSS) ---
let activeGarbageTruck = null;
let garbageTruckState = 'idle';
let garbageCount = 0;
let garbageDropTimer = 0;
let garbageTargetLaneX = 0;
let garbageTotalToDrop = 5;
let garbageApproachScale = 1; // acelera a chegada quando o boss nasce mais longe, para durar o mesmo tempo
let garbageLastDropLaneX = null;
let garbageEventsThisGame = 0;
let onEventCompleteCallback = null;

// --- SISTEMA EVENTO CARRO DE POLÍCIA ---
let policeTemplate = null;
let activePolice = null;
let policeState = 'idle';
let policeTargetX = 0;
let onPoliceCompleteCallback = null;

// --- SISTEMA EVENTO AMBULÂNCIA ---
let ambulanceTemplate = null;
let activeAmbulance = null;
let ambulanceState = 'idle';
let ambulancePassed = false;
let onAmbulanceCompleteCallback = null;
let ambulanceTargetX = 0;

let healthyTemplates = {};
let negativeTemplates = {};
let activeItems = [];

// Permite ao main.js controlar o ângulo de curva do caminhão
export function setTruckTransitionTurn(angle) { 
    targetTruckRotationY = angle; 
}

const itemBox = new THREE.Box3();

// --- FUNÇÃO AUXILIAR: TAMANHO UNIVERSAL COM SUPORTE A MATRIZ ATIVA ---
function normalizeAndBrighten(model, targetSize = 4.0) { 
    scene.add(model);
    model.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(model);
    scene.remove(model);

    const size = new THREE.Vector3();
    box.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z);
    const scaleFactor = (maxDim > 0.01) ? (targetSize / maxDim) : 1;
    model.scale.set(scaleFactor, scaleFactor, scaleFactor);

    model.traverse((child) => {
        if (child.isMesh && child.material) {
            child.castShadow = true;
            child.receiveShadow = true;

                        // Brilho próprio na cor real do item (sem véu branco): reaproveita a textura ou a cor base
            if (child.material.map) {
                child.material.emissive = new THREE.Color(0xffffff);
                child.material.emissiveMap = child.material.map;
            } else if (child.material.color) {
                child.material.emissive = child.material.color.clone();
            }
            child.material.emissiveIntensity = 0.2;
            child.material.roughness = 0.6; // Material mais natural
        }
    });
}

const playerBox = new THREE.Box3(); 
const obstacleBox = new THREE.Box3();

// --- SISTEMA DE PISTAS ---
let currentLanes = [7, 0, -7]; 
let currentLaneIndex = 1;
let targetX = 0.0;

// --- FISICA DE CURVA EM TRANSIÇÃO ---
let targetTruckRotationY = 0;

const LERP_SPEED = 0.15;
const MAX_ROLL = 0.10;
const ROLL_SPEED = 0.08;

// Escala de todos os veículos (caminhão, carros, lixeiro, polícia e ambulância). Era 2.5.
const VEHICLE_SCALE = 2.8;
 
// Carrega qualquer veículo com o mesmo padrão (escala 2.5 e sombras)
function loadVehicle(path, label, onLoaded) { 
    loader.load(
        path,
        (gltf) => {
            const model = gltf.scene;
            model.scale.set(VEHICLE_SCALE, VEHICLE_SCALE, VEHICLE_SCALE);
            model.rotation.y = 0;

            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            onLoaded(model);
        },
        undefined,
        (error) => {
            console.error(`Erro ao carregar ${label}: `, error);
        }
    );
}

export function createEntities(scene) { 
    // CAMINHÃO DO JOGADOR
    loadVehicle('assets/model/car/mycar/truck.glb', 'o caminhão', (model) => {
        truckModel = model;
        truckModel.position.set(0, 2.5, 0);
        scene.add(truckModel);
    });

    // FROTA DE CARROS
    OBSTACLE_NAMES.forEach((fileName) => {
        loadVehicle(`assets/model/car/${fileName}`, `o carro ${fileName}`, (model) => {
            obstacleTemplates.push(model);
        });
    });


    // DOAÇÕES SAUDÁVEIS
    HEALTHY_FOODS.forEach((file) => {
        const path = `assets/sprite/food/${file}`;
        loader.load(
            path, 
            (gltf) => {
                const temp = gltf.scene;
                normalizeAndBrighten(temp, 3.2);               
                healthyTemplates[file] = temp;
            },
            undefined,
            (error) => {
                console.error(`ERRO ao carregar doação: "${path}"`, error);
            }
        );
    });

    // ALIMENTOS PROIBIDOS
    NEGATIVE_FOODS.forEach((item) => {
        const path = `assets/sprite/${item.folder || 'negativefood'}/${item.file}`;
        loader.load(
            path, 
            (gltf) => {
                const temp = gltf.scene;
                normalizeAndBrighten(temp, 3.2);
                negativeTemplates[item.file] = temp;
            },
            undefined,
            (error) => {
                console.error(`ERRO ao carregar proibido: "${path}"`, error);
            }
        );
    });

        // CAMINHÃO DE LIXO (BOSS)
    loadVehicle('assets/model/car/garbage-truck.glb', 'o caminhão de lixo', (model) => {
        garbageTruckTemplate = model;
    });

    // VIATURA DE POLÍCIA
    loadVehicle('assets/model/car/police.glb', 'a viatura', (model) => {
        policeTemplate = model;
    });

    // AMBULÂNCIA
    loadVehicle('assets/model/car/ambulance.glb', 'a ambulância', (model) => {
        ambulanceTemplate = model;
    });

}

export function movePlayerLeft() { 
    if (!truckModel) return; 
    if (currentLaneIndex > 0) { 
        currentLaneIndex--; 
        targetX = currentLanes[currentLaneIndex]; 
    } 
}

export function movePlayerRight() { 
    if (!truckModel) return; 
    if (currentLaneIndex < 2) { 
        currentLaneIndex++; 
        targetX = currentLanes[currentLaneIndex]; 
    } 
}

// Posição x (no mundo) de uma faixa: 0, 1 ou 2. O main.js usa para posicionar o farolete de aviso.
export function getLaneX(index) {
    return currentLanes[index];
}

let markTimer = 0;

// EXECUTA A FÍSICA DO JOGADOR E DOS OBSTÁCULOS
export function updateEntities(isBraking, deltaTime = 0.016) { 
    if (!truckModel) return;

    const frameRatio = deltaTime * 60; 
    const adjustedLerp = Math.min(LERP_SPEED * frameRatio, 1);
    const adjustedRoll = Math.min(ROLL_SPEED * frameRatio, 1);

    truckModel.rotation.y += (targetTruckRotationY - truckModel.rotation.y) * 0.05 * frameRatio;

    const deltaX = targetX - truckModel.position.x;
    truckModel.position.x += deltaX * adjustedLerp;

    const targetRoll = -deltaX * MAX_ROLL; 
    truckModel.rotation.z += (targetRoll - truckModel.rotation.z) * adjustedRoll;

    if (isBraking && currentSpeed > 0.05) {
        markTimer++;
        if (markTimer % 3 === 0) {
            addTireMark(truckModel.position.x - 1.1);
            addTireMark(truckModel.position.x + 1.1);
        }
    } else {
        markTimer = 0;
    }

    const OBSTACLE_BASE_SPEED = 0.16; 
    const despawnZ = getDespawnZ(); // além da borda de baixo da tela (-45 no computador)
    for (let i = activeObstacles.length - 1; i >= 0; i--) {
        const obs = activeObstacles[i];
        const relativeSpeed = (currentSpeed - OBSTACLE_BASE_SPEED) * frameRatio;
        obs.position.z -= relativeSpeed;

        if (obs.position.z < despawnZ) {
            scene.remove(obs); 
            activeObstacles.splice(i, 1); 
        }
    }

    for (let i = activeItems.length - 1; i >= 0; i--) {
        const item = activeItems[i];
        item.mesh.position.z -= currentSpeed * frameRatio;

        item.spawnTime += 0.05 * frameRatio;
        // Lote 3: Flutuação mais alta e animada
        item.mesh.position.y = 4.0 + Math.sin(item.spawnTime * 2.0) * 0.35; 
        // Lote 3: Giro de 360º contínuo (sem aquele "vai e volta" do seno)
        item.mesh.rotation.y = item.spawnTime * 1.5;

        if (item.mesh.position.z < despawnZ) {
            scene.remove(item.mesh);
            activeItems.splice(i, 1);
        }
    }

    // --- INTELIGÊNCIA ARTIFICIAL DO CAMINHÃO DE LIXO (BOSS) ---
    if (activeGarbageTruck) {
        if (garbageTruckState === 'approaching') {
            const approachSpeed = 0.22 * garbageApproachScale * frameRatio;
            activeGarbageTruck.position.z -= approachSpeed;
            steerGarbageTruck(frameRatio, false);
            
            if (activeGarbageTruck.position.z <= 18) {
                activeGarbageTruck.position.z = 18;
                garbageTruckState = 'dropping';
                garbageCount = 0;
                garbageDropTimer = 0;
                garbageLastDropLaneX = null;
            }
        } 
        else if (garbageTruckState === 'dropping') {
            steerGarbageTruck(frameRatio, true);

            garbageDropTimer += deltaTime;
            // Só solta o lixo quando o caminhão já chegou na faixa de destino
            const reachedLane = Math.abs(garbageTargetLaneX - activeGarbageTruck.position.x) < 0.5;
            if (garbageDropTimer > 1.2 && reachedLane && garbageTargetLaneX !== garbageLastDropLaneX && garbageCount < garbageTotalToDrop) {
                garbageDropTimer = 0;
                garbageCount++;
                garbageLastDropLaneX = garbageTargetLaneX;
                dropGarbageFromTruck(garbageTargetLaneX);

                // Próximo lixo: troca para uma faixa diferente da que acabou de usar
                const otherLanes = currentLanes.filter(l => l !== garbageLastDropLaneX);
                garbageTargetLaneX = otherLanes[Math.floor(Math.random() * otherLanes.length)];
            }

            if (garbageCount >= garbageTotalToDrop) {
                garbageTruckState = 'exiting';
            }
        } 
        else if (garbageTruckState === 'exiting') {
            const exitSpeed = (currentSpeed - 0.20) * frameRatio;
            activeGarbageTruck.position.z -= exitSpeed;

            // Retomada Imediata: Carros voltam a spawnar assim que o lixeiro passa da traseira do caminhão
            if (activeGarbageTruck.position.z < -5) {
                if (onEventCompleteCallback) {
                    onEventCompleteCallback(); 
                    onEventCompleteCallback = null; // Executa uma única vez
                }
            }

            if (activeGarbageTruck.position.z < despawnZ) {
                scene.remove(activeGarbageTruck);
                activeGarbageTruck = null;
                garbageTruckState = 'idle';
            }
        }
    }

        // --- VIATURA DE POLÍCIA ---
    if (activePolice && policeState === 'racing') {
        policeTargetX = steerEmergencyVehicle(activePolice, policeTargetX, 1.1, frameRatio);

        // Retomada Imediata: spawns normais voltam assim que a polícia ultrapassa o jogador
        if (activePolice.position.z > 25 && onPoliceCompleteCallback) {
            onPoliceCompleteCallback();
            onPoliceCompleteCallback = null; // Executa uma única vez
        }

        if (activePolice.position.z > getSpawnZ()) {
            scene.remove(activePolice);
            activePolice = null;
            policeState = 'idle';
        }
    }

    // --- AMBULÂNCIA ---
    if (activeAmbulance && ambulanceState === 'racing') {
        ambulanceTargetX = steerEmergencyVehicle(activeAmbulance, ambulanceTargetX, 0.90, frameRatio);

        // Retomada Imediata: spawns normais voltam assim que a ambulância ultrapassa o jogador
        if (activeAmbulance.position.z > 25 && onAmbulanceCompleteCallback) {
            onAmbulanceCompleteCallback();
            onAmbulanceCompleteCallback = null; // Executa uma única vez
        }

        if (activeAmbulance.position.z > getSpawnZ()) {
            scene.remove(activeAmbulance);
            activeAmbulance = null;
            ambulanceState = 'idle';
        }
    }
}

// =========================================
// CAMINHÃO DE LIXO (BOSS) RESPEITANDO O TRÂNSITO
// =========================================
const BOSS_LOOKAHEAD = 40;     // alcance (em z) em que ele enxerga carros chegando atrás dele
const BOSS_BODY_MARGIN = 6;    // carro emparelhado com ele (um pouco à frente) também conta
const BOSS_LANE_GAP = 3.5;     // distância lateral (em x) abaixo da qual um carro "ocupa" a faixa
// Todos os carros têm a mesma velocidade: este é o trecho de pista que o boss precisa ver com uma saída livre
const BOSS_CLEAR_DEPTH = BOSS_LOOKAHEAD + BOSS_BODY_MARGIN;

// A faixa tem um carro chegando (ou emparelhado) em relação a um veículo na posição z?
function isLaneBlockedByCars(vehicleZ, laneX) {
    for (const obs of activeObstacles) {
        const dz = obs.position.z - vehicleZ;
        if (dz > -BOSS_BODY_MARGIN && dz < BOSS_LOOKAHEAD && Math.abs(obs.position.x - laneX) < BOSS_LANE_GAP) {
            return true;
        }
    }
    return false;
}

// Ir de fromX até toX passa por alguma faixa ocupada? A faixa de onde ele está saindo não conta
function isLanePathBlocked(vehicleZ, fromX, toX) {
    if (Math.abs(toX - fromX) < 1) return isLaneBlockedByCars(vehicleZ, toX);

    const dir = Math.sign(toX - fromX);
    const total = (toX - fromX) * dir;
    for (const laneX of currentLanes) {
        const ahead = (laneX - fromX) * dir;
        if (ahead > 1 && ahead <= total + 0.5 && isLaneBlockedByCars(vehicleZ, laneX)) return true;
    }
    return false;
}

// Escolhe a faixa do boss desviando dos carros e anda até ela.
// avoidLastDrop = true (soltando lixo): prefere uma faixa diferente da última em que soltou.
function steerGarbageTruck(frameRatio, avoidLastDrop) {
    const truck = activeGarbageTruck;
    const z = truck.position.z;
    const x = truck.position.x;

    const blocked = isLanePathBlocked(z, x, garbageTargetLaneX);
    const repeatsLast = avoidLastDrop && garbageLastDropLaneX !== null && garbageTargetLaneX === garbageLastDropLaneX;

    if (blocked || repeatsLast) {
        const safeLanes = currentLanes.filter(l => !isLanePathBlocked(z, x, l));
        const preferred = avoidLastDrop ? safeLanes.filter(l => l !== garbageLastDropLaneX) : safeLanes;
        if (preferred.length > 0) {
            garbageTargetLaneX = preferred[Math.floor(Math.random() * preferred.length)];
        } else if (blocked && safeLanes.length > 0) {
            // Só a faixa do último lixo está livre: não bater vem primeiro
            garbageTargetLaneX = safeLanes[Math.floor(Math.random() * safeLanes.length)];
        }
    }

    truck.position.x += (garbageTargetLaneX - truck.position.x) * 0.08 * frameRatio;
}

// Alcance (em z) em que polícia e ambulância enxergam carros e o jogador à frente
const EMERGENCY_LOOKAHEAD = 40;
// Tamanho aproximado do corpo: o veículo ainda conta como "ao lado" logo depois de passar do alvo
const EMERGENCY_BODY_MARGIN = 6;
// Ritmo do trânsito (igual ao OBSTACLE_BASE_SPEED de updateEntities), usado quando não há faixa livre
const FOLLOW_TRAFFIC_SPEED = 0.16;

// Uma faixa está ocupada se há um carro, ou o jogador (na faixa em que está ou para onde vai),
// à frente do veículo ou emparelhado com ele
function isLaneBlockedFor(vehicleZ, laneX) {
    for (const obs of activeObstacles) {
        const dz = obs.position.z - vehicleZ;
        if (dz > -EMERGENCY_BODY_MARGIN && dz < EMERGENCY_LOOKAHEAD && Math.abs(obs.position.x - laneX) < 3.5) {
            return true;
        }
    }

    if (truckModel) {
        const dz = truckModel.position.z - vehicleZ;
        if (dz > -EMERGENCY_BODY_MARGIN && dz < EMERGENCY_LOOKAHEAD) {
            if (Math.abs(truckModel.position.x - laneX) < 3.5 || Math.abs(targetX - laneX) < 0.1) {
                return true;
            }
        }
    }

    return false;
}

// Movimento e desvio compartilhados pela polícia e pela ambulância.
// Devolve a faixa de destino (trocada para uma faixa livre quando a atual está ocupada).
function steerEmergencyVehicle(vehicle, desiredX, baseSpeed, frameRatio) {
    let newTargetX = desiredX;
    let speed = baseSpeed;

    if (isLaneBlockedFor(vehicle.position.z, desiredX)) {
        // Procura a faixa livre mais próxima de onde o veículo está agora
        let bestLane = null;
        let bestDist = Infinity;
        for (const laneX of currentLanes) {
            if (isLaneBlockedFor(vehicle.position.z, laneX)) continue;
            const dist = Math.abs(laneX - vehicle.position.x);
            if (dist < bestDist) {
                bestDist = dist;
                bestLane = laneX;
            }
        }

        if (bestLane !== null) {
            newTargetX = bestLane;
        } else {
            // Nenhuma faixa livre: acompanha o ritmo do trânsito em vez de bater
            speed = FOLLOW_TRAFFIC_SPEED;
        }
    }

    vehicle.position.z += (speed - currentSpeed) * frameRatio;
    vehicle.position.x += (newTargetX - vehicle.position.x) * 0.10 * frameRatio;

    return newTargetX;
}

// Instancia um clone aleatório de qualquer carro
export function spawnObstacle() { 
    if (obstacleTemplates.length === 0) return;

    const randomTemplateIndex = Math.floor(Math.random() * obstacleTemplates.length);
    const selectedTemplate = obstacleTemplates[randomTemplateIndex];

    const spawnZ = getSpawnZ(); // além da borda de cima da tela (120 no computador)
    let randomLaneIndex = Math.floor(Math.random() * currentLanes.length);

    // Com o caminhão de lixo na pista, um carro novo nunca fecha as 3 faixas no mesmo trecho: o boss precisa de uma saída
    if (activeGarbageTruck) {
        const occupied = [];
        currentLanes.forEach((laneX, idx) => {
            const taken = activeObstacles.some(o => o.position.z > spawnZ - BOSS_CLEAR_DEPTH && Math.abs(o.position.x - laneX) < BOSS_LANE_GAP);
            if (taken) occupied.push(idx);
        });

        if (occupied.length >= 3) return; // sem saída: pula este carro
        if (occupied.length === 2) randomLaneIndex = occupied[Math.floor(Math.random() * 2)]; // só em faixa já ocupada
    }

    const xPos = currentLanes[randomLaneIndex];

    const obstacle = selectedTemplate.clone();
    obstacle.position.set(xPos, 2.4, spawnZ);

    scene.add(obstacle);
    activeObstacles.push(obstacle);
}

// VERIFICA COLISÕES UNIFICADAS
export function checkCollisions() { 
    if (!truckModel) return false;

    playerBox.setFromObject(truckModel);
    playerBox.expandByScalar(-0.3); 

    const vehicles = [...activeObstacles, activeGarbageTruck, activePolice, activeAmbulance];

    for (const vehicle of vehicles) {
        if (!vehicle) continue;

        obstacleBox.setFromObject(vehicle);
        obstacleBox.expandByScalar(-0.3);
        if (playerBox.intersectsBox(obstacleBox)) {
            return true;
        }
    }

    return false; 
}


// Reseta os estados de todos os atores
export function resetEntities() { 
    if (truckModel) { 
        currentLaneIndex = 1;
        targetX = 0.0;
        truckModel.position.set(0, 2.5, 0); 
        truckModel.rotation.set(0, 0, 0);
    }

    if (activeGarbageTruck) {
        scene.remove(activeGarbageTruck);
        activeGarbageTruck = null;
        garbageTruckState = 'idle';
    }

    if (activePolice) {
        scene.remove(activePolice);
        activePolice = null;
        policeState = 'idle';
    }

    if (activeAmbulance) {
        scene.remove(activeAmbulance);
        activeAmbulance = null;
        ambulanceState = 'idle';
    }

    for (let obs of activeObstacles) {
        scene.remove(obs);
    }
    activeObstacles = []; 

    for (let item of activeItems) {
        scene.remove(item.mesh);
    }
    activeItems = [];

    targetTruckRotationY = 0;
    garbageEventsThisGame = 0; // a "primeira vez" do boss volta a valer na próxima partida
    garbageLastDropLaneX = null;
}

// Gera uma doação saudável ou proibida
export function spawnItem() { 
    const isHealthy = Math.random() < 0.6; 
    let selectedTemplate = null; 
    let itemData = null;

    if (isHealthy) {
        const keys = Object.keys(healthyTemplates);
        if (keys.length === 0) return;
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        selectedTemplate = healthyTemplates[randomKey];
        itemData = { isHealthy: true, value: 20, msg: '+20 kg', file: randomKey, category: null, isGarbage: false };
    } else {
        const loadedNegatives = NEGATIVE_FOODS.filter(item => item.category !== 'lixo' && negativeTemplates[item.file]);
        if (loadedNegatives.length === 0) return;
        const randomItem = loadedNegatives[Math.floor(Math.random() * loadedNegatives.length)];
        selectedTemplate = negativeTemplates[randomItem.file];
        itemData = { isHealthy: false, value: -randomItem.penalty, msg: randomItem.msg, file: randomItem.file, category: randomItem.category, isGarbage: false };
    }

    if (!selectedTemplate) return;

    const itemMesh = selectedTemplate.clone();

    const randomLaneIndex = Math.floor(Math.random() * currentLanes.length);
    const xPos = currentLanes[randomLaneIndex];

    itemMesh.position.set(xPos, 3.5, getSpawnZ());

    scene.add(itemMesh);
    activeItems.push({
        mesh: itemMesh,
        data: itemData,
        spawnTime: Math.random() * 100 
    });
}

// Detecta coletas de itens
export function checkItemCollections(onCollectCallback) { 
    if (!truckModel || activeItems.length === 0) return;

    const playerX = truckModel.position.x;
    const playerZ = truckModel.position.z;

    for (let i = activeItems.length - 1; i >= 0; i--) {
        const item = activeItems[i];
        
        const distX = Math.abs(playerX - item.mesh.position.x);
        const distZ = Math.abs(playerZ - item.mesh.position.z);

        if (distX < 1.8 && distZ < 2.8) {
            onCollectCallback(item.data, item.mesh.position.x);

            scene.remove(item.mesh);
            activeItems.splice(i, 1);
        }
    }
}

// Ativa o spawn do Caminhão de Lixo no horizonte
export function spawnGarbageTruck(onComplete) { 
    if (!garbageTruckTemplate) return;

    // 1ª aparição da partida: 5 lixos. Nas seguintes: 7 ou 8
    garbageEventsThisGame++;
    garbageTotalToDrop = (garbageEventsThisGame === 1) ? 5 : 7 + Math.floor(Math.random() * 2);

    onEventCompleteCallback = onComplete;
    activeGarbageTruck = garbageTruckTemplate.clone();

    const randomLaneIndex = Math.floor(Math.random() * currentLanes.length);
    const xPos = currentLanes[randomLaneIndex];

    const bossSpawnZ = getSpawnZ();
    activeGarbageTruck.position.set(xPos, 2.4, bossSpawnZ); 
    garbageTargetLaneX = xPos;
    // Mantém o tempo de chegada de antes (o trajeto original era de 120 até 18)
    garbageApproachScale = (bossSpawnZ - 18) / (120 - 18);

    scene.add(activeGarbageTruck);
    garbageTruckState = 'approaching'; 
}

// Lógica de arremesso de dejetos do Boss
function dropGarbageFromTruck(xPos) { 
    const garbageItems = NEGATIVE_FOODS.filter(item => item.category === 'lixo' && negativeTemplates[item.file]);
    if (garbageItems.length === 0) return;

    const chosen = garbageItems[Math.floor(Math.random() * garbageItems.length)];
    const template = negativeTemplates[chosen.file];

    const itemMesh = template.clone();
    itemMesh.position.set(xPos, 2.4, 18); 

    scene.add(itemMesh);

    const itemData = { 
        isHealthy: false, 
        value: -chosen.penalty, 
        msg: chosen.msg, 
        file: chosen.file,
        category: chosen.category,
        isGarbage: true 
    };

    activeItems.push({
        mesh: itemMesh,
        data: itemData,
        spawnTime: Math.random() * 100
    });
}

// Ativa o spawn da Viatura por trás
export function spawnPoliceCar(laneIndex, onComplete) { 
    if (!policeTemplate) return;

    onPoliceCompleteCallback = onComplete;
    activePolice = policeTemplate.clone();

    const xPos = currentLanes[laneIndex];
    activePolice.position.set(xPos, 2.4, getDespawnZ());

    scene.add(activePolice);
    policeState = 'racing';
    policeTargetX = xPos;
}

// Ativa o spawn da Ambulância por trás
export function spawnAmbulance(laneIndex, onComplete) { 
    if (!ambulanceTemplate) return;

    onAmbulanceCompleteCallback = onComplete;
    activeAmbulance = ambulanceTemplate.clone();

    const xPos = currentLanes[laneIndex];
    activeAmbulance.position.set(xPos, 2.4, getDespawnZ());

    scene.add(activeAmbulance);
    ambulanceState = 'racing';
    ambulanceTargetX = xPos;
}
