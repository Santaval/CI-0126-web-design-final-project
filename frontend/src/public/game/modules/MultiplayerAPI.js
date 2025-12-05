// =============================================
// MULTIPLAYER API CLIENT
// =============================================
export class MultiplayerAPI {
    constructor(baseURL = '/api/game') {
        this.baseURL = baseURL;
    }

    async createGame(playerName) {
        try {
            const response = await fetch(`${this.baseURL}/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ playerName })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to create game');
            }

            return data;
        } catch (error) {
            console.error('Error creating game:', error);
            throw error;
        }
    }

    async joinGame(gameCode, playerName) {
        try {
            const response = await fetch(`${this.baseURL}/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ gameCode, playerName })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to join game');
            }

            return data;
        } catch (error) {
            console.error('Error joining game:', error);
            throw error;
        }
    }

    async placeShips(gameId, playerId, ships) {
        try {
            const response = await fetch(`${this.baseURL}/place-ships`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ gameId, playerId, ships })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to place ships');
            }

            return data;
        } catch (error) {
            console.error('Error placing ships:', error);
            throw error;
        }
    }

    async attack(gameId, playerId, target) {
        try {
            const response = await fetch(`${this.baseURL}/attack`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ gameId, playerId, target })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to attack');
            }

            return data;
        } catch (error) {
            console.error('Error attacking:', error);
            throw error;
        }
    }

    async getGameState(gameId, playerId) {
        try {
            const response = await fetch(`${this.baseURL}/state/${gameId}`);

            const data = await response.json();

            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to get game state');
            }

            return data;
        } catch (error) {
            console.error('Error getting game state:', error);
            throw error;
        }
    }
}
