import * as THREE from 'three';

export let scene, camera, renderer, dirLight, hemisphereLight;

// --- PRESETS DE CÂMERA (ISOMÉTRICA, VERTICAL E CHASE/AÇÃO FRONTAL) ---
const CAMERA_PRESETS = [
    { 
        name: 'isometric', 
        menu: new THREE.Vector3(-20, 15, -25),
        playLeft: new THREE.Vector3(-40, 60, -120),
        playRight: new THREE.Vector3(40, 60, -120),
        menuLook: new THREE.Vector3(0, 2.3, 0)
    }, 
    { 
        name: 'topdown', 
        menu: new THREE.Vector3(-3, 15, -25),
        playLeft: new THREE.Vector3(-5, 40, -120),
        playRight: new THREE.Vector3(5, 40, -120),
        menuLook: new THREE.Vector3(0, 2.5, 0) 
    },
    { 
        name: 'chase', 
        menu: new THREE.Vector3(6, 11, 28),
        playLeft: new THREE.Vector3(20, 35, 120),
        playRight: new THREE.Vector3(-20, 35, 120), 
        menuLook: new THREE.Vector3(0, 2.2, 0) 
    }
];

export let currentPresetIndex = 0; 
let isCameraFlipped = false;

// Permite ao main.js mudar a câmera em tempo real
export function setCameraPreset(index) { 
    currentPresetIndex = index; 
}

// Permite ao main.js alternar a câmera durante a transição
export function setCameraFlippedState(state) { 
    isCameraFlipped = state; 
}

// --- SISTEMA DE ZOOM DE BATIDA (CRASH ZOOM) ---
let isCrashed = false;
const crashCameraPos = new THREE.Vector3();

// Dispara o zoom calculando um ponto muito próximo em frente ao caminhão
export function triggerCrashZoom(truckX) { 
    isCrashed = true; 
    crashCameraPos.set(truckX - 5, 4.0, -10); 
}

// Reseta o estado do zoom de batida
export function resetCrashZoom() {
    isCrashed = false; 
}

// Campo de visão vertical de referência (o do computador, com a área do jogo quadrada)
const BASE_FOV = 14.5;
// Quanto o campo de visão abre em telas estreitas (celular em pé):
// 0 = não muda nada (como antes); 1 = mostra a mesma largura de pista do computador.
// Quanto mais alto, mais pista à frente aparece, e carros e itens podem surgir à vista.
const PORTRAIT_FIT = 0.5;

function fovForAspect(aspect) {
    if (aspect >= 1) return BASE_FOV;
    const halfTan = Math.tan(THREE.MathUtils.degToRad(BASE_FOV / 2)) / Math.pow(aspect, PORTRAIT_FIT);
    return THREE.MathUtils.radToDeg(Math.atan(halfTan)) * 2;
}

export function initEngine() { 
    // 1. Captura o contêiner do HTML
    const container = document.getElementById('game-container');

    // 2. Cria a cena global
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#87CEEB'); 

    // 3. Mede o contêiner para definir as dimensões físicas da div
    const width = container.clientWidth;
    const height = container.clientHeight;
    const aspect = width / height;

    // --- CÂMERA DE PERSPECTIVA COM ZOOM CINEMATOGRÁFICO ---
    camera = new THREE.PerspectiveCamera(fovForAspect(aspect), aspect, 1, 1000);
    camera.position.set(-45, 30, -60); 
    camera.lookAt(0, 1.5, 5); 

    // --- CONFIGURAÇÃO DO RENDERIZADOR ---
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height); 

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    renderer.shadowMap.enabled = true; 
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; 

    renderer.outputColorSpace = THREE.SRGBColorSpace; 
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95; 

    container.appendChild(renderer.domElement);

    // --- ILUMINAÇÃO REPOSICIONADA (Contra-luz ativo) ---
    hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x333333, 0.45); 
    scene.add(hemisphereLight);

    // Prepara a neblina global (invisível por padrão, esperando o Lerp)
    scene.fog = new THREE.FogExp2(0xa0a8b0, 0);

    dirLight = new THREE.DirectionalLight(0xffffff, 1.1); 
    // A luz e o alvo dela andam juntos 22 unidades para a frente (z).
    // O ângulo do sol continua o mesmo, só muda a região coberta pela sombra.
    dirLight.position.set(-30, 45, 32);
    dirLight.target.position.set(0, 0, 22);
    dirLight.castShadow = true;

    // Mapa maior para cobrir uma janela mais ampla à frente do caminhão
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;

    // Eixo esquerda/direita da sombra corre ao longo da pista; cima/baixo cobre as laterais
    dirLight.shadow.camera.left = -50;
    dirLight.shadow.camera.right = 50;
    dirLight.shadow.camera.top = 25;
    dirLight.shadow.camera.bottom = -25;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 100;
    dirLight.shadow.camera.updateProjectionMatrix();

    dirLight.shadow.bias = -0.001;
    dirLight.shadow.normalBias = 0.05;

    scene.add(dirLight);
    scene.add(dirLight.target);

    window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() { 
    const container = document.getElementById('game-container'); 
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    const aspect = width / height;

    camera.aspect = aspect;
    camera.fov = fovForAspect(aspect);
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
}

// --- SISTEMA DE TREMOR DE TELA ---
let shakeIntensity = 0; 
const shakeDecay = 0.88;

export function triggerCameraShake(intensity = 1.0) { 
    shakeIntensity = intensity; 
}

// Objeto de ponto de mira instanciado uma única vez para evitar Garbage Collection
const tempTargetLook = new THREE.Vector3();

export function renderEngine(isPlaying) { 
    if (renderer && scene && camera) {
        const preset = CAMERA_PRESETS[currentPresetIndex];

        let targetPos = preset.menu;
        if (isPlaying) {
            if (isCrashed) {
                targetPos = crashCameraPos; 
            } else {
                targetPos = isCameraFlipped ? preset.playRight : preset.playLeft;
            }
        }

        const lerpSpeed = isCrashed ? 0.08 : 0.04;
        camera.position.lerp(targetPos, lerpSpeed); 

        if (isPlaying) {
            if (isCrashed) {
                tempTargetLook.set(camera.position.x + 5, 2.0, 0); 
            } else {
                const targetLookX = isCameraFlipped ? 2.5 : 0;
                tempTargetLook.set(targetLookX, 1.5, 8);
            }
        } else {
            tempTargetLook.copy(preset.menuLook); 
        }
        camera.lookAt(tempTargetLook);

        if (shakeIntensity > 0.01) {
            camera.position.x += (Math.random() - 0.5) * shakeIntensity;
            camera.position.y += (Math.random() - 0.5) * shakeIntensity;
            camera.position.z += (Math.random() - 0.5) * shakeIntensity;
            shakeIntensity *= shakeDecay;
        }

        renderer.render(scene, camera);
    }
}
// Converte um ponto do mundo em posição na tela (em % da área do jogo).
// Devolve null se o ponto estiver atrás da câmera.
const tempScreenPoint = new THREE.Vector3();

export function worldToScreenPercent(x, y, z) {
    if (!camera) return null;
    camera.updateMatrixWorld();
    tempScreenPoint.set(x, y, z).project(camera);
    if (tempScreenPoint.z > 1) return null;
    return {
        x: (tempScreenPoint.x * 0.5 + 0.5) * 100,
        y: (-tempScreenPoint.y * 0.5 + 0.5) * 100
    };
}

// =========================================
// ONDE OS OBJETOS NASCEM E SOMEM (depende da câmera e do formato da tela)
// =========================================
const SPAWN_Z_DEFAULT = 120;     // nascimento original (computador)
const SPAWN_Z_MAX = 270;         // limite: a pista termina uns 13 depois disso
const DESPAWN_Z_DEFAULT = -45;   // sumiço original
const EDGE_MARGIN = 10;          // folga para o objeto estar 100% fora da tela

// Câmera de teste: fica na posição de jogo, sem o suavizado de movimento da câmera real
const probeCamera = new THREE.PerspectiveCamera();
const probeRay = new THREE.Raycaster();
const probePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -2.4); // plano y = 2.4 (o asfalto)
const probeHit = new THREE.Vector3();
const probeNdc = new THREE.Vector2();
let probeKey = '';
let probeTopZ = SPAWN_Z_DEFAULT;
let probeBottomZ = DESPAWN_Z_DEFAULT;

// Mede onde a borda de cima e a de baixo da tela tocam a pista. Só recalcula se câmera, lado ou formato mudarem.
function updateVisibleRange() {
    if (!camera) return;
    const key = `${currentPresetIndex}|${isCameraFlipped}|${camera.aspect}`;
    if (key === probeKey) return;
    probeKey = key;

    const preset = CAMERA_PRESETS[currentPresetIndex];
    probeCamera.fov = camera.fov;
    probeCamera.aspect = camera.aspect;
    probeCamera.near = camera.near;
    probeCamera.far = camera.far;
    probeCamera.updateProjectionMatrix();
    probeCamera.position.copy(isCameraFlipped ? preset.playRight : preset.playLeft);
    probeCamera.lookAt(isCameraFlipped ? 2.5 : 0, 1.5, 8);
    probeCamera.updateMatrixWorld(true);

    let top = -Infinity;
    let bottom = Infinity;
    for (const ndcX of [-1, 0, 1]) {
        probeNdc.set(ndcX, 1);
        probeRay.setFromCamera(probeNdc, probeCamera);
        if (probeRay.ray.intersectPlane(probePlane, probeHit)) top = Math.max(top, probeHit.z);

        probeNdc.set(ndcX, -1);
        probeRay.setFromCamera(probeNdc, probeCamera);
        if (probeRay.ray.intersectPlane(probePlane, probeHit)) bottom = Math.min(bottom, probeHit.z);
    }
    probeTopZ = isFinite(top) ? top : SPAWN_Z_DEFAULT;
    probeBottomZ = isFinite(bottom) ? bottom : DESPAWN_Z_DEFAULT;
}

// Z onde carros, itens, boss e macumba nascem: sempre além da borda de cima da tela.
// Nunca menor que 120 (o valor original), então no computador nada muda.
// Vale para a Diagonal Retrô e a Visão de Cima. A Câmera de Ação olha para o outro lado e fica como estava.
export function getSpawnZ() {
    if (currentPresetIndex === 2) return SPAWN_Z_DEFAULT;
    updateVisibleRange();
    return Math.min(SPAWN_Z_MAX, Math.max(SPAWN_Z_DEFAULT, probeTopZ + EDGE_MARGIN));
}

// Z abaixo do qual os veículos e itens somem: só depois de saírem pela borda de baixo da tela.
// Nunca mais perto que -45 (o valor original).
export function getDespawnZ() {
    if (currentPresetIndex === 2) return DESPAWN_Z_DEFAULT;
    updateVisibleRange();
    return Math.min(DESPAWN_Z_DEFAULT, probeBottomZ - EDGE_MARGIN);
}
