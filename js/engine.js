import * as THREE from 'three';

export let scene, camera, renderer, dirLight, hemisphereLight; 

// --- PRESETS DE CÂMERA (ISOMÉTRICA, VERTICAL E CHASE/AÇÃO) ---
const CAMERA_PRESETS = [
    {
        name: 'isometric',
        menu: new THREE.Vector3(-20, 15, -25),         
        playLeft: new THREE.Vector3(-60, 60, -90),     
        playRight: new THREE.Vector3(60, 60, -110),     
        menuLook: new THREE.Vector3(0, 2.3, 0)         
    },
    {
        name: 'topdown',
        menu: new THREE.Vector3(-3, 15, -25),          
        playLeft: new THREE.Vector3(-8, 30, -120),     
        playRight: new THREE.Vector3(8, 30, -130),     
        menuLook: new THREE.Vector3(0, 2.5, 0)
    },
    {
        name: 'chase',
        menu: new THREE.Vector3(0, 15, -25),            
        playLeft: new THREE.Vector3(0, 30, -130),      
        playRight: new THREE.Vector3(0, 30, -130),
        menuLook: new THREE.Vector3(0, 2.0, 0)
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

    // 2. Cria a cena global (Sem névoa de início!)
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#87CEEB'); 

    // 3. Mede o contêiner para definir as dimensões físicas da div quadrada
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

    dirLight = new THREE.DirectionalLight(0xffffff, 1.1); 
    dirLight.position.set(-15, 30, 25); 
    dirLight.castShadow = true;
    
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;

    dirLight.shadow.camera.left = -20;
    dirLight.shadow.camera.right = 20;
    dirLight.shadow.camera.top = 20;
    dirLight.shadow.camera.bottom = -20;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 80;

    dirLight.shadow.bias = -0.0005;

    scene.add(dirLight);

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

        let targetLook;
        if (isPlaying) {
            if (isCrashed) {
                targetLook = new THREE.Vector3(camera.position.x + 5, 2.0, 0); 
            } else {
                const targetLookX = isCameraFlipped ? 2.5 : 0;
                targetLook = new THREE.Vector3(targetLookX, 1.5, 8);
            }
        } else {
            targetLook = preset.menuLook; 
        }
        camera.lookAt(targetLook);

        if (shakeIntensity > 0.01) {
            camera.position.x += (Math.random() - 0.5) * shakeIntensity;
            camera.position.y += (Math.random() - 0.5) * shakeIntensity;
            camera.position.z += (Math.random() - 0.5) * shakeIntensity;
            shakeIntensity *= shakeDecay;
        }

        renderer.render(scene, camera);
    }
}
