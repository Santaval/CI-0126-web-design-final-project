import { GameConstants } from './constants.js';
import { Board } from './Board.js';
import { Player } from './Player.js';

// =============================================
// SETUP UI CLASS
// =============================================
export class SetupUI {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.orientation = 'horizontal';
        this.placedShips = [];
        this.draggingShip = null;
        this.init();
    }

    init() {
        this.cacheElements();
        this.bindEvents();
    }

    cacheElements() {
        this.elements = {
            setupScreen: document.getElementById('setup-screen'),
            shipsPool: document.getElementById('ships-pool'),
            setupBoard: document.getElementById('setup-board'),
            toggleOrientationBtn: document.getElementById('toggle-orientation-btn'),
            randomPlaceBtn: document.getElementById('random-place-btn'),
            clearShipsBtn: document.getElementById('clear-ships-btn'),
            startGameBtn: document.getElementById('start-game-btn'),
            orientationText: document.getElementById('orientation-text'),
            setupProgress: document.getElementById('setup-progress'),
            shipsPlacedCount: document.getElementById('ships-placed-count')
        };
    }

    bindEvents() {
        this.elements.toggleOrientationBtn?.addEventListener('click', () => this.toggleOrientation());
        this.elements.randomPlaceBtn?.addEventListener('click', () => this.placeShipsRandomly());
        this.elements.clearShipsBtn?.addEventListener('click', () => this.clearAllShips());
        this.elements.startGameBtn?.addEventListener('click', () => this.startGame());
    }

    initializeShipSetup() {
        if (!this.elements.shipsPool || !this.elements.setupBoard) return;
        
        this.elements.shipsPool.innerHTML = '';
        this.elements.setupBoard.innerHTML = '';
        this.placedShips = [];

        // Create ship elements
        GameConstants.SHIPS.forEach(shipConfig => {
            const shipElement = document.createElement('div');
            shipElement.className = 'ship-to-place';
            shipElement.textContent = `${shipConfig.name} (${shipConfig.size})`;
            shipElement.dataset.id = shipConfig.id;
            shipElement.dataset.size = shipConfig.size;
            shipElement.dataset.name = shipConfig.name;
            shipElement.draggable = true;

            shipElement.addEventListener('dragstart', (e) => {
                this.draggingShip = {
                    id: shipConfig.id,
                    size: shipConfig.size,
                    name: shipConfig.name
                };
                shipElement.classList.add('dragging');
            });

            shipElement.addEventListener('dragend', () => {
                this.draggingShip = null;
                shipElement.classList.remove('dragging');
            });

            this.elements.shipsPool.appendChild(shipElement);
        });

        // Create board cells
        for (let row = 0; row < GameConstants.BOARD_SIZE; row++) {
            for (let col = 0; col < GameConstants.BOARD_SIZE; col++) {
                const cell = document.createElement('div');
                cell.className = 'setup-cell';
                cell.dataset.row = row;
                cell.dataset.col = col;

                cell.addEventListener('dragover', (e) => this.handleDragOver(e, row, col));
                cell.addEventListener('dragleave', (e) => this.handleDragLeave(e));
                cell.addEventListener('drop', (e) => this.handleDrop(e, row, col));

                this.elements.setupBoard.appendChild(cell);
            }
        }

        this.updateStartButton();
    }

    toggleOrientation() {
        this.orientation = this.orientation === 'horizontal' ? 'vertical' : 'horizontal';
        if (this.elements.orientationText) {
            this.elements.orientationText.textContent = this.orientation === 'horizontal' ? 'Horizontal' : 'Vertical';
        }
    }

    handleDragOver(e, row, col) {
        e.preventDefault();
        if (!this.draggingShip) return;

        this.clearDropHighlights();

        if (this.canPlaceShipAt(row, col, this.draggingShip.size, this.orientation)) {
            this.highlightValidCells(row, col, this.draggingShip.size, this.orientation);
        } else {
            this.highlightInvalidCells(row, col, this.draggingShip.size, this.orientation);
        }
    }

    handleDragLeave(e) {
        e.target.classList.remove('valid-drop', 'invalid-drop');
    }

    handleDrop(e, row, col) {
        e.preventDefault();
        if (!this.draggingShip) return;

        if (this.canPlaceShipAt(row, col, this.draggingShip.size, this.orientation)) {
            this.placeShip(row, col, this.draggingShip, this.orientation);
        }

        this.clearDropHighlights();
        this.updateStartButton();
    }

    canPlaceShipAt(startRow, startCol, size, orientation) {
        if (orientation === 'horizontal') {
            if (startCol + size > GameConstants.BOARD_SIZE) return false;
            for (let i = 0; i < size; i++) {
                if (this.isCellOccupied(startRow, startCol + i)) return false;
            }
        } else {
            if (startRow + size > GameConstants.BOARD_SIZE) return false;
            for (let i = 0; i < size; i++) {
                if (this.isCellOccupied(startRow + i, startCol)) return false;
            }
        }
        return true;
    }

    isCellOccupied(row, col) {
        return this.placedShips.some(ship => 
            ship.positions.some(pos => pos.row === row && pos.col === col)
        );
    }

    highlightValidCells(startRow, startCol, size, orientation) {
        if (orientation === 'horizontal') {
            for (let i = 0; i < size; i++) {
                const cell = this.getCellElement(startRow, startCol + i);
                if (cell) cell.classList.add('valid-drop');
            }
        } else {
            for (let i = 0; i < size; i++) {
                const cell = this.getCellElement(startRow + i, startCol);
                if (cell) cell.classList.add('valid-drop');
            }
        }
    }

    highlightInvalidCells(startRow, startCol, size, orientation) {
        if (orientation === 'horizontal') {
            for (let i = 0; i < size; i++) {
                const cell = this.getCellElement(startRow, startCol + i);
                if (cell) cell.classList.add('invalid-drop');
            }
        } else {
            for (let i = 0; i < size; i++) {
                const cell = this.getCellElement(startRow + i, startCol);
                if (cell) cell.classList.add('invalid-drop');
            }
        }
    }

    clearDropHighlights() {
        document.querySelectorAll('.setup-cell').forEach(cell => {
            cell.classList.remove('valid-drop', 'invalid-drop');
        });
    }

    getCellElement(row, col) {
        return document.querySelector(`.setup-cell[data-row="${row}"][data-col="${col}"]`);
    }

    placeShip(startRow, startCol, shipData, orientation) {
        const positions = [];
        
        if (orientation === 'horizontal') {
            for (let i = 0; i < shipData.size; i++) {
                positions.push({ row: startRow, col: startCol + i });
            }
        } else {
            for (let i = 0; i < shipData.size; i++) {
                positions.push({ row: startRow + i, col: startCol });
            }
        }

        this.placedShips.push({
            id: shipData.id,
            size: shipData.size,
            name: shipData.name,
            positions: positions,
            orientation: orientation
        });

        positions.forEach(pos => {
            const cell = this.getCellElement(pos.row, pos.col);
            if (cell) {
                cell.classList.add('has-ship');
                cell.textContent = '⛵';
            }
        });

        const shipElement = document.querySelector(`.ship-to-place[data-id="${shipData.id}"]`);
        if (shipElement) {
            shipElement.classList.add('placed');
            shipElement.draggable = false;
        }
    }

    placeShipsRandomly() {
        this.clearAllShips();

        const board = new Board();
        const tempPlayer = new Player('Temp');
        tempPlayer.placeShipsRandomly();

        tempPlayer.board.ships.forEach(ship => {
            const shipConfig = GameConstants.SHIPS.find(s => s.name === ship.name);
            if (shipConfig) {
                const startPos = ship.positions[0];
                this.placeShip(startPos.row, startPos.col, shipConfig, ship.orientation);
            }
        });

        this.updateStartButton();
    }

    clearAllShips() {
        this.placedShips = [];
        
        document.querySelectorAll('.setup-cell').forEach(cell => {
            cell.classList.remove('has-ship');
            cell.textContent = '';
        });
        
        document.querySelectorAll('.ship-to-place').forEach(ship => {
            ship.classList.remove('placed');
            ship.draggable = true;
        });
        
        this.updateStartButton();
    }

    updateStartButton() {
        const allShipsPlaced = GameConstants.SHIPS.length === this.placedShips.length;
        if (this.elements.startGameBtn) {
            this.elements.startGameBtn.disabled = !allShipsPlaced;
        }
        
        if (this.elements.setupProgress) {
            this.elements.setupProgress.style.width = `${(this.placedShips.length / GameConstants.SHIPS.length) * 100}%`;
        }
        
        if (this.elements.shipsPlacedCount) {
            this.elements.shipsPlacedCount.textContent = `${this.placedShips.length}/${GameConstants.SHIPS.length} barcos colocados`;
        }
    }

    getShipPlacements() {
        return this.placedShips.map(ship => ({
            shipId: ship.id,
            startRow: ship.positions[0].row,
            startCol: ship.positions[0].col,
            orientation: ship.orientation
        }));
    }

    startGame() {
        const shipPlacements = this.getShipPlacements();
        
        this.gameManager.placePlayerShips(shipPlacements);
        
        if (window.gameUI) {
            window.gameUI.showGameScreen(this.gameManager.currentGame);
        }
    }
}
