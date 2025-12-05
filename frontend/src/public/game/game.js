import { GameConstants } from './modules/constants.js';
import { GameManager } from './modules/GameManager.js';
import { GameUI } from './modules/GameUI.js';
import { SetupUI } from './modules/SetupUI.js';

// =============================================
// INITIALIZATION
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('Battleship Game Loaded (Modular Version)');
    
    // Initialize game components
    const gameManager = new GameManager();
    const gameUI = new GameUI(gameManager);
    const setupUI = new SetupUI(gameManager);
    
    // Store globally for access
    window.gameManager = gameManager;
    window.gameUI = gameUI;
    window.setupUI = setupUI;
    window.GameConstants = GameConstants;
    
    // Start a new game immediately
    gameManager.startGame('Jugador');
    
    // Show setup screen
    document.getElementById('setup-screen').style.display = 'block';
    document.getElementById('game-screen').style.display = 'none';
    
    setupUI.initializeShipSetup();
    
    console.log('Game ready! Place your ships to start.');
});