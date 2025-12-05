import { GameConstants } from './modules/constants.js';
import { GameManager } from './modules/GameManager.js';
import { GameUI } from './modules/GameUI.js';
import { SetupUI } from './modules/SetupUI.js';
import { MultiplayerManager } from './modules/MultiplayerManager.js';

// =============================================
// GLOBAL STATE
// =============================================
let gameManager;
let gameUI;
let setupUI;
let multiplayerManager;

// Screen elements
let setupScreen;
let gameScreen;

// =============================================
// INITIALIZATION
// =============================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Battleship Multiplayer Game Loaded');
    
    // Initialize components
    gameManager = new GameManager();
    multiplayerManager = new MultiplayerManager(gameManager);
    gameManager.multiplayerManager = multiplayerManager;
    
    gameUI = new GameUI(gameManager);
    setupUI = new SetupUI(gameManager);
    
    // Get screen elements
    setupScreen = document.getElementById('setup-screen');
    gameScreen = document.getElementById('game-screen');
    
    // Store globally for access
    window.gameManager = gameManager;
    window.gameUI = gameUI;
    window.setupUI = setupUI;
    window.multiplayerManager = multiplayerManager;
    window.GameConstants = GameConstants;
    
    // Get challengeId from URL query params
    const urlParams = new URLSearchParams(window.location.search);
    const challengeId = urlParams.get('challengeId');
    
    if (!challengeId) {
        alert('No se encontró el código de desafío. Por favor, accede a través de un enlace válido.');
        return;
    }
    
    // Initialize game session
    try {
        console.log(`Loading game with challenge ID: ${challengeId}`);
        
        // Get user data
        const userData = await getUserData();
        if (!userData) {
            alert('No se pudo obtener la información del usuario. Por favor, inicia sesión nuevamente.');
            window.location.href = '/auth/login';
            return;
        }
        
        // Fetch challenge details to get gameCode
        const challengeData = await fetchChallengeDetails(challengeId);
        
        if (!challengeData || !challengeData.gameCode) {
            alert('No se pudo cargar la información del desafío.');
            return;
        }
        
        // Initialize multiplayer manager with existing game session
        multiplayerManager.initializeFromChallenge(
            challengeData.gameCode,
            userData.id,
            userData.username
        );
        
        // Start polling for game state
        multiplayerManager.startPolling(handleGameStateUpdate);
        
        // Show setup screen initially
        showScreen('setup');
        
        console.log('Game session initialized successfully!');
    } catch (error) {
        console.error('Error initializing game:', error);
        alert('Error al cargar el juego: ' + error.message);
    }
});

// Helper function to get user data
async function getUserData() {
    // Try to get from localStorage first
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
        try {
            const user = JSON.parse(storedUser);
            if (user.id || user._id) {
                return {
                    id: user.id || user._id,
                    username: user.username || user.name || 'Jugador'
                };
            }
        } catch (e) {
            console.error('Error parsing stored user data:', e);
        }
    }
    
    // Try to fetch from API
    try {
        const response = await fetch('/api/auth/me', {
            credentials: 'include'
        });
        if (response.ok) {
            const data = await response.json();
            if (data.user) {
                // Store for future use
                localStorage.setItem('user', JSON.stringify(data.user));
                return {
                    id: data.user._id || data.user.id,
                    username: data.user.username || 'Jugador'
                };
            }
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
    }
    
    return null;
}

// Helper function to fetch challenge details
async function fetchChallengeDetails(challengeId) {
    try {
        const response = await fetch(`/api/challenge/${challengeId}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('No se pudo obtener los detalles del desafío');
        }
        
        const data = await response.json();
        return data.challenge;
    } catch (error) {
        console.error('Error fetching challenge details:', error);
        throw error;
    }
}


// =============================================
// GAME STATE MANAGEMENT
// =============================================
function handleGameStateUpdate(state) {
    console.log('Game state update:', state.gameStatus);
    
    // Update opponent name if available
    if (state.opponentName) {
        multiplayerManager.opponentName = state.opponentName;
        const opponentNameEl = document.getElementById('opponent-name');
        const opponentPlayerNameEl = document.getElementById('opponent-player-name');
        if (opponentNameEl) opponentNameEl.textContent = state.opponentName;
        if (opponentPlayerNameEl) opponentPlayerNameEl.textContent = state.opponentName;
    }
    
    // Handle game setup - initialize game if needed
    if (state.gameStatus === 'setup' && !gameManager.currentGame) {
        // Initialize game
        gameManager.startGame(multiplayerManager.playerName, state.opponentName || 'Oponente');
        
        // Show setup screen and initialize ship setup
        showScreen('setup');
        setupUI.initializeShipSetup();
    }
    
    // Update opponent ready status during setup
    if (state.gameStatus === 'setup') {
        const readyBadge = document.getElementById('opponent-ready-status');
        if (readyBadge) {
            if (state.opponentReady) {
                readyBadge.textContent = '✓ Listo';
                readyBadge.className = 'status-badge ready';
            } else {
                readyBadge.textContent = '⏳ No listo';
                readyBadge.className = 'status-badge not-ready';
            }
        }
    }
    
    // Both players ready - transition to playing
    if (state.gameStatus === 'playing' && getCurrentScreen() !== 'game') {
        console.log('Transitioning to playing state');
        console.log('Full state:', state);
        
        // Make sure game is initialized
        if (!gameManager.currentGame) {
            console.log('Initializing game for playing state');
            gameManager.startGame(multiplayerManager.playerName, state.opponentName || 'Oponente');
        }
        
        // Load ships into the local game if available
        if (gameManager.currentGame && state.yourShips && state.yourShips.length > 0) {
            console.log('Loading your ships into local game:', state.yourShips);
            console.log('Raw ship data:', JSON.stringify(state.yourShips, null, 2));
            try {
                // Transform ship data from backend format to Player.placeShips format
                const transformedShips = state.yourShips.map(ship => {
                    console.log('Processing ship:', ship);
                    if (!ship.positions || ship.positions.length === 0) {
                        console.error('Ship has no positions:', ship);
                        return null;
                    }
                    return {
                        shipId: ship.shipId,
                        startRow: ship.positions[0].row,
                        startCol: ship.positions[0].col,
                        orientation: ship.orientation
                    };
                }).filter(ship => ship !== null);
                
                console.log('Transformed ships:', transformedShips);
                if (transformedShips.length > 0) {
                    gameManager.currentGame.players[0].placeShips(transformedShips);
                    console.log('Ships placed successfully');
                } else {
                    console.error('No valid ships to place');
                }
            } catch (error) {
                console.error('Error placing ships:', error);
            }
        } else {
            console.log('No ships to load. state.yourShips:', state.yourShips);
        }
        
        // Ensure game status is set to PLAYING
        if (gameManager.currentGame) {
            gameManager.currentGame.status = GameConstants.GAME_STATUS.PLAYING;
        }
        
        showScreen('game');
        gameUI.initializeGame();
        gameUI.renderBoards();
    }
    
    // Update game state during play
    if (state.gameStatus === 'playing' && getCurrentScreen() === 'game') {
        // Load ships if not already loaded
        if (gameManager.currentGame && state.yourShips && state.yourShips.length > 0) {
            const player = gameManager.currentGame.players[0];
            const hasShips = player && player.board && player.board.ships && player.board.ships.length > 0;
            
            if (!hasShips) {
                console.log('Loading ships during game update:', state.yourShips);
                console.log('Raw ship data:', JSON.stringify(state.yourShips, null, 2));
                try {
                    // Transform ship data from backend format to Player.placeShips format
                    const transformedShips = state.yourShips.map(ship => {
                        console.log('Processing ship:', ship);
                        if (!ship.positions || ship.positions.length === 0) {
                            console.error('Ship has no positions:', ship);
                            return null;
                        }
                        return {
                            shipId: ship.shipId,
                            startRow: ship.positions[0].row,
                            startCol: ship.positions[0].col,
                            orientation: ship.orientation
                        };
                    }).filter(ship => ship !== null);
                    
                    console.log('Transformed ships:', transformedShips);
                    if (transformedShips.length > 0) {
                        player.placeShips(transformedShips);
                        console.log('Ships loaded successfully, player ships:', player.board.ships);
                        gameUI.renderBoards(); // Force re-render
                    } else {
                        console.error('No valid ships to place');
                    }
                } catch (error) {
                    console.error('Error loading ships:', error);
                }
            }
        }
        
        // Update opponent's moves on player's board
        if (state.opponentMoves && state.opponentMoves.length > 0) {
            gameManager.updateOpponentMoves(state.opponentMoves);
        }
        
        // Update turn indicator
        const statusEl = document.getElementById('player-status');
        if (statusEl) {
            if (state.isYourTurn) {
                statusEl.textContent = '⚔️ Tu turno - ¡Ataca!';
                statusEl.className = 'status-indicator your-turn';
            } else {
                statusEl.textContent = '⏳ Turno del oponente';
                statusEl.className = 'status-indicator opponent-turn';
            }
        }
        
        // Update statistics
        if (state.statistics) {
            const shipsSunkEl = document.getElementById('ships-sunk');
            const oppShipsRemainingEl = document.getElementById('opponent-ships-remaining');
            const playerShipsRemainingEl = document.getElementById('player-ships-remaining');
            const hitsGivenEl = document.getElementById('player-hits-given');
            const hitsTakenEl = document.getElementById('player-hits-taken');
            const attemptsEl = document.getElementById('attempts-count');
            
            if (shipsSunkEl) shipsSunkEl.textContent = `${state.statistics.yourSunkShips.length}/5`;
            if (oppShipsRemainingEl) oppShipsRemainingEl.textContent = state.statistics.opponentShipsRemaining;
            if (playerShipsRemainingEl) playerShipsRemainingEl.textContent = state.statistics.yourShipsRemaining;
            if (hitsGivenEl) hitsGivenEl.textContent = state.statistics.yourHits;
            if (hitsTakenEl) hitsTakenEl.textContent = state.statistics.opponentHits;
            if (attemptsEl) attemptsEl.textContent = state.statistics.yourTotalShots;
        }
        
        // Render boards
        gameUI.renderBoards();
    }
    
    // Game over
    if (state.gameStatus === 'finished' || state.gameOver) {
        multiplayerManager.stopPolling();
        gameUI.showGameOver(state.youWon);
    }
}

// =============================================
// SETUP FUNCTIONS
// =============================================
async function handleStartMultiplayerGame() {
    const placedShips = setupUI.placedShips;
    
    console.log('Attempting to start game with ships:', placedShips);
    
    if (placedShips.length !== 5) {
        alert('Debes colocar todos los barcos primero');
        return;
    }
    
    try {
        console.log('Placing ships in local game...');
        // Place ships in local game
        gameManager.placePlayerShips(placedShips);
        
        console.log('Sending ships to API...');
        console.log('GameId:', multiplayerManager.gameId);
        console.log('PlayerId:', multiplayerManager.playerId);
        
        // Send ships to API
        await multiplayerManager.placeShips(placedShips);
        
        console.log('Ships placed successfully!');
        
        // Show waiting message
        gameUI.showMessage('Barcos colocados. Esperando al oponente...', 'info');
        
        // The game will start automatically when both players are ready
        // via the polling mechanism
        
    } catch (error) {
        console.error('Error placing ships:', error);
        alert('Error al colocar los barcos: ' + error.message);
    }
}

// =============================================
// UTILITY FUNCTIONS
// =============================================
function showScreen(screenName) {
    setupScreen.style.display = 'none';
    gameScreen.style.display = 'none';
    
    switch(screenName) {
        case 'setup':
            setupScreen.style.display = 'block';
            break;
        case 'game':
            gameScreen.style.display = 'block';
            break;
    }
}

function getCurrentScreen() {
    if (setupScreen && setupScreen.style.display !== 'none') return 'setup';
    if (gameScreen && gameScreen.style.display !== 'none') return 'game';
    return null;
}

// Export for global access
window.showScreen = showScreen;
window.handleGameStateUpdate = handleGameStateUpdate;
window.handleStartMultiplayerGame = handleStartMultiplayerGame;