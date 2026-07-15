import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { currentSpeed, addTireMark } from './world.js';
import { scene } from './engine.js'; // <-- 1. IMPORTA A CENA GLOBAL DA ENGINE

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
export let obstacleTemplates = []; // Guarda todos os modelos carregados da frota [1]
let activeObstacles = [];         // Lista de carros ativos na pista           // <-- 3. DECLARA A LISTA DE CONTROLE DOS CARROS
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
    { file: 'hot-dog.glb', msg: 'NÃO COLETAMOS LANCHES  PRONTOS', penalty: 10 },
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
    { file: 'styrofoam-dinner.glb', msg: 'O Mesa entregava isso em 1994, hoje não mais!', penalty: 0 }
];

export let healthyTemplates = {};      // Dicionário com modelos saudáveis carregados
export let negativeTemplates = {};     // Dicionário com modelos proibidos carregados
export let activeItems = [];           // Lista de alimentos correndo na pista

// Permite ao main.js controlar o ângulo de curva do caminhão
export function setTruckTransitionTurn(angle) {
    targetTruckRotationY = angle;
}

const itemBox = new THREE.Box3();    

// --- FUNÇÃO AUXILIAR: TAMANHO UNIVERSAL COM TRUQUE DE CENA ATIVA ---
function normalizeAndBrighten(model, targetSize = 3.2) {
    // 1. TRUQUE: Adiciona o modelo temporariamente na cena ativa para forçar o cálculo correto de matrizes [1]
    scene.add(model);
    model.updateMatrixWorld(true);

    // 2. Calcula a caixa física real usando o motor oficial do Three.js com as matrizes ativas [1]
    const box = new THREE.Box3().setFromObject(model);

    // 3. Remove imediatamente do cenário após a medição [1]
    scene.remove(model);

    const size = new THREE.Vector3();
    box.getSize(size);
    
    // Identifica a maior dimensão real do alimento [1]
    const maxDim = Math.max(size.x, size.y, size.z);
    
    // Ajusta a escala baseado no tamanho real medido
    const scaleFactor = (maxDim > 0.01) ? (targetSize / maxDim) : 1;
    model.scale.set(scaleFactor, scaleFactor, scaleFactor);

    // 4. Aplica o brilho (Glow) e a saturação nos materiais [2]
    model.traverse((child) => {
        if (child.isMesh && child.material) {
            child.castShadow = true;
            child.receiveShadow = true;

            // Ativa uma emissão de luz própria para destacar as cores no asfalto escuro [2]
            child.material.emissive = new THREE.Color(0x3a3a3a); 
            child.material.emissiveIntensity = 0.65;             

            // Deixa o material reflexivo para saturar as cores sob as luzes
            child.material.roughness = 0.25;
        }
    });
}

const playerBox = new THREE.Box3();
const obstacleBox = new THREE.Box3();

// --- VARIÁVEIS DE MOVIMENTO DO CAMINHÃO ---
export let currentLanes = [5.5, -1.0, -7.5]; // Começa nas faixas originais da esquerda [1]
let currentLaneIndex = 1;        
let targetX = 0.0;               

// --- FISICA DE CURVA EM TRANSIÇÃO ---
let targetTruckRotationY = 0; // Direção para onde o caminhão vira na curva [2]


// Permite ao main.js espelhar as coordenadas da pista em tempo real
export function updateLaneOffsets(isFlipped) {
    if (isFlipped) {
        currentLanes = [7.5, 1, -5]; 
    } else {
        currentLanes = [5.5, -1.0, -7.5];
    }
}

// Ajustes físicos da inércia e inclinação (Body Roll)
const LERP_SPEED = 0.15;          // Velocidade do deslizamento lateral (maior = mais rápido)
const MAX_ROLL = 0.10;           // Inclinação máxima em radianos ao fazer a curva
const ROLL_SPEED = 0.08;         // Velocidade do balanço para inclinar e estabilizar

export function createEntities(scene) {

    loader.load(
        'assets/model/car/mycar/truck.glb',
        function (gltf) {
            truckModel = gltf.scene;
            
            // Ajustes de tamanho e posição inicial
            truckModel.scale.set(2.5, 2.5, 2.5); 
            truckModel.position.set(0, 2.5, 0); 
            
            truckModel.traverse((child) => {
                if (child.isMesh) {
                    // Mantemos apenas a configuração de sombras
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // O GLTFLoader já cuida de aplicar os materiais e texturas
                    // automaticamente a partir do arquivo .glb.
                }
            });

            scene.add(truckModel);
        },
        undefined, 
        function (error) {
            console.error('Erro ao carregar o caminhão: ', error);
        }
    );
    // CARREGAMENTO EM LOOP DE TODA A FROTA DE CARROS [1]
    OBSTACLE_NAMES.forEach((fileName) => {
        loader.load(
            `assets/model/car/${fileName}`,
            function (gltf) {
                const template = gltf.scene;
                
                // Ajustamos a escala e a direção padrão virada para a mesma direção do jogador
                template.scale.set(2.5, 2.5, 2.5);
                template.rotation.y = 0; 

                template.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });

                // Guarda o template carregado na nossa array de frota
                obstacleTemplates.push(template);
                console.log(`Carro ${fileName} carregado com sucesso!`);
            },
            undefined,
            function (error) {
                console.error(`Erro ao carregar o carro ${fileName}: `, error);
            }
        );
    });
    // CARREGAMENTO EM LOTE - DOAÇÕES SAUDÁVEIS (Com rastreador de erros) [2]
    HEALTHY_FOODS.forEach((file) => {
        const path = `assets/sprite/food/${file}`;
        loader.load(
            path, 
            (gltf) => {
                const temp = gltf.scene;
                // Normaliza o tamanho em 3.2 unidades e aplica o brilho/saturação [1, 2]
                normalizeAndBrighten(temp, 3.2);
                temp.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                healthyTemplates[file] = temp;
                console.log(`Doação saudável carregada: ${file}`); // Confirma se carregou
            },
            undefined,
            (error) => {
                // Alerta ruidosamente no F12 se o caminho estiver errado! [2]
                console.error(`ERRO: Não encontrei a doação no caminho "${path}". Verifique a pasta!`, error);
            }
        );
    });

    // CARREGAMENTO EM LOTE - ALIMENTOS PROIBIDOS (Com rastreador de erros) [2]
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
                console.log(`Alimento proibido carregado: ${item.file}`); // Confirma se carregou
            },
            undefined,
            (error) => {
                // Alerta ruidosamente no F12 se o caminho estiver errado! [2]
                console.error(`ERRO: Não encontrei o proibido no caminho "${path}". Verifique a pasta!`, error);
            }
        );
    });
}

// Função para comandar a mudança para a faixa esquerda
export function movePlayerLeft() {
    if (!truckModel) return;
    if (currentLaneIndex > 0) {
        currentLaneIndex--;
        targetX = currentLanes[currentLaneIndex];
    }
}

// Função para comandar a mudança para a faixa direito
export function movePlayerRight() {
    if (!truckModel) return;
    if (currentLaneIndex < 2) {
        currentLaneIndex++;
        targetX = currentLanes[currentLaneIndex];
    }
}

let markTimer = 0; // Temporizador para não gerar rastros em excesso

// EXECUTA A FÍSICA DO JOGADOR E DOS OBSTÁCULOS (Agora independente da taxa de quadros/Hz!) [2]
export function updateEntities(isBraking, deltaTime = 0.016) {
    if (!truckModel) return;

    // 60 é o nosso multiplicador base para bater exatamente com a velocidade confortável do seu PC [2]
    const frameRatio = deltaTime * 60; 
    const adjustedLerp = Math.min(LERP_SPEED * frameRatio, 1);
    const adjustedRoll = Math.min(ROLL_SPEED * frameRatio, 1);

    // Interpola a rotação Y para simular o caminhão fazendo a curva na transição
    truckModel.rotation.y += (targetTruckRotationY - truckModel.rotation.y) * 0.05 * frameRatio;

    // 1. Deslizamento Lateral Suave (LERP) no eixo X (Usando a velocidade ajustada pelo tempo real) [2]
    const deltaX = targetX - truckModel.position.x;
    truckModel.position.x += deltaX * adjustedLerp;

    // 2. Física de Inclinação Lateral (Body Roll) (Usando as velocidades ajustadas) [2]
    const targetRoll = -deltaX * MAX_ROLL; 
    truckModel.rotation.z += (targetRoll - truckModel.rotation.z) * adjustedRoll;

    // 3. Geração de marcas de pneu se estiver freando
    if (isBraking && currentSpeed > 0.05) {
        markTimer++;
        if (markTimer % 3 === 0) {
            addTireMark(truckModel.position.x - 1.1);
            addTireMark(truckModel.position.x + 1.1);
        }
    } else {
        markTimer = 0;
    }

    // 4. Movimento e Ciclo de Vida dos Obstáculos (Sincronizado com o Delta Time para o tráfego também!) [2]
    const OBSTACLE_BASE_SPEED = 0.16; 

    for (let i = activeObstacles.length - 1; i >= 0; i--) {
        const obs = activeObstacles[i];
        
        // Sincroniza a velocidade de aproximação dos carros com o tempo real [2]
        const relativeSpeed = (currentSpeed - OBSTACLE_BASE_SPEED) * frameRatio;
        obs.position.z -= relativeSpeed;

        if (obs.position.z < -45) {
            scene.remove(obs); 
            activeObstacles.splice(i, 1); 
        }
    }

    // --- MOVIMENTO E ANIMAÇÃO DOS ALIMENTOS (Sincronizado com Delta Time) ---
    for (let i = activeItems.length - 1; i >= 0; i--) {
        const item = activeItems[i];
        
        // Move os alimentos de forma síncrona com o tempo real [2]
        item.mesh.position.z -= currentSpeed * frameRatio;

        // Animação: Leve balanço vertical de flutuação em torno da altura 3.2 [2]
        item.spawnTime += 0.05 * frameRatio;
        item.mesh.position.y = 3.2 + Math.sin(item.spawnTime) * 0.15; 

        // ROTAÇÃO DE 90º: Oscilação síncrona de um lado para o outro [2]
        item.mesh.rotation.y = Math.sin(item.spawnTime * 1.3) * 0.785;

        // Limpeza de memória se o item passar do caminhão
        if (item.mesh.position.z < -45) {
            scene.remove(item.mesh);
            activeItems.splice(i, 1);
        }
    }
}

// Instancia um clone aleatório de qualquer carro carregado na nossa frota [1]
export function spawnObstacle() {
    // Se nenhum carro terminou de carregar da internet ainda, ignora temporariamente o spawn
    if (obstacleTemplates.length === 0) return;

    // Sorteia um dos templates de carros disponíveis na nossa frota [1]
    const randomTemplateIndex = Math.floor(Math.random() * obstacleTemplates.length);
    const selectedTemplate = obstacleTemplates[randomTemplateIndex];

    // Clona o modelo sorteado instantaneamente (Object Pooling)
    const obstacle = selectedTemplate.clone();

    // Sorteia uma das 3 faixas que você calibrou [5.5, -1, -7.5]
    const randomLaneIndex = Math.floor(Math.random() * currentLanes.length);
    const xPos = currentLanes[randomLaneIndex];

    obstacle.position.set(xPos, 2.4, 120);

    scene.add(obstacle);
    activeObstacles.push(obstacle);
}

// Verifica se o caminhão encostou em qualquer um dos Sedans ativos
export function checkCollisions() {
    if (!truckModel || activeObstacles.length === 0) return false;

    // 1. Gera a caixa de colisão do caminhão do jogador
    playerBox.setFromObject(truckModel);
    
    // DICA DE SÊNIOR: Encolhemos a caixa física em 30cm (-0.3). 
    // Pequenas raspadas nas pontas serão perdoadas, evitando colisões injustas!
    playerBox.expandByScalar(-0.3);

    // 2. Varre todos os Sedans ativos na pista
    for (let obs of activeObstacles) {
        obstacleBox.setFromObject(obs);
        obstacleBox.expandByScalar(-0.3); // Encolhe a caixa do obstáculo também

        // Checa se as duas caixas virtuais se sobrepõem
        if (playerBox.intersectsBox(obstacleBox)) {
            return true; // Bateu!
        }
    }
    return false; // Pista limpa, sem batidas
}

// Limpa os obstáculos antigos e reseta o caminhão do jogador
export function resetEntities() {
    if (truckModel) {
        currentLaneIndex = 1;        // Reseta para a faixa do meio
        targetX = 0.0;               // Reseta o deslize
        truckModel.position.set(0, 2.5, 0);
        truckModel.rotation.set(0, 0, 0); // Desfaz qualquer balanço pendente
        targetTruckRotationY = 0; 
        updateLaneOffsets(false);
    }

    // Remove todos os Sedans ativos da tela
    for (let obs of activeObstacles) {
        scene.remove(obs);
    }
    activeObstacles = []; // Limpa a nossa lista de controle

    // Limpa todos os alimentos ativos da tela
    for (let item of activeItems) {
        scene.remove(item.mesh);
    }
    activeItems = [];

    targetTruckRotationY = 0;
    
}

// Gera uma doação em uma das 3 faixas com 60% saudável e 40% negativa
export function spawnItem() {
    const isHealthy = Math.random() < 0.6; // 60% saudável
    let selectedTemplate = null;
    let itemData = null;

    if (isHealthy) {
        const keys = Object.keys(healthyTemplates);
        if (keys.length === 0) return;
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        selectedTemplate = healthyTemplates[randomKey];
        itemData = { isHealthy: true, value: 20, msg: '+20 kg', file: randomKey };
    } else {
        // Garante que só sorteie negativos cujos modelos já terminaram de carregar da internet
        const loadedNegatives = NEGATIVE_FOODS.filter(item => negativeTemplates[item.file]);
        if (loadedNegatives.length === 0) return;
        const randomItem = loadedNegatives[Math.floor(Math.random() * loadedNegatives.length)];
        selectedTemplate = negativeTemplates[randomItem.file];
        itemData = { isHealthy: false, value: -randomItem.penalty, msg: randomItem.msg, file: randomItem.file };
    }

    if (!selectedTemplate) return;

    const itemMesh = selectedTemplate.clone();
    
    // Sorteia uma das 3 faixas [5.5, -1, -7.5]
    const randomLaneIndex = Math.floor(Math.random() * currentLanes.length);
    const xPos = currentLanes[randomLaneIndex];

    itemMesh.position.set(xPos, 3.5, 120); // Começa lá no fundo

    scene.add(itemMesh);
    activeItems.push({
        mesh: itemMesh,
        data: itemData,
        spawnTime: Math.random() * 100 // Diferencia a fase inicial da oscilação vertical
    });
}

// Detecta as colisões de coleta ignorando o eixo Y (colisão 2D justa e precisa) [1]
export function checkItemCollections(onCollectCallback) {
    if (!truckModel || activeItems.length === 0) return;

    const playerX = truckModel.position.x;
    const playerZ = truckModel.position.z;

    for (let i = activeItems.length - 1; i >= 0; i--) {
        const item = activeItems[i];
        
        // Calcula a distância horizontal (X) e de profundidade (Z) [1]
        const distX = Math.abs(playerX - item.mesh.position.x);
        const distZ = Math.abs(playerZ - item.mesh.position.z);

        // Se o caminhão estiver na mesma faixa (distX < 1.8) e próximo no asfalto (distZ < 2.8)
        if (distX < 1.8 && distZ < 2.8) {
            // Dispara a coleta!
            onCollectCallback(item.data, item.mesh.position.x);

            scene.remove(item.mesh);
            activeItems.splice(i, 1);
        }
    }
}
