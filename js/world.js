import * as THREE from 'three';

// Variáveis da Pista
export let roadGroup;
let dashedLines = []; // Guardamos as linhas para animá-las

// Tamanhos Padrões
const ROAD_WIDTH = 12; // Largura total do asfalto
const ROAD_LENGTH = 100; // Profundidade da esteira
const SPEED = 0.5; // Velocidade do jogo

export function createWorld(scene) {
    roadGroup = new THREE.Group();

    // 1. O Asfalto Principal (Cinza Escuro)
    const roadGeometry = new THREE.PlaneGeometry(ROAD_WIDTH, ROAD_LENGTH);
    const roadMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x333333, // Cor do asfalto
        roughness: 0.8
    });
    const road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2; // Deita o plano no chão
    road.receiveShadow = true;
    roadGroup.add(road);

    // 2. Pintando as Linhas Tracejadas (Para separar as 3 faixas)
    // Temos 3 faixas, logo precisamos de 2 linhas divisórias
    const lineXPositions = [-ROAD_WIDTH / 6, ROAD_WIDTH / 6]; 
    
    const lineGeometry = new THREE.PlaneGeometry(0.3, 3); // Largura x Comprimento do traço
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    // Criamos vários traços de cima a baixo na pista
    for (let x of lineXPositions) {
        for (let z = -ROAD_LENGTH / 2; z < ROAD_LENGTH / 2; z += 6) {
            const line = new THREE.Mesh(lineGeometry, lineMaterial);
            line.rotation.x = -Math.PI / 2;
            line.position.set(x, 0.05, z); // 0.05 para não bugar com o asfalto (Z-fighting)
            roadGroup.add(line);
            dashedLines.push(line);
        }
    }

    scene.add(roadGroup);
}

// Essa função roda 60 vezes por segundo para rolar a esteira
export function updateWorld() {
    if (!roadGroup) return;

    // Move as linhas brancas em direção à câmera
    dashedLines.forEach(line => {
        line.position.z += SPEED;
        
        // Se a linha passou do fundo da tela, teletransporta ela pro começo
        if (line.position.z > ROAD_LENGTH / 2) {
            line.position.z -= ROAD_LENGTH;
        }
    });
}
