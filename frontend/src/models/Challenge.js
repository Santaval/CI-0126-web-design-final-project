const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
    challenger: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    challenged: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'in_progress', 'finished'],
        default: 'pending'
    },
    matchData: {
        type: Object,
        default: null
    },
    winner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    loser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    gameCode: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

// Index for queries
challengeSchema.index({ challenger: 1, challenged: 1 });
challengeSchema.index({ status: 1 });
challengeSchema.index({ createdAt: -1 });

// Method to check if challenge is active
challengeSchema.methods.isActive = function () {
    return ['pending', 'accepted', 'in_progress'].includes(this.status);
};

const Challenge = mongoose.model('Challenge', challengeSchema);

module.exports = Challenge;