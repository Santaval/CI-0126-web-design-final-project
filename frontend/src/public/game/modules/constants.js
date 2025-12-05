// =============================================
// GAME CONSTANTS
// =============================================
export const GameConstants = {
    BOARD_SIZE: 10,
    SHIPS: [
        { id: 'carrier', name: "Portaaviones", size: 5 },
        { id: 'battleship', name: "Acorazado", size: 4 },
        { id: 'cruiser', name: "Crucero", size: 3 },
        { id: 'submarine', name: "Submarino", size: 3 },
        { id: 'destroyer', name: "Destructor", size: 2 }
    ],
    GAME_STATUS: {
        SETUP: 'setup',
        PLAYING: 'playing',
        FINISHED: 'finished'
    },
    ATTACK_RESULT: {
        HIT: 'hit',
        MISS: 'miss',
        SUNK: 'sunk',
        ALREADY_HIT: 'already_hit'
    }
};
