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
    camera = new THREE.PerspectiveCamera(14.5, aspect, 1, 1000);
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
