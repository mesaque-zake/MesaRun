import * as THREE from 'three';

export let scene, camera, renderer, dirLight, hemisphereLight; 

// Diminuímos para 52 (zoom in). Como reposicionamos o foco da câmera,
// o caminhão aparecerá maior e mais detalhado, sem perder a visão da pista à frente!
const FRUSTUM_SIZE = 52; 
// --- COORDENADAS DINÂMICAS DA CÂMERA ---
const menuCameraPos = new THREE.Vector3(-30, 50, -50); // Câmera perto e dramática no menu
const playCameraPosLeft = new THREE.Vector3(-30, 50, -110); // Diagonal Esquerda padrão
const playCameraPosRight = new THREE.Vector3(30, 50, -110);  // Diagonal Direita espelhada [2]
let isCameraFlipped = false;                              // Flag que monitora a inversão da câmera

// Permite ao main.js alternar a câmera durante a transição
export function setCameraFlippedState(state) {
    isCameraFlipped = state;
}
export function initEngine() {
    // 1. Captura o contêiner do HTML
    const container = document.getElementById('game-container');

    // 2. Cria a cena global e configura a neblina
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#87CEEB'); 

    // 3. Mede o contêiner para definir as dimensões físicas da div quadrada [1]
    const width = container.clientWidth;
    const height = container.clientHeight;
    const aspect = width / height;
    
    // --- CÂMERA DE PERSPECTIVA COM ZOOM CINEMATOGRÁFICO ---
    // Usamos um FOV baixo (14.5) e posicionamos bem recuada para um campo de visão amplo e distante [2]
    camera = new THREE.PerspectiveCamera(14.5, aspect, 1, 1000);
    camera.position.set(-45, 30, -60); 
    camera.lookAt(0, 1.5, 5); 

    // --- CONFIGURAÇÃO DO RENDERIZADOR ---
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height); 
    
    // CORREÇÃO DO BORRADO ("HD"): Ativa a nitidez de acordo com a densidade real de pixels do monitor
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Ativação do mapeamento de sombras macias
    renderer.shadowMap.enabled = true; 
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; 

    renderer.outputColorSpace = THREE.SRGBColorSpace; 
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    
    // ESCURECIMENTO DO ASFALTO: Reduzimos a exposição para maior contraste e cores mais vivas [2]
    renderer.toneMappingExposure = 0.95; 

    container.appendChild(renderer.domElement);

    // --- ILUMINAÇÃO REPOSICIONADA (ACOMPANHANDO A CÂMERA) ---
    // Luz hemisférica mais suave para as sombras laterais ficarem ricas e escuras
    hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x333333, 0.4); 
    scene.add(hemisphereLight);

    // Luz direcional que acompanha o ângulo da câmera
    dirLight = new THREE.DirectionalLight(0xffffff, 1.0); 
    dirLight.position.set(-20, 35, -25);
    dirLight.castShadow = true;
    
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;

    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.camera.top = 30;
    dirLight.shadow.camera.bottom = -30;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 100;

    // Evita artefatos e sombras estranhas na lataria
    dirLight.shadow.bias = -0.0008;

    scene.add(dirLight);

    window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
    const container = document.getElementById('game-container');
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    const aspect = width / height;
    
    // Recalcula as propriedades da câmera de perspectiva no redimensionamento de janela
    camera.aspect = aspect;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
}

// --- SISTEMA DE TREMOR DE TELA (CAMERA SHAKE) ---
let shakeIntensity = 0;
const shakeDecay = 0.9; // Rapidez com que o tremor diminui (0.9 = dissipação suave)

// Dispara o tremor com uma intensidade configurável
export function triggerCameraShake(intensity = 1.0) {
    shakeIntensity = intensity;
}

export function renderEngine(isPlaying) {
    if (renderer && scene && camera) {
        // 1. Define a câmera alvo baseada nos estados de jogo e na transição [2]
        let targetPos = menuCameraPos;
        if (isPlaying) {
            targetPos = isCameraFlipped ? playCameraPosRight : playCameraPosLeft;
        }

        // 2. Interpolação suave (LERP) do ângulo de visão
        camera.position.lerp(targetPos, 0.04); // Deslizamento suave da câmera de um lado para o outro [2]

        // 3. Ajusta o enquadramento (lookAt) de forma dinâmica para compensar o ângulo
        const targetLookX = isCameraFlipped ? 2.5 : 0;
        camera.lookAt(targetLookX, 1.5, 8);

        // 4. Tremor de tela de impacto (colisão)
        if (shakeIntensity > 0.01) {
            camera.position.x += (Math.random() - 0.5) * shakeIntensity;
            camera.position.y += (Math.random() - 0.5) * shakeIntensity;
            camera.position.z += (Math.random() - 0.5) * shakeIntensity;
            shakeIntensity *= shakeDecay;
        }

        renderer.render(scene, camera);
    }
}