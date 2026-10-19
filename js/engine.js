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
    if (camera) updateShadowWindow();
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

    // Janela de sombra: a aprovada no computador, estendida em tela estreita
    updateShadowWindow();
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
    updateShadowWindow();

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

// =========================================
// JANELA DE SOMBRA
// Computador: a janela aprovada (1024x1024). Tela estreita: estendida até além da borda de cima da tela.
// =========================================
const SHADOW_LIGHT_OFFSET = new THREE.Vector3(-30, 45, 10); // luz em relação ao alvo (o que ficou aprovado)
const SHADOW_TARGET_Z_DEFAULT = 22;
const SHADOW_DEFAULT_Z_LOW = -31;     // trecho de pista que a janela aprovada cobre
const SHADOW_DEFAULT_Z_HIGH = 75;

// Ajustes da janela estendida (tela estreita)
const SHADOW_NARROW_LIGHT_DIST = 90;  // luz mais afastada, na mesma direção: o cenário alto não passa do plano "near"
const SHADOW_NARROW_FAR = 150;
const SHADOW_TEXEL_MIN = 0.12;        // tamanho mínimo do pixel da sombra, em unidades do mundo (aprovado: ~0,1)
const SHADOW_MAP_MAX_W = 2048;
const SHADOW_MAP_MAX_H = 1024;
const SHADOW_SIDE_REACH = 22;         // até onde, ao lado da pista, há cenário que projeta sombra (palpite)
const SHADOW_HEIGHT_REACH = 22;       // altura máxima do cenário (palpite)
const SHADOW_PAD = 6;

const SHADOW_WORLD_UP = new THREE.Vector3(0, 1, 0);
const shadowDir = new THREE.Vector3();
const shadowRight = new THREE.Vector3();
const shadowUp = new THREE.Vector3();
let shadowKey = '';

function setShadowMapSize(w, h) {
    const shadow = dirLight.shadow;
    if (shadow.mapSize.x === w && shadow.mapSize.y === h) return;
    shadow.mapSize.set(w, h);
    // O Three.js só recria o mapa se o antigo for descartado
    if (shadow.map) {
        shadow.map.dispose();
        shadow.map = null;
    }
}

export function updateShadowWindow() {
    if (!dirLight || !camera) return;

    const narrow = camera.aspect < 1 && currentPresetIndex !== 2;
    let zLow = SHADOW_DEFAULT_Z_LOW;
    let zHigh = SHADOW_DEFAULT_Z_HIGH;
    if (narrow) {
        updateVisibleRange();
        zLow = Math.min(zLow, probeBottomZ - 3);
        zHigh = Math.max(zHigh, Math.min(probeTopZ, SPAWN_Z_MAX) + 5);
    }

    const key = narrow ? `${zLow.toFixed(1)}|${zHigh.toFixed(1)}` : 'default';
    if (key === shadowKey) return;
    shadowKey = key;

    const shadow = dirLight.shadow;

    // Computador (e Câmera de Ação): exatamente a janela aprovada
    if (!narrow) {
        dirLight.target.position.set(0, 0, SHADOW_TARGET_Z_DEFAULT);
        dirLight.position.copy(dirLight.target.position).add(SHADOW_LIGHT_OFFSET);
        setShadowMapSize(1024, 1024);
        shadow.camera.left = -50;
        shadow.camera.right = 50;
        shadow.camera.top = 25;
        shadow.camera.bottom = -25;
        shadow.camera.near = 0.5;
        shadow.camera.far = 100;
        shadow.bias = -0.001;
        shadow.normalBias = 0.05;
        shadow.camera.updateProjectionMatrix();
        return;
    }

    // Tela estreita: janela do começo ao topo da tela. A luz anda junto com o alvo, e a direção do sol não muda.
    const span = zHigh - zLow;
    const targetZ = (zLow + zHigh) / 2;

    shadowDir.copy(SHADOW_LIGHT_OFFSET).normalize().negate();        // direção da luz
    shadowRight.crossVectors(shadowDir, SHADOW_WORLD_UP).normalize(); // eixo "esquerda/direita" da câmera de sombra
    shadowUp.crossVectors(shadowRight, shadowDir).normalize();        // eixo "cima/baixo"

    const halfU = Math.abs(shadowRight.z) * span / 2 + Math.abs(shadowRight.x) * SHADOW_SIDE_REACH + SHADOW_PAD;
    const halfV = Math.abs(shadowUp.z) * span / 2 + Math.abs(shadowUp.x) * SHADOW_SIDE_REACH + SHADOW_PAD;
    const topV = halfV + Math.abs(shadowUp.y) * SHADOW_HEIGHT_REACH;

    // Mapa retangular: o mesmo tamanho de pixel nos dois eixos, até o limite do mapa
    const texel = Math.max(SHADOW_TEXEL_MIN, (2 * halfU) / SHADOW_MAP_MAX_W);
    const mapW = Math.min(SHADOW_MAP_MAX_W, Math.ceil((2 * halfU) / texel / 64) * 64);
    const mapH = Math.min(SHADOW_MAP_MAX_H, Math.ceil((halfV + topV) / texel / 64) * 64);

    dirLight.target.position.set(0, 0, targetZ);
    dirLight.position.copy(dirLight.target.position)
        .addScaledVector(shadowDir, -SHADOW_NARROW_LIGHT_DIST);
    setShadowMapSize(mapW, mapH);

    shadow.camera.left = -halfU;
    shadow.camera.right = halfU;
    shadow.camera.bottom = -halfV;
    shadow.camera.top = topV;
    shadow.camera.near = 0.5;
    shadow.camera.far = SHADOW_NARROW_FAR;

    // Pixels maiores pedem um pouco mais de correção; o bias em unidades do mundo continua o mesmo
    shadow.bias = -0.001 * (100 / SHADOW_NARROW_FAR);
    shadow.normalBias = 0.05 * Math.max(1, texel / 0.098);
    shadow.camera.updateProjectionMatrix();
}
// =========================================
// MINIATURAS DOS MODELOS 3D (ícones do Guia e do pop-up)
// Desenha o modelo numa cena separada, com luz própria, e devolve uma imagem transparente.
// A cena do jogo (luz, sombra, cenário) não é tocada.
// =========================================
const THUMB_SIZE = 192;            // pixels do desenho (na tela aparece menor, e o navegador suaviza as bordas)
const THUMB_FILL = 0.95;           // quanto do quadro o modelo ocupa (1 = encosta nas bordas)
const THUMB_ENCODE_SRGB = true;    // se as cores saírem lavadas ou claras demais, troque para false
const THUMB_AMBIENT = 1.4;         // luz geral: se estiver escuro, suba; se estourar, desça
const THUMB_KEY = 2.2;             // luz principal

const thumbScene = new THREE.Scene();
const thumbCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 20);
thumbCamera.position.set(0, 0, 6);
const thumbHolder = new THREE.Group();
const thumbKeyLight = new THREE.DirectionalLight(0xffffff, THUMB_KEY);
thumbKeyLight.position.set(2, 3, 4);
thumbScene.add(new THREE.AmbientLight(0xffffff, THUMB_AMBIENT), thumbKeyLight, thumbHolder);

const thumbBox = new THREE.Box3();
const thumbSizeVec = new THREE.Vector3();
const thumbCenterVec = new THREE.Vector3();
const thumbPrevColor = new THREE.Color();
const thumbBuffer = new Uint8Array(THUMB_SIZE * THUMB_SIZE * 4);
let thumbTarget = null;
let thumbCanvas = null;
let thumbCtx = null;

// O desenho fora da tela sai em luz linear: esta tabela converte para o formato normal de imagem (sRGB)
const thumbEncode = new Uint8Array(256);
for (let i = 0; i < 256; i++) {
    const l = i / 255;
    const s = THUMB_ENCODE_SRGB ? (l <= 0.0031308 ? 12.92 * l : 1.055 * Math.pow(l, 1 / 2.4) - 0.055) : l;
    thumbEncode[i] = Math.round(Math.min(Math.max(s, 0), 1) * 255);
}

// Devolve um endereço de imagem (data URL) ou null se não der. Chamar uma vez por modelo e guardar o resultado.
export function renderModelThumbnail(model) {
    if (!renderer || !model) return null;

    if (!thumbTarget) {
        thumbTarget = new THREE.WebGLRenderTarget(THUMB_SIZE, THUMB_SIZE);
        thumbCanvas = document.createElement('canvas');
        thumbCanvas.width = THUMB_SIZE;
        thumbCanvas.height = THUMB_SIZE;
        thumbCtx = thumbCanvas.getContext('2d');
    }

    // Cópia do modelo, centralizada. O original (usado no jogo) não é mexido
    const clone = model.clone();
    thumbHolder.clear();
    thumbHolder.rotation.set(0, 0, 0);
    thumbHolder.scale.set(1, 1, 1);
    clone.position.set(0, 0, 0);
    thumbHolder.add(clone);
    thumbHolder.updateMatrixWorld(true);

    thumbBox.setFromObject(thumbHolder);
    thumbBox.getCenter(thumbCenterVec);
    thumbBox.getSize(thumbSizeVec);
    clone.position.sub(thumbCenterVec);

    // Escala pelo raio do volume (serve para qualquer ângulo) e gira para uma vista de três quartos
    const radius = Math.max(thumbSizeVec.length() / 2, 0.001);
    thumbHolder.scale.setScalar(THUMB_FILL / radius);
    thumbHolder.rotation.set(0.35, -0.65, 0);

    const prevTarget = renderer.getRenderTarget();
    const prevAlpha = renderer.getClearAlpha();
    renderer.getClearColor(thumbPrevColor);

    try {
        renderer.setRenderTarget(thumbTarget);
        renderer.setClearColor(0x000000, 0); // fundo transparente
        renderer.render(thumbScene, thumbCamera);
        renderer.readRenderTargetPixels(thumbTarget, 0, 0, THUMB_SIZE, THUMB_SIZE, thumbBuffer);
    } finally {
        renderer.setRenderTarget(prevTarget);
        renderer.setClearColor(thumbPrevColor, prevAlpha);
        thumbHolder.clear();
    }

    // A leitura vem de cabeça para baixo: inverte as linhas ao copiar
    const image = thumbCtx.createImageData(THUMB_SIZE, THUMB_SIZE);
    const out = image.data;
    const rowLength = THUMB_SIZE * 4;
    for (let y = 0; y < THUMB_SIZE; y++) {
        const src = (THUMB_SIZE - 1 - y) * rowLength;
        const dst = y * rowLength;
        for (let x = 0; x < rowLength; x += 4) {
            out[dst + x]     = thumbEncode[thumbBuffer[src + x]];
            out[dst + x + 1] = thumbEncode[thumbBuffer[src + x + 1]];
            out[dst + x + 2] = thumbEncode[thumbBuffer[src + x + 2]];
            out[dst + x + 3] = thumbBuffer[src + x + 3];
        }
    }
    thumbCtx.putImageData(image, 0, 0);
    return thumbCanvas.toDataURL('image/png');
}
