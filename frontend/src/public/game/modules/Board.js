import { GameConstants } from './constants.js';
import { Ship } from './Ship.js';

// =============================================
// BOARD CLASS
// =============================================
export class Board {
    constructor(size = GameConstants.BOARD_SIZE) {
        this.size = size;
        this.grid = Array(size).fill().map(() => Array(size).fill(null));
        this.ships = [];
        this.misses = [];
        this.hits = [];
    }

    placeShip(ship, startRow, startCol, orientation) {
        if (!this.canPlaceShip(ship, startRow, startCol, orientation)) {
            return false;
        }

        ship.positions = [];
        
        if (orientation === 'horizontal') {
            for (let i = 0; i < ship.size; i++) {
                const col = startCol + i;
                this.grid[startRow][col] = ship;
                ship.positions.push({ row: startRow, col });
            }
        } else {
            for (let i = 0; i < ship.size; i++) {
                const row = startRow + i;
                this.grid[row][startCol] = ship;
                ship.positions.push({ row, col: startCol });
            }
        }

        ship.orientation = orientation;
        this.ships.push(ship);
        return true;
    }

    canPlaceShip(ship, startRow, startCol, orientation) {
        if (startRow < 0 || startRow >= this.size || startCol < 0 || startCol >= this.size) {
            return false;
        }

        if (orientation === 'horizontal') {
            if (startCol + ship.size > this.size) return false;
            for (let i = 0; i < ship.size; i++) {
                if (this.grid[startRow][startCol + i] !== null) return false;
            }
        } else {
            if (startRow + ship.size > this.size) return false;
            for (let i = 0; i < ship.size; i++) {
                if (this.grid[startRow + i][startCol] !== null) return false;
            }
        }

        return true;
    }

    receiveAttack(row, col) {
        if (row < 0 || row >= this.size || col < 0 || col >= this.size) {
            return { result: GameConstants.ATTACK_RESULT.MISS };
        }

        const alreadyHit = this.hits.some(h => h.row === row && h.col === col);
        const alreadyMissed = this.misses.some(m => m.row === row && m.col === col);
        
        if (alreadyHit || alreadyMissed) {
            return { result: GameConstants.ATTACK_RESULT.ALREADY_HIT };
        }

        const cell = this.grid[row][col];
        
        if (cell instanceof Ship) {
            const hit = cell.hit();
            this.hits.push({ row, col });
            
            if (cell.sunk) {
                return {
                    result: GameConstants.ATTACK_RESULT.SUNK,
                    ship: cell
                };
            }
            
            return {
                result: GameConstants.ATTACK_RESULT.HIT,
                ship: cell
            };
        } else {
            this.misses.push({ row, col });
            return { result: GameConstants.ATTACK_RESULT.MISS };
        }
    }

    allShipsSunk() {
        return this.ships.every(ship => ship.sunk);
    }

    getRemainingShips() {
        return this.ships.filter(ship => !ship.sunk);
    }

    reset() {
        this.grid = Array(this.size).fill().map(() => Array(this.size).fill(null));
        this.ships = [];
        this.misses = [];
        this.hits = [];
    }
}
