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
let lobbyScreen;
let waitingScreen;
let setupScreen;
let gameScreen;

// =============================================
// INITIALIZATION
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('Battleship Multiplayer Game Loaded');
    
    // Initialize components
    gameManager = new GameManager();
    multiplayerManager = new MultiplayerManager(gameManager);
    gameManager.multiplayerManager = multiplayerManager;
    
    gameUI = new GameUI(gameManager);
    setupUI = new SetupUI(gameManager);
    
    // Get screen elements
    lobbyScreen = document.getElementById('lobby-screen');
    waitingScreen = document.getElementById('waiting-screen');
    setupScreen = document.getElementById('setup-screen');
    gameScreen = document.getElementById('game-screen');
    
    // Store globally for access
    window.gameManager = gameManager;
    window.gameUI = gameUI;
    window.setupUI = setupUI;
    window.multiplayerManager = multiplayerManager;
    window.GameConstants = GameConstants;
    
    // Initialize lobby UI
    initializeLobby();
    
    // Show lobby screen
    showScreen('lobby');
    
    console.log('Ready to create or join a game!');
});

// =============================================
// LOBBY FUNCTIONS
// =============================================
function initializeLobby() {
    // Create game button
    document.getElementById('create-game-btn').addEventListener('click', handleCreateGame);
    
    // Join game button
    document.getElementById('join-game-btn').addEventListener('click', handleJoinGame);
    
    // Enter key handlers
    document.getElementById('create-player-name').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleCreateGame();
    });
    
    document.getElementById('join-game-code').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleJoinGame();
    });
    
    // Cancel waiting button
    document.getElementById('cancel-waiting-btn').addEventListener('click', handleCancelWaiting);
    
    // Copy code button
    document.getElementById('copy-code-btn').addEventListener('click', handleCopyCode);
}

async function handleCreateGame() {
    const playerName = document.getElementById('create-player-name').value.trim();
    
    if (!playerName) {
        showLobbyMessage('Por favor ingresa tu nombre', 'error');
        return;
    }
    
    try {
        showLobbyMessage('Creando sala...', 'info');
        
        const response = await multiplayerManager.createGame(playerName);
        
        // Show waiting screen
        document.getElementById('display-game-code').textContent = response.gameCode;
        showScreen('waiting');
        
        // Start polling for opponent
        multiplayerManager.startPolling(handleGameStateUpdate);
        
    } catch (error) {
        showLobbyMessage('Error al crear la sala: ' + error.message, 'error');
    }
}

async function handleJoinGame() {
    const playerName = document.getElementById('join-player-name').value.trim();
    const gameCode = document.getElementById('join-game-code').value.trim().toUpperCase();
    
    if (!playerName) {
        showLobbyMessage('Por favor ingresa tu nombre', 'error');
        return;
    }
    
    if (!gameCode) {
        showLobbyMessage('Por favor ingresa el código de sala', 'error');
        return;
    }
    
    try {
        showLobbyMessage('Uniéndose a la sala...', 'info');
        
        const response = await multiplayerManager.joinGame(gameCode, playerName);
        
        // Initialize game
        gameManager.startGame(playerName, response.opponentName);
        
        // Show setup screen
        showScreen('setup');
        setupUI.initializeShipSetup();
        
        // Update opponent info
        document.getElementById('opponent-name').textContent = response.opponentName;
        
        // Start polling
        multiplayerManager.startPolling(handleGameStateUpdate);
        
    } catch (error) {
        showLobbyMessage('Error al unirse: ' + error.message, 'error');
    }
}

function handleCancelWaiting() {
    multiplayerManager.reset();
    showScreen('lobby');
    showLobbyMessage('', '');
}

function handleCopyCode() {
    const code = document.getElementById('display-game-code').textContent;
    navigator.clipboard.writeText(code).then(() => {
        const btn = document.getElementById('copy-code-btn');
        const originalText = btn.textContent;
        btn.textContent = '✓ Copiado!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    });
}

function showLobbyMessage(message, type) {
    const messageEl = document.getElementById('lobby-message');
    messageEl.textContent = message;
    messageEl.className = 'lobby-message ' + type;
}

// =============================================
// GAME STATE MANAGEMENT
// =============================================
function handleGameStateUpdate(state) {
    console.log('Game state update:', state.gameStatus);
    
    // Update opponent name if available
    if (state.opponentName) {
        multiplayerManager.opponentName = state.opponentName;
        document.getElementById('opponent-name').textContent = state.opponentName;
        document.getElementById('opponent-player-name').textContent = state.opponentName;
    }
    
    // Handle waiting for opponent
    if (state.gameStatus === 'waiting' && multiplayerManager.isWaitingForOpponent) {
        // Still waiting...
        return;
    }
    
    // Opponent joined - transition to setup
    if (state.gameStatus === 'setup' && multiplayerManager.isWaitingForOpponent) {
        multiplayerManager.isWaitingForOpponent = false;
        
        // Initialize game
        gameManager.startGame(multiplayerManager.playerName, state.opponentName);
        
        // Show setup screen
        showScreen('setup');
        setupUI.initializeShipSetup();
        
        return;
    }
    
    // Update opponent ready status during setup
    if (state.gameStatus === 'setup') {
        const readyBadge = document.getElementById('opponent-ready-status');
        if (state.opponentReady) {
            readyBadge.textContent = '✓ Listo';
            readyBadge.className = 'status-badge ready';
        } else {
            readyBadge.textContent = '⏳ No listo';
            readyBadge.className = 'status-badge not-ready';
        }
    }
    
    // Both players ready - transition to playing
    if (state.gameStatus === 'playing' && getCurrentScreen() !== 'game') {
        showScreen('game');
        gameUI.initializeGame();
        gameUI.renderBoards();
    }
    
    // Update game state during play
    if (state.gameStatus === 'playing' && getCurrentScreen() === 'game') {
        // Update opponent's moves on player's board
        if (state.opponentMoves && state.opponentMoves.length > 0) {
            gameManager.updateOpponentMoves(state.opponentMoves);
        }
        
        // Update turn indicator
        const statusEl = document.getElementById('player-status');
        if (state.isYourTurn) {
            statusEl.textContent = '⚔️ Tu turno - ¡Ataca!';
            statusEl.className = 'status-indicator your-turn';
        } else {
            statusEl.textContent = '⏳ Turno del oponente';
            statusEl.className = 'status-indicator opponent-turn';
        }
        
        // Update statistics
        if (state.statistics) {
            document.getElementById('ships-sunk').textContent = 
                `${state.statistics.yourSunkShips.length}/5`;
            document.getElementById('opponent-ships-remaining').textContent = 
                5 - state.statistics.yourSunkShips.length;
            document.getElementById('player-ships-remaining').textContent = 
                5 - state.statistics.opponentSunkShips.length;
            document.getElementById('player-hits-given').textContent = 
                state.statistics.yourHits;
            document.getElementById('player-hits-taken').textContent = 
                state.statistics.opponentHits;
            document.getElementById('attempts-count').textContent = 
                state.statistics.yourTotalShots;
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
// Override the start game button to handle multiplayer
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const startBtn = document.getElementById('start-game-btn');
        if (startBtn) {
            // Remove old listeners by cloning
            const newBtn = startBtn.cloneNode(true);
            startBtn.parentNode.replaceChild(newBtn, startBtn);
            
            newBtn.addEventListener('click', handleStartMultiplayerGame);
        }
    }, 100);
});

async function handleStartMultiplayerGame() {
    const placedShips = setupUI.placedShips;
    
    if (placedShips.length !== 5) {
        alert('Debes colocar todos los barcos primero');
        return;
    }
    
    try {
        // Place ships in local game
        gameManager.placePlayerShips(placedShips);
        
        // Send ships to API
        await multiplayerManager.placeShips(placedShips);
        
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
    lobbyScreen.style.display = 'none';
    waitingScreen.style.display = 'none';
    setupScreen.style.display = 'none';
    gameScreen.style.display = 'none';
    
    switch(screenName) {
        case 'lobby':
            lobbyScreen.style.display = 'block';
            break;
        case 'waiting':
            waitingScreen.style.display = 'block';
            break;
        case 'setup':
            setupScreen.style.display = 'block';
            break;
        case 'game':
            gameScreen.style.display = 'block';
            break;
    }
}

function getCurrentScreen() {
    if (lobbyScreen.style.display !== 'none') return 'lobby';
    if (waitingScreen.style.display !== 'none') return 'waiting';
    if (setupScreen.style.display !== 'none') return 'setup';
    if (gameScreen.style.display !== 'none') return 'game';
    return null;
}

// Export for global access
window.showScreen = showScreen;
window.handleGameStateUpdate = handleGameStateUpdate;
