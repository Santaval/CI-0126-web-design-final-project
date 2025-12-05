import { GameConstants } from './constants.js';
import { Board } from './Board.js';
import { Ship } from './Ship.js';

// =============================================
// PLAYER CLASS
// =============================================
export class Player {
    constructor(name) {
        this.name = name;
        this.board = new Board();
        this.attackBoard = new Board();
        this.ready = false;
        this.score = 0;
    }

    placeShipsRandomly() {
        const ships = GameConstants.SHIPS.map(shipConfig => 
            new Ship(shipConfig.id, shipConfig.name, shipConfig.size)
        );

        for (const ship of ships) {
            let placed = false;
            let attempts = 0;

            while (!placed && attempts < 100) {
                const orientation = Math.random() > 0.5 ? 'horizontal' : 'vertical';
                const maxRow = orientation === 'vertical' ? 
                    GameConstants.BOARD_SIZE - ship.size : 
                    GameConstants.BOARD_SIZE - 1;
                const maxCol = orientation === 'horizontal' ? 
                    GameConstants.BOARD_SIZE - ship.size : 
                    GameConstants.BOARD_SIZE - 1;

                const startRow = Math.floor(Math.random() * (maxRow + 1));
                const startCol = Math.floor(Math.random() * (maxCol + 1));

                if (this.board.canPlaceShip(ship, startRow, startCol, orientation)) {
                    this.board.placeShip(ship, startRow, startCol, orientation);
                    placed = true;
                }
                attempts++;
            }
        }

        this.ready = true;
    }

    placeShips(shipPlacements) {
        for (const placement of shipPlacements) {
            const shipConfig = GameConstants.SHIPS.find(s => s.id === placement.shipId);
            if (shipConfig) {
                const ship = new Ship(shipConfig.id, shipConfig.name, shipConfig.size);
                this.board.placeShip(ship, placement.startRow, placement.startCol, placement.orientation);
            }
        }
        this.ready = true;
    }

    makeAttack(row, col, opponentBoard) {
        const result = opponentBoard.receiveAttack(row, col);
        
        if (result.result === GameConstants.ATTACK_RESULT.HIT || 
            result.result === GameConstants.ATTACK_RESULT.SUNK) {
            this.attackBoard.grid[row][col] = 'hit';
        } else if (result.result === GameConstants.ATTACK_RESULT.MISS) {
            this.attackBoard.grid[row][col] = 'miss';
        }

        return result;
    }
}
