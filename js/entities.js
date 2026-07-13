import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export let truckModel = null;
const loader = new GLTFLoader();

export function createEntities(scene) {
    // Vamos carregar o caminhão!
    loader.load(
        'assets/model/cars/mycar/delivery.glb',
        function (gltf) {
            truckModel = gltf.scene;
            
            // Corrige o tamanho do caminhão do Kenney para o nosso mundo
            truckModel.scale.set(0.5, 0.5, 0.5); 
            
            // Posiciona ele na faixa central (x: 0), no nível do chão (y: 0)
            truckModel.position.set(0, 0, 0); 
            
            // Faz o modelo fazer e receber sombras
            truckModel.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            scene.add(truckModel);
            console.log("Caminhão carregado com sucesso!");
        },
        undefined, // Não precisamos da barra de progresso por enquanto
        function (error) {
            console.error('Erro ao carregar o caminhão: ', error);
        }
    );
}
