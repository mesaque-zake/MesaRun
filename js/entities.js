import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { currentSpeed, addTireMark } from './world.js';
import { scene } from './engine.js'; 

export let truckModel = null;

// --- VARIÁVEIS E FROTA DE OBSTÁCULOS ---
const OBSTACLE_NAMES = [
    'hatchback-sports.glb',
    'sedan.glb',
    'suv-luxury.glb',
    'suv.glb',
    'taxi.glb',
    'truck-flat.glb',
    'truck.glb',
    'van.glb'
];
export let obstacleTemplates = []; 
let activeObstacles = [];         
let garbageTruckTemplate = null;
const loader = new GLTFLoader();

// --- CATEGORIAS E ARRAYS DE ALIMENTOS (MESA BRASIL) ---
const HEALTHY_FOODS = [
    'apple.glb', 'banana.glb', 'beet.glb', 'broccoli.glb', 'cabbage.glb', 'can-small.glb', 'can.glb', 
    'carrot.glb', 'carton-small.glb', 'carton.glb', 'cauliflower.glb', 'cherries.glb', 'coconut.glb', 
    'corn.glb', 'egg.glb', 'eggplant.glb', 'fish.glb', 'grapes.glb', 'leek.glb', 'lemon.glb', 
    'loaf-baguette.glb', 'loaf-round.glb', 'loaf.glb', 'meat-raw.glb', 'onion.glb', 'orange.glb', 
    'paprika.glb', 'pear.glb', 'pepper.glb', 'pineapple.glb', 'pudding.glb', 'pumpkin.glb', 
    'radish.glb', 'soda-bottle.glb', 'soda-can.glb', 'strawberry.glb', 'sub.glb', 'tomato.glb', 'watermelon.glb'
];

const NEGATIVE_FOODS = [
    { file: 'advocado-half.glb', msg: 'ISSO JÁ FOI MANIPULADO!', penalty: 20 },
    { file: 'apple-half.glb', msg: 'ISSO JÁ FOI MANIPULADO!', penalty: 20 },
    { file: 'coconut-half.glb', msg: 'ISSO JÁ FOI MANIPULADO!', penalty: 20 },
    { file: 'lemon-half.glb', msg: 'ISSO JÁ FOI MANIPULADO!', penalty: 20 },
    { file: 'paprika-slice.glb', msg: 'ISSO JÁ FOI MANIPULADO!', penalty: 20 },
    { file: 'pear-half.glb', msg: 'ISSO JÁ FOI MANIPULADO!', penalty: 20 },
    { file: 'onion-half.glb', msg: 'ISSO JÁ FOI MANIPULADO!', penalty: 20 },
    { file: 'tomato-slice.glb', msg: 'ISSO JÁ FOI MANIPULADO!', penalty: 20 },
    { file: 'bowl-broth.glb', msg: 'NÃO COLETAMOS REFEIÇÕES PRONTAS', penalty: 10 },
    { file: 'burger.glb', msg: 'NÃO COLETAMOS LANCHES PRONTOS', penalty: 10 },
    { file: 'chinese.glb', msg: 'NÃO COLETAMOS REFEIÇÕES PRONTAS', penalty: 10 },
    { file: 'egg-cooked.glb', msg: 'NÃO COLETAMOS ALIMENTOS PRONTOS', penalty: 10 },
    { file: 'fries.glb', msg: 'NÃO COLETAMOS LANCHES PRONTOS', penalty: 10 },
    { file: 'hot-dog.glb', msg: 'NÃO COLETAMOS LANCHES PRONTOS', penalty: 10 },
    { file: 'meat-ribs.glb', msg: 'NÃO COLETAMOS ALIMENTOS PRONTOS', penalty: 10 },
    { file: 'rice-ball.glb', msg: 'NÃO COLETAMOS ALIMENTOS PRONTOS', penalty: 10 },
    { file: 'sandwich.glb', msg: 'NÃO COLETAMOS LANCHES PRONTOS', penalty: 10 },
    { file: 'sushi-egg.glb', msg: 'NÃO COLETAMOS ALIMENTOS PRONTOS', penalty: 10 },
    { file: 'taco.glb', msg: 'NÃO COLETAMOS LANCHES PRONTOS', penalty: 10 },
    { file: 'turkey.glb', msg: 'NÃO COLETAMOS ALIMENTOS PRONTOS', penalty: 10 },
    { file: 'can-open.glb', msg: 'A embalagem já está aberta!', penalty: 20 },
    { file: 'candy-bar-wrapper.glb', msg: 'A embalagem já está aberta!', penalty: 20 },
    { file: 'chocolate-wrapper.glb', msg: 'A embalagem já está aberta!', penalty: 20 },
    { file: 'donut-sprinkles.glb', msg: 'Não coletamos doces com recheio!', penalty: 10 },
    { file: 'cake.glb', msg: 'Não coletamos doces com recheio!', penalty: 10 },
    { file: 'wine-red.glb', msg: 'NÃO COLETAMOS ISSO!', penalty: 50 },
    { file: 'wine-white.glb', msg: 'NÃO COLETAMOS ISSO!', penalty: 50 },
    { file: 'mushroom-half.glb', msg: 'NÃO COLETAMOS ISSO!', penalty: 50 },
    { file: 'mushroom.glb', msg: 'NÃO COLETAMOS ISSO!', penalty: 50 },
    { file: 'styrofoam-dinner.glb', msg: 'O Mesa entregava isso em 1994, hoje não mais!', penalty: 0 },
    
    // NOVO LOTE: Adicionando dejetos específicos do Boss para carregamento correto
    { file: 'egg-half.glb', msg: 'Espera... isso aí é lixo!', penalty: 20 },
    { file: 'fish-bones.glb', msg: 'Espera... isso aí é lixo!', penalty: 20 },
    { file: 'soda-can-crushed.glb', msg: 'Espera... isso aí é lixo!', penalty: 20 }
];

// --- SISTEMA EVENTO CAMINHÃO DE LIXO (BOSS) ---
export let activeGarbageTruck = null;   
let garbageTruckState = 'idle';        
let garbageCount = 0;                  
let garbageDropTimer = 0;              
let garbageLaneTimer = 0;              
let garbageTargetLaneX = 0;            

// --- SISTEMA EVENTO CARRO DE POLÍCIA ---
let policeTemplate = null;             
export let activePolice = null;        
let policeState = 'idle';              
let policeTargetX = 0;                 
let onPoliceCompleteCallback = null;   

// --- SISTEMA EVENTO AMBULÂNCIA ---
let ambulanceTemplate = null;
export let activeAmbulance = null;
let ambulanceState = 'idle';
let ambulancePassed = false; 
let onAmbulanceCompleteCallback = null;

let onEventCompleteCallback = null; 

export let healthyTemplates = {};      
export let negativeTemplates = {};     
export let activeItems = [];           

// Permite ao main.js controlar o ângulo de curva do caminhão
export function setTruckTransitionTurn(angle) {
    targetTruckRotationY = angle;
}

const itemBox = new THREE.Box3();    

// --- FUNÇÃO AUXILIAR: TAMANHO UNIVERSAL COM SUPORTE A MATRIZ ATIVA ---
function normalizeAndBrighten(model, targetSize = 3.2) {
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

            child.material.emissive = new THREE.Color(0x3a3a3a); 
            child.material.emissiveIntensity = 0.65;             
            child.material.roughness = 0.25;
        }
    });
}

const playerBox = new THREE.Box3();
const obstacleBox = new THREE.Box3();

// --- SISTEMA DE PISTAS (Inicializado em 7 para evitar pulos laterais) ---
export let currentLanes = [7, 0, -7]; 
let currentLaneIndex = 1;        
let targetX = 0.0;               

// --- FISICA DE CURVA EM TRANSIÇÃO ---
let targetTruckRotationY = 0; 

export function updateLaneOffsets(isFlipped) {
    currentLanes = [7, 0, -7]; 
}

const LERP_SPEED = 0.15;          
const MAX_ROLL = 0.10;           
const ROLL_SPEED = 0.08;         

export function createEntities(scene) {
    // CAMINHÃO DO JOGADOR
    loader.load(
        'assets/model/car/mycar/truck.glb',
        function (gltf) {
            truckModel = gltf.scene;
            truckModel.scale.set(2.5, 2.5, 2.5); 
            truckModel.position.set(0, 2.5, 0); 
            
            truckModel.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            scene.add(truckModel);
        },
        undefined, 
        function (error) {
            console.error('Erro ao carregar o caminhão: ', error);
        }
    );

    // FROTA DE CARROS
    OBSTACLE_NAMES.forEach((fileName) => {
        loader.load(
            `assets/model/car/${fileName}`,
            function (gltf) {
                const template = gltf.scene;
                template.scale.set(2.5, 2.5, 2.5);
                template.rotation.y = 0; 

                template.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                obstacleTemplates.push(template);
                console.log(`Carro ${fileName} carregado com sucesso!`);
            },
            undefined,
            function (error) {
                console.error(`Erro ao carregar o carro ${fileName}: `, error);
            }
        );
    });

    // DOAÇÕES SAUDÁVEIS
    HEALTHY_FOODS.forEach((file) => {
        const path = `assets/sprite/food/${file}`;
        loader.load(
            path, 
            (gltf) => {
                const temp = gltf.scene;
                normalizeAndBrighten(temp, 3.2);
                temp.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                healthyTemplates[file] = temp;
            },
            undefined,
            (error) => {
                console.error(`ERRO ao carregar doação: "${path}"`, error);
            }
        );
    });

    // ALIMENTOS PROIBIDOS (Incluindo os 3 novos dejetos específicos)
    NEGATIVE_FOODS.forEach((item) => {
        const path = `assets/sprite/negativefood/${item.file}`;
        loader.load(
            path, 
            (gltf) => {
                const temp = gltf.scene;
                normalizeAndBrighten(temp, 3.2);
                temp.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                negativeTemplates[item.file] = temp;
            },
            undefined,
            (error) => {
                console.error(`ERRO ao carregar proibido: "${path}"`, error);
            }
        );
    });

    // CAMINHÃO DE LIXO (BOSS)
    loader.load(
        'assets/model/car/garbage-truck.glb',
        function (gltf) {
            garbageTruckTemplate = gltf.scene;
            garbageTruckTemplate.scale.set(2.5, 2.5, 2.5); 
            garbageTruckTemplate.rotation.y = 0; 
            
            garbageTruckTemplate.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            console.log("Template do Caminhão de Lixo carregado com sucesso!");
        },
        undefined, 
        function (error) {
            console.error('Erro ao carregar o caminhão de lixo: ', error);
        }
    );

    // VIATURA DE POLÍCIA
    loader.load(
        'assets/model/car/police.glb',
        function (gltf) {
            policeTemplate = gltf.scene;
            policeTemplate.scale.set(2.5, 2.5, 2.5); 
            policeTemplate.rotation.y = 0; 
            
            policeTemplate.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            console.log("Template da Viatura carregado com sucesso!");
        },
        undefined, 
        function (error) {
            console.error('Erro ao carregar a viatura: ', error);
        }
    );

    // AMBULÂNCIA
    loader.load(
        'assets/model/car/ambulance.glb',
        function (gltf) {
            ambulanceTemplate = gltf.scene;
            ambulanceTemplate.scale.set(2.5, 2.5, 2.5); 
            ambulanceTemplate.rotation.y = 0; 
            
            ambulanceTemplate.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
            console.log("Template da Ambulância carregado com sucesso!");
        },
        undefined, 
        function (error) {
            console.error('Erro ao carregar a ambulância: ', error);
        }
    );
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
    for (let i = activeObstacles.length - 1; i >= 0; i--) {
        const obs = activeObstacles[i];
        const relativeSpeed = (currentSpeed - OBSTACLE_BASE_SPEED) * frameRatio;
        obs.position.z -= relativeSpeed;

        if (obs.position.z < -45) {
            scene.remove(obs); 
            activeObstacles.splice(i, 1); 
        }
    }

    for (let i = activeItems.length - 1; i >= 0; i--) {
        const item = activeItems[i];
        item.mesh.position.z -= currentSpeed * frameRatio;

        item.spawnTime += 0.05 * frameRatio;
        item.mesh.position.y = 3.2 + Math.sin(item.spawnTime) * 0.15; 
        item.mesh.rotation.y = Math.sin(item.spawnTime * 1.3) * 0.785;

        if (item.mesh.position.z < -45) {
            scene.remove(item.mesh);
            activeItems.splice(i, 1);
        }
    }

    // --- INTELIGÊNCIA ARTIFICIAL DO CAMINHÃO DE LIXO (BOSS) ---
    if (activeGarbageTruck) {
        if (garbageTruckState === 'approaching') {
            const approachSpeed = 0.22 * frameRatio;
            activeGarbageTruck.position.z -= approachSpeed;
            
            if (activeGarbageTruck.position.z <= 18) {
                activeGarbageTruck.position.z = 18;
                garbageTruckState = 'dropping';
                garbageCount = 0;
                garbageDropTimer = 0;
                garbageLaneTimer = 0;
                garbageTargetLaneX = activeGarbageTruck.position.x;
            }
        } 
        else if (garbageTruckState === 'dropping') {
            activeGarbageTruck.position.x += (garbageTargetLaneX - activeGarbageTruck.position.x) * 0.08 * frameRatio;
            
            garbageLaneTimer += deltaTime;
            if (garbageLaneTimer > 2.2) {
                garbageLaneTimer = 0;
                const randomLaneIndex = Math.floor(Math.random() * currentLanes.length);
                garbageTargetLaneX = currentLanes[randomLaneIndex];
            }

            garbageDropTimer += deltaTime;
            if (garbageDropTimer > 1.2 && garbageCount < 5) {
                garbageDropTimer = 0;
                garbageCount++;
                dropGarbageFromTruck(activeGarbageTruck.position.x); 
            }

            if (garbageCount >= 5) {
                garbageTruckState = 'exiting';
            }
        } 
        else if (garbageTruckState === 'exiting') {
            const exitSpeed = (currentSpeed - 0.20) * frameRatio;
            activeGarbageTruck.position.z -= exitSpeed;

            // Retorna o fluxo de spawners imediatamente assim que o caminhão passar pelo jogador (z < 0)
            if (onEventCompleteCallback && activeGarbageTruck.position.z < 0) {
                onEventCompleteCallback();
                onEventCompleteCallback = null; // Evita múltiplas chamadas
            }

            if (activeGarbageTruck.position.z < -45) {
                scene.remove(activeGarbageTruck);
                activeGarbageTruck = null;
                garbageTruckState = 'idle';
            }
        }
    }

    // --- INTELIGÊNCIA ARTIFICIAL DA VIATURA DE POLÍCIA ---
    if (activePolice) {
        if (policeState === 'racing') {
            const POLICE_BASE_SPEED = 1.1;
            const relativeSpeed = (POLICE_BASE_SPEED - currentSpeed) * frameRatio;
            activePolice.position.z += relativeSpeed; 

            activePolice.position.x += (policeTargetX - activePolice.position.x) * 0.10 * frameRatio;

            for (let obs of activeObstacles) {
                const sameLane = Math.abs(obs.position.x - activePolice.position.x) < 1.8;
                const inFront = obs.position.z > activePolice.position.z;
                const distZ = obs.position.z - activePolice.position.z;

                if (sameLane && inFront && distZ < 15) {
                    const otherLanes = currentLanes.filter(l => Math.abs(l - activePolice.position.x) > 1.8);
                    if (otherLanes.length > 0) {
                        policeTargetX = otherLanes[Math.floor(Math.random() * otherLanes.length)];
                    }
                    break;
                }
            }

            if (onPoliceCompleteCallback && activePolice.position.z > 15) {
                onPoliceCompleteCallback();
                onPoliceCompleteCallback = null;
            }

            if (activePolice.position.z > 120) {
                scene.remove(activePolice);
                activePolice = null;
                policeState = 'idle';
            }
        }
    }

    // --- MOVIMENTO DA AMBULÂNCIA ---
    if (activeAmbulance) {
        if (ambulanceState === 'racing') {
            const AMBULANCE_BASE_SPEED = 0.90;
            const relativeSpeed = (AMBULANCE_BASE_SPEED - currentSpeed) * frameRatio;
            activeAmbulance.position.z += relativeSpeed; 

            if (activeAmbulance.position.z > 0 && !ambulancePassed) {
                ambulancePassed = true;
                // Dispara evento personalizado para o main.js recompensar ou pontuar
                document.dispatchEvent(new CustomEvent('ambulance-passed'));
            }

            if (onAmbulanceCompleteCallback && activeAmbulance.position.z > 15) {
                onAmbulanceCompleteCallback();
                onAmbulanceCompleteCallback = null;
            }

            if (activeAmbulance.position.z > 120) {
                scene.remove(activeAmbulance);
                activeAmbulance = null;
                ambulanceState = 'idle';
            }
        }
    }
}
// Instancia um clone aleatório de qualquer carro
export function spawnObstacle() {
    if (obstacleTemplates.length === 0) return;

    const randomTemplateIndex = Math.floor(Math.random() * obstacleTemplates.length);
    const selectedTemplate = obstacleTemplates[randomTemplateIndex];

    const obstacle = selectedTemplate.clone();

    const randomLaneIndex = Math.floor(Math.random() * currentLanes.length);
    const xPos = currentLanes[randomLaneIndex];

    obstacle.position.set(xPos, 2.4, 120);

    scene.add(obstacle);
    activeObstacles.push(obstacle);
}

// VERIFICA COLISÕES UNIFICADAS
export function checkCollisions() {
    if (!truckModel) return false;

    playerBox.setFromObject(truckModel);
    playerBox.expandByScalar(-0.3); 

    for (let obs of activeObstacles) {
        obstacleBox.setFromObject(obs);
        obstacleBox.expandByScalar(-0.3);
        if (playerBox.intersectsBox(obstacleBox)) {
            return true; 
        }
    }

    if (activeGarbageTruck) {
        obstacleBox.setFromObject(activeGarbageTruck);
        obstacleBox.expandByScalar(-0.3);
        if (playerBox.intersectsBox(obstacleBox)) {
            return true;
        }
    }

    if (activePolice) {
        obstacleBox.setFromObject(activePolice);
        obstacleBox.expandByScalar(-0.3);
        if (playerBox.intersectsBox(obstacleBox)) {
            return true;
        }
    }

    if (activeAmbulance) {
        obstacleBox.setFromObject(activeAmbulance);
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
        targetTruckRotationY = 0; 
        updateLaneOffsets(false);
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
        itemData = { isHealthy: true, value: 20, msg: '+20 kg', file: randomKey, isGarbage: false };
    } else {
        const loadedNegatives = NEGATIVE_FOODS.filter(item => negativeTemplates[item.file]);
        if (loadedNegatives.length === 0) return;
        const randomItem = loadedNegatives[Math.floor(Math.random() * loadedNegatives.length)];
        selectedTemplate = negativeTemplates[randomItem.file];
        itemData = { isHealthy: false, value: -randomItem.penalty, msg: randomItem.msg, file: randomItem.file, isGarbage: false };
    }

    if (!selectedTemplate) return;

    const itemMesh = selectedTemplate.clone();
    
    const randomLaneIndex = Math.floor(Math.random() * currentLanes.length);
    const xPos = currentLanes[randomLaneIndex];

    itemMesh.position.set(xPos, 3.5, 120); 

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

    onEventCompleteCallback = onComplete; 
    activeGarbageTruck = garbageTruckTemplate.clone();

    const randomLaneIndex = Math.floor(Math.random() * currentLanes.length);
    const xPos = currentLanes[randomLaneIndex];

    activeGarbageTruck.position.set(xPos, 2.4, 120); 

    scene.add(activeGarbageTruck);
    garbageTruckState = 'approaching'; 
}

// Lógica de arremesso de dejetos do Boss (Solta estritamente apenas estes 3 itens!)
function dropGarbageFromTruck(xPos) {
    const garbageFiles = ['egg-half.glb', 'fish-bones.glb', 'soda-can-crushed.glb'];
    const randomFile = garbageFiles[Math.floor(Math.random() * garbageFiles.length)];
    const template = negativeTemplates[randomFile];

    if (!template) return; 

    const itemMesh = template.clone();
    itemMesh.position.set(xPos, 2.4, 18); 

    scene.add(itemMesh);

    const itemData = { 
        isHealthy: false, 
        value: -20, 
        msg: "Espera... isso aí é lixo!", 
        file: randomFile,
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
    activePolice.position.set(xPos, 2.4, -45); 

    scene.add(activePolice);
    policeState = 'racing';
    policeTargetX = xPos;
}

// Ativa o spawn da Ambulância por trás
export function spawnAmbulance(laneIndex, onComplete) {
    if (!ambulanceTemplate) return;

    onAmbulanceCompleteCallback = onComplete;
    activeAmbulance = ambulanceTemplate.clone();
    ambulancePassed = false; 

    const xPos = currentLanes[laneIndex];
    activeAmbulance.position.set(xPos, 2.4, -45); 

    scene.add(activeAmbulance);
    ambulanceState = 'racing';
    ambulanceTargetX = xPos;
}
