import { MultiplayerAPI } from './MultiplayerAPI.js';
import { GameConstants } from './constants.js';

// =============================================
// MULTIPLAYER MANAGER CLASS
// =============================================
export class MultiplayerManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.api = new MultiplayerAPI();
        
        // Game session data
        this.gameId = null;
        this.playerId = null;
        this.playerNumber = null;
        this.playerName = null;
        this.gameCode = null;
        this.opponentName = null;
        
        // Polling
        this.pollingInterval = null;
        this.pollingRate = 2000; // 2 seconds
        
        // State
        this.isWaitingForOpponent = false;
        this.isGameActive = false;
    }

    /**
     * Initialize game session from existing challenge
     * Used when user already joined via challenge system
     */
    initializeFromChallenge(gameCode, playerId, playerName) {
        this.gameCode = gameCode;
        this.gameId = gameCode; // Use gameCode as gameId
        this.playerId = playerId;
        this.playerName = playerName;
        this.isWaitingForOpponent = false;
        
        console.log(`Initialized game session - GameCode: ${gameCode}, PlayerId: ${playerId}`);
    }

    async createGame(playerName) {
        try {
            const response = await this.api.createGame(playerName);
            
            this.gameId = response.gameId;
            this.playerId = response.playerId;
            this.playerNumber = response.playerNumber;
            this.playerName = playerName;
            this.gameCode = response.gameCode;
            this.isWaitingForOpponent = true;
            
            console.log(`Game created: ${this.gameCode}`);
            return response;
        } catch (error) {
            throw error;
        }
    }

    async joinGame(gameCode, playerName) {
        try {
            const response = await this.api.joinGame(gameCode, playerName);
            
            this.gameId = response.gameId;
            this.playerId = response.playerId;
            this.playerNumber = response.playerNumber;
            this.playerName = playerName;
            this.gameCode = response.gameCode;
            this.opponentName = response.opponentName;
            this.isWaitingForOpponent = false;
            
            console.log(`Joined game: ${this.gameCode}`);
            return response;
        } catch (error) {
            throw error;
        }
    }

    async placeShips(ships) {
        try {
            console.log('Raw ships received:', ships);
            
            // Convert ships to API format
            const formattedShips = ships.map(ship => ({
                type: ship.id,  // Use 'id' instead of 'type'
                position: {
                    row: ship.positions[0].row,  // First position is the ship's starting point
                    col: ship.positions[0].col
                },
                orientation: ship.orientation
            }));

            console.log('Formatted ships:', formattedShips);

            const response = await this.api.placeShips(
                this.gameId,
                this.playerId,
                formattedShips
            );
            
            console.log('Ships placed:', response);
            return response;
        } catch (error) {
            throw error;
        }
    }

    async attack(row, col) {
        try {
            const response = await this.api.attack(
                this.gameId,
                this.playerId,
                { row, col }
            );
            
            console.log('Attack result:', response);
            return response;
        } catch (error) {
            throw error;
        }
    }

    async getGameState() {
        try {
            const state = await this.api.getGameState(this.gameId, this.playerId);
            return state;
        } catch (error) {
            console.error('Error getting game state:', error);
            throw error;
        }
    }

    startPolling(callback) {
        if (this.pollingInterval) {
            this.stopPolling();
        }

        // Initial poll
        this.pollGameState(callback);

        // Set up interval
        this.pollingInterval = setInterval(() => {
            this.pollGameState(callback);
        }, this.pollingRate);

        console.log('Started polling game state');
    }

    async pollGameState(callback) {
        try {
            const state = await this.getGameState();
            if (callback) {
                callback(state);
            }
        } catch (error) {
            console.error('Polling error:', error);
        }
    }

    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
            console.log('Stopped polling game state');
        }
    }

    reset() {
        this.stopPolling();
        this.gameId = null;
        this.playerId = null;
        this.playerNumber = null;
        this.playerName = null;
        this.gameCode = null;
        this.opponentName = null;
        this.isWaitingForOpponent = false;
        this.isGameActive = false;
    }

    isMyTurn(gameState) {
        return gameState.isYourTurn;
    }

    getOpponentName(gameState) {
        return gameState.opponentName || 'Oponente';
    }
}
