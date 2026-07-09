/**
 * js/api.js
 * Módulo de comunicação de dados do MesaRun!
 * Gerencia a gravação local (localStorage) e a sincronização opcional com o Google Sheets.
 */

// Cole a URL do seu Web App do Google Apps Script aqui quando decidir ativar o Sheets.
// Se mantido vazio (''), o jogo funcionará em modo offline/local automaticamente.
const GOOGLE_SCRIPT_URL = '';

const api = {
    // Lista de motoristas padrão utilizada caso o jogo esteja rodando em modo offline
    offlinePlayers: [
        { id: "motorista_01", nome: "Carlos Silva", funcao: "Motorista Sesc SP", icon: "truck" },
        { id: "motorista_02", nome: "Ana Santos", funcao: "Auxiliar de Rota", icon: "user" },
        { id: "motorista_03", nome: "Marcos Souza", funcao: "Voluntário Mesa", icon: "heart" }
    ],

    /**
     * Busca a lista de motoristas cadastrados.
     * @returns {Promise<Array>} Lista de jogadores
     */
    async fetchPlayers() {
        if (!GOOGLE_SCRIPT_URL) {
            console.log("[API] Rodando em modo offline. Carregando motoristas padrão.");
            return this.offlinePlayers;
        }

        try {
            const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getPlayers`);
            if (!response.ok) throw new Error("Erro na requisição ao Sheets.");
            const data = await response.json();
            return data;
        } catch (error) {
            console.warn("[API] Falha ao conectar ao Sheets. Usando motoristas offline.", error);
            return this.offlinePlayers;
        }
    },

    /**
     * Recupera o recorde pessoal de um motorista salvo localmente no navegador.
     * @param {string} playerId ID do motorista
     * @returns {number} Melhor pontuação registrada
     */
    getLocalBestScore(playerId) {
        const score = localStorage.getItem(`mesarun_best_${playerId}`);
        return score ? parseInt(score, 10) : 0;
    },

    /**
     * Salva localmente o recorde do motorista caso a pontuação atual seja maior.
     * @param {string} playerId ID do motorista
     * @param {number} newScore Nova pontuação obtida
     * @returns {boolean} Retorna verdadeiro se um novo recorde local foi batido
     */
    saveLocalBestScore(playerId, newScore) {
        const currentBest = this.getLocalBestScore(playerId);
        if (newScore > currentBest) {
            localStorage.setItem(`mesarun_best_${playerId}`, newScore.toString());
            return true;
        }
        return false;
    },

    /**
     * Envia a pontuação para gravação local e tenta sincronizar com o Google Sheets.
     * @param {string} playerId ID do motorista
     * @param {number} score Pontuação obtida
     * @returns {Promise<{success: boolean, isNewRecord: boolean, error?: string}>}
     */
    async submitScore(playerId, score) {
        // 1. Grava localmente primeiro (Garante que o dado não se perca se estiver sem internet)
        const isNewLocalRecord = this.saveLocalBestScore(playerId, score);
        const bestScore = this.getLocalBestScore(playerId);

        // Se não tiver API do Google configurada, encerra o fluxo com sucesso local
        if (!GOOGLE_SCRIPT_URL) {
            return {
                success: true,
                isNewRecord: isNewLocalRecord,
                bestScore: bestScore
            };
        }

        // 2. Tenta sincronizar com o Google Sheets em segundo plano
        try {
            const payload = {
                playerId: playerId,
                score: score
            };

            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: "POST",
                mode: "cors",
                headers: {
                    "Content-Type": "text/plain;charset=utf-8" // Evita problemas de pre-flight CORS no GAS
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error("Erro na gravação remota.");
            
            const result = await response.json();
            return {
                success: true,
                isNewRecord: result.isNewRecord, // Resposta do servidor se bateu o recorde global
                bestScore: result.bestScore
            };

        } catch (error) {
            console.error("[API] Falha ao sincronizar pontuação com o servidor.", error);
            return {
                success: false,
                isNewRecord: isNewLocalRecord,
                bestScore: bestScore,
                error: "Pontuação salva apenas no dispositivo. Sem conexão com o servidor."
            };
        }
    }
};
