const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
    gameCode: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        length: 6,
        index: true
    },
    status: {
        type: String,
        enum: ['waiting', 'setup', 'playing', 'finished'],
        default: 'waiting'
    },
    players: [{
        playerId: {
            type: String,
            required: true
        },
        playerNumber: {
            type: Number,
            min: 1,
            max: 2,
            required: true
        },
        ready: {
            type: Boolean,
            default: false
        },
        isConnected: {
            type: Boolean,
            default: true
        },
        lastSeen: {
            type: Date,
            default: Date.now
        }
    }],
    currentTurn: {
        type: Number,
        min: 1,
        max: 2,
        default: 1
    },
    turnCounter: {
        type: Number,
        default: 0
    },
    winner: {
        type: String,
        default: null
    },
    // Ship placements for player 1
    player1Ships: [{
        shipId: {
            type: String,
            enum: ['carrier', 'battleship', 'cruiser', 'submarine', 'destroyer']
        },
        positions: [{
            row: { type: Number, min: 0, max: 9 },
            col: { type: Number, min: 0, max: 9 }
        }],
        orientation: {
            type: String,
            enum: ['horizontal', 'vertical']
        }
    }],
    // Ship placements for player 2
    player2Ships: [{
        shipId: {
            type: String,
            enum: ['carrier', 'battleship', 'cruiser', 'submarine', 'destroyer']
        },
        positions: [{
            row: { type: Number, min: 0, max: 9 },
            col: { type: Number, min: 0, max: 9 }
        }],
        orientation: {
            type: String,
            enum: ['horizontal', 'vertical']
        }
    }],
    // Attack history
    moves: [{
        playerId: String,
        playerNumber: Number,
        row: { type: Number, min: 0, max: 9 },
        col: { type: Number, min: 0, max: 9 },
        result: {
            type: String,
            enum: ['hit', 'miss', 'sunk', 'already_hit']
        },
        shipSunk: String, // Name of ship if sunk
        timestamp: {
            type: Date,
            default: Date.now
        },
        turnNumber: Number
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Indexes for performance
gameSchema.index({ gameCode: 1 });
gameSchema.index({ status: 1, lastUpdated: -1 });
gameSchema.index({ 'players.playerId': 1 });

// Generate unique 6-character game code
gameSchema.statics.generateGameCode = function() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

// Method to check if game is full
gameSchema.methods.isFull = function() {
    return this.players.length >= 2;
};

// Method to get player by playerId
gameSchema.methods.getPlayer = function(playerId) {
    return this.players.find(p => p.playerId === playerId);
};

// Method to get opponent
gameSchema.methods.getOpponent = function(playerId) {
    return this.players.find(p => p.playerId !== playerId);
};

// Update lastUpdated timestamp before saving
gameSchema.pre('save', function() {
    this.lastUpdated = new Date();
});

// Clean up old games (games in 'waiting' status older than 1 hour)
gameSchema.statics.cleanupOldGames = async function() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    await this.deleteMany({
        status: 'waiting',
        createdAt: { $lt: oneHourAgo }
    });
};

const Game = mongoose.model('Game', gameSchema);

module.exports = Game;
