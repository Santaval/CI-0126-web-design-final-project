// =============================================
// SHIP CLASS
// =============================================
export class Ship {
    constructor(id, name, size) {
        this.id = id;
        this.name = name;
        this.size = size;
        this.hits = 0;
        this.sunk = false;
        this.positions = [];
        this.orientation = 'horizontal';
    }

    hit() {
        this.hits++;
        if (this.hits >= this.size) {
            this.sunk = true;
        }
        return this.sunk;
    }

    isAtPosition(row, col) {
        return this.positions.some(pos => pos.row === row && pos.col === col);
    }
}
