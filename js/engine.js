/**
 * js/engine.js
 * Motor Gráfico do MesaRun! (PixiJS v7 + Pixi3D)
 * Configura o Canvas, a câmera ortográfica isométrica e o sistema de luzes.
 */

// Configurações Globais de Proporção do Jogo (Estilo Subway Surfers / Crossy Road)
const GAME_WIDTH = 450;
const GAME_HEIGHT = 800;

const engine = {
    app: null,          // Instância do PixiJS Application
    scene3D: null,      // Camada 3D principal (Pixi3D Stage)
    light: null,        // Luz direcional principal
    isInitialized: false,

    /**
     * Inicializa o canvas do jogo e a projeção de câmera.
     */
    init() {
    if (this.isInitialized) return true;

    if (typeof PIXI === "undefined" || typeof PIXI3D === "undefined") {
        console.error("[Engine] Falha ao inicializar: PIXI ou PIXI3D não foram carregados.");
        return false;
    }

    const holder = document.getElementById("canvas-holder");
    if (!holder) {
        console.error("[Engine] Erro: Elemento 'canvas-holder' não encontrado no HTML.");
        return false;
    }

    // 1. Inicializa a aplicação PixiJS v7
    this.app = new PIXI.Application({
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        backgroundColor: 0x0f172a,
    });

    // Insere o canvas gerado pelo PixiJS na div HTML reservada
    holder.appendChild(this.app.view);

    // 2. Cria a camada 3D principal (Pixi3D)
    this.scene3D = this.app.stage;

    // 3. Configura a Câmera Isométrica (Ortográfica)
    this.setupCamera();

    // 4. Configura as Luzes e Sombras para dar volume aos modelos 3D
    this.setupLighting();

    // 5. Configura a redimensionalização responsiva
    this.setupResize();
    this.resize();

    this.isInitialized = true;
    console.log("[Engine] PixiJS e Pixi3D inicializados com sucesso.");
    return true;
},

    /**
     * Configura a câmera isométrica ortográfica.
     * Alinha a rotação exatamente no ângulo do losango 2:1.
     */
    setupCamera() {
        // Ativa o modo de projeção ortográfica (remove distorção de distância)
        PIXI3D.Camera.main.orthographic = true;

        // Controla o "zoom" da câmera. Quanto menor o número, mais próximos ficam os objetos.
        PIXI3D.Camera.main.orthographicSize = 6.5;

        // Posiciona a câmera flutuando no ar para olhar o cenário de cima
        PIXI3D.Camera.main.position.set(-8, 9, -8);

        // Define a rotação exata da Projeção Isométrica:
        // Rotação Y (Horizontal/Yaw): 45 graus (Math.PI / 4)
        // Rotação X (Vertical/Inclinação/Pitch): 30 graus (aprox. 0.523 radianos)
        // Rotação Z (Roll): 0 graus
        PIXI3D.Camera.main.rotationQuaternion.setEulerAngles(30, 45, 0);
    },

    /**
     * Configura o ambiente de iluminação para destacar as cores e relevos.
     */
    setupLighting() {
        // Criamos uma Luz Direcional (como a luz solar, para projetar sombras e destacar arestas)
        this.light = new PIXI3D.Light();
        this.light.type = PIXI3D.LightType.directional;
        this.light.intensity = 1.4;
        
        // Posiciona a fonte de luz e a inclina para diagonal oposta da câmera
        this.light.position.set(5, 12, 5);
        this.light.rotationQuaternion.setEulerAngles(55, -45, 0);

        // Adiciona a luz ao ambiente global de renderização 3D
        PIXI3D.LightingEnvironment.main.lights.push(this.light);

        // Adiciona uma luz de ambiente sutil para preencher áreas de sombra (evita que fiquem pretas)
        const ambientLight = new PIXI3D.Light();
        ambientLight.type = PIXI3D.LightType.ambient;
        ambientLight.intensity = 0.45;
        PIXI3D.LightingEnvironment.main.lights.push(ambientLight);
    },

    /**
     * Configura o ouvinte de redimensionamento de janela.
     */
    setupResize() {
        window.addEventListener("resize", () => this.resize());
    },

    /**
     * Ajusta o canvas do PixiJS para manter a proporção correta de 9:16 sem distorcer.
     */
    resize() {
        const holder = document.getElementById("canvas-holder");
        if (!holder) return;

        const container = document.getElementById("game-container");
        if (!container) return;

        const width = container.clientWidth;
        const height = container.clientHeight;

        // Ajusta as dimensões lógicas do PixiJS
        this.app.renderer.resize(width, height);

        // Atualiza a escala de renderização interna da câmera para evitar achatamento
        PIXI3D.Camera.main.aspect = width / height;

        // Mantém a escala ortográfica proporcional para que o tamanho dos elementos se ajuste à tela
        PIXI3D.Camera.main.orthographicSize = 6.5 * (GAME_HEIGHT / height);
    }
};
