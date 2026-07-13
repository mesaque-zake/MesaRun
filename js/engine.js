import * as THREE from 'three';

// Exportando variáveis para que outros arquivos possam usar
export let scene, camera, renderer;

export function initEngine() {
    const container = document.getElementById('game-container');

    // 1. Criar a Cena e definir a cor do céu
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Azul Céu

    // 2. Configurar a Câmera Ortográfica (Visão Isométrica estilo Crossy Road)
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 30; // Controla o "zoom" do jogo
    
    camera = new THREE.OrthographicCamera(
        (frustumSize * aspect) / -2,
        (frustumSize * aspect) / 2,
        frustumSize / 2,
        frustumSize / -2,
        1,
        1000
    );
    
    // Posicionando a câmera no alto, olhando de lado para o centro
    camera.position.set(20, 20, 20);
    camera.lookAt(0, 0, 0);

    // 3. Configurar o Renderizador Gráfico
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true; // Ligando o sistema de sombras
    container.appendChild(renderer.domElement);

    // 4. Configurar a Iluminação
    // Luz ambiente para clarear os modelos de forma geral
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // Luz direcional simulando o Sol (Gera as sombras)
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    
    // Área que a sombra do Sol vai abranger
    dirLight.shadow.camera.left = -20;
    dirLight.shadow.camera.right = 20;
    dirLight.shadow.camera.top = 20;
    dirLight.shadow.camera.bottom = -20;
    scene.add(dirLight);

    // Listener para ajustar o jogo se a pessoa girar o celular ou redimensionar a tela
    window.addEventListener('resize', onWindowResize, false);
}

// Função para corrigir a tela caso seja redimensionada
function onWindowResize() {
    const aspect = window.innerWidth / window.innerHeight;
    const frustumSize = 30;
    
    camera.left = (frustumSize * aspect) / -2;
    camera.right = (frustumSize * aspect) / 2;
    camera.top = frustumSize / 2;
    camera.bottom = frustumSize / -2;
    camera.updateProjectionMatrix();
    
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Função responsável por "tirar a foto" frame a frame
export function render() {
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}
