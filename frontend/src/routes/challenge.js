const express = require('express');
const router = express.Router();
const Challenge = require('../models/Challenge');
const User = require('../models/User');
const gameService = require('../services/gameService');

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  next();
};

// Get all available players (exclude current user and those with active challenges)
router.get('/players', requireAuth, async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // Find all active challenges involving current user
    const activeChallenges = await Challenge.find({
      $or: [
        { challenger: currentUserId },
        { challenged: currentUserId }
      ],
      status: { $in: ['pending', 'accepted', 'in_progress'] }
    });

    // Get IDs of users involved in active challenges
    const busyUserIds = new Set();
    activeChallenges.forEach(challenge => {
      busyUserIds.add(challenge.challenger.toString());
      busyUserIds.add(challenge.challenged.toString());
    });

    // Get all users except current user
    const allUsers = await User.find({ _id: { $ne: currentUserId } })
      .select('username email imageUrl')
      .sort({ username: 1 });

    // Add challenge status for each user
    const playersWithStatus = await Promise.all(allUsers.map(async (user) => {
      // Check if there's any challenge between current user and this user
      const challenge = await Challenge.findOne({
        $or: [
          { challenger: currentUserId, challenged: user._id },
          { challenger: user._id, challenged: currentUserId }
        ]
      }).sort({ createdAt: -1 });

      let status = 'available';
      let challengeId = null;
      let isChallenger = false;

      if (challenge) {
        challengeId = challenge._id;
        isChallenger = challenge.challenger.toString() === currentUserId.toString();

        if (challenge.status === 'pending') {
          status = isChallenger ? 'pending' : 'received';
        } else if (challenge.status === 'accepted') {
          status = 'accepted';
        } else if (challenge.status === 'rejected') {
          status = 'rejected';
        } else if (challenge.status === 'in_progress') {
          status = 'in_progress';
        }
      }

      return {
        ...user.toJSON(),
        challengeStatus: status,
        challengeId,
        isChallenger
      };
    }));

    res.json({
      success: true,
      players: playersWithStatus
    });

  } catch (error) {
    console.error('Get players error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching players'
    });
  }
});

// Send a challenge
router.post('/send', requireAuth, async (req, res) => {
  try {
    const { challengedUsername } = req.body;
    const challengerId = req.user._id;

    if (!challengedUsername) {
      return res.status(400).json({
        success: false,
        message: 'Challenged username is required'
      });
    }

    // Find challenged user
    const challengedUser = await User.findOne({ 
      username: challengedUsername.toLowerCase() 
    });

    if (!challengedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (challengedUser._id.toString() === challengerId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot challenge yourself'
      });
    }

    // Check if there's already an active challenge
    const existingChallenge = await Challenge.findOne({
      $or: [
        { challenger: challengerId, challenged: challengedUser._id },
        { challenger: challengedUser._id, challenged: challengerId }
      ],
      status: { $in: ['pending', 'accepted', 'in_progress'] }
    });

    if (existingChallenge) {
      return res.status(400).json({
        success: false,
        message: 'There is already an active challenge with this user'
      });
    }

    const match = await gameService.createGame(challengerId);

    // Create new challenge
    const challenge = new Challenge({
      challenger: challengerId,
      challenged: challengedUser._id,
      status: 'pending',
      gameCode: match.gameCode
      
    });

    await challenge.save();

    res.status(201).json({
      success: true,
      message: 'Challenge sent successfully',
      challenge: {
        id: challenge._id,
        challengedUsername: challengedUser.username,
        status: challenge.status
      }
    });

  } catch (error) {
    console.error('Send challenge error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error sending challenge'
    });
  }
});

// Accept a challenge
router.post('/accept/:challengeId', requireAuth, async (req, res) => {
  try {
    const { challengeId } = req.params;
    const userId = req.user._id;



    const challenge = await Challenge.findById(challengeId);

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    // Verify user is the challenged player
    if (challenge.challenged.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to accept this challenge'
      });
    }

    if (challenge.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Challenge is not in pending status'
      });
    }

    // join the game
    await gameService.joinGame(challenge.gameCode, req.user._id);

    challenge.status = 'accepted';
    challenge.updatedAt = new Date();
    await challenge.save();

    res.json({
      success: true,
      message: 'Challenge accepted successfully',
      challenge: {
        id: challenge._id,
        status: challenge.status
      }
    });

  } catch (error) {
    console.error('Accept challenge error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error accepting challenge'
    });
  }
});

// Reject a challenge
router.post('/reject/:challengeId', requireAuth, async (req, res) => {
  try {
    const { challengeId } = req.params;
    const userId = req.user._id;

    const challenge = await Challenge.findById(challengeId);

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    // Verify user is the challenged player
    if (challenge.challenged.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to reject this challenge'
      });
    }

    if (challenge.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Challenge is not in pending status'
      });
    }

    challenge.status = 'rejected';
    challenge.updatedAt = new Date();
    await challenge.save();

    res.json({
      success: true,
      message: 'Challenge rejected',
      challenge: {
        id: challenge._id,
        status: challenge.status
      }
    });

  } catch (error) {
    console.error('Reject challenge error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error rejecting challenge'
    });
  }
});

// Start a match (only challenger can start)
router.post('/start/:challengeId', requireAuth, async (req, res) => {
  try {
    const { challengeId } = req.params;
    const userId = req.user._id;

    const challenge = await Challenge.findById(challengeId);

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    // Verify user is the challenger
    if (challenge.challenger.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the challenger can start the match'
      });
    }

    if (challenge.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Challenge must be accepted before starting'
      });
    }

    challenge.status = 'in_progress';
    challenge.updatedAt = new Date();
    await challenge.save();

    res.json({
      success: true,
      message: 'Match started successfully',
      challenge: {
        id: challenge._id,
        status: challenge.status
      }
    });

  } catch (error) {
    console.error('Start match error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error starting match'
    });
  }
});

// Get challenge details
router.get('/:challengeId', requireAuth, async (req, res) => {
  try {
    const { challengeId } = req.params;
    const userId = req.user._id;

    const challenge = await Challenge.findById(challengeId)
      .populate('challenger', 'username imageUrl')
      .populate('challenged', 'username imageUrl');

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    // Verify user is involved in the challenge
    const isInvolved = challenge.challenger._id.toString() === userId.toString() ||
                       challenge.challenged._id.toString() === userId.toString();

    if (!isInvolved) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this challenge'
      });
    }

    res.json({
      success: true,
      challenge
    });

  } catch (error) {
    console.error('Get challenge error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching challenge'
    });
  }
});

// Finish a match (for future use)
router.post('/finish/:challengeId', requireAuth, async (req, res) => {
  try {
    const { challengeId } = req.params;
    const { winnerId, loserId,matchData } = req.body;
    const userId = req.user._id;

    const challenge = await Challenge.findById(challengeId);

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    // Verify user is involved in the challenge
    const isInvolved = challenge.challenger.toString() === userId.toString() ||
                       challenge.challenged.toString() === userId.toString();

    if (!isInvolved) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to finish this challenge'
      });
    }

    if (challenge.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: 'Challenge is not in progress'
      });
    }

    challenge.status = 'finished';
    challenge.winner = winnerId || null;
    challenge.loser = loserId || null;
    challenge.matchData = matchData || null;
    challenge.updatedAt = new Date();
    await challenge.save();

    res.json({
      success: true,
      message: 'Match finished successfully',
      challenge: {
        id: challenge._id,
        status: challenge.status,
        winner: challenge.winner,
        loser: challenge.loser,
      }
    });

  } catch (error) {
    console.error('Finish match error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error finishing match'
    });
  }
});

// Cancel a challenge (only challenger can cancel)
router.post('/cancel/:challengeId', requireAuth, async (req, res) => {
  try {
    const { challengeId } = req.params;
    const userId = req.user._id;
    const challenge = await Challenge.findById(challengeId);
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }
    // Verify user is the challenger
    if (challenge.challenger.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the challenger can cancel the challenge'
      });
    }
    // Can only cancel if pending, accepted, or in_progress
    if (!['pending', 'accepted', 'in_progress'].includes(challenge.status)) {
      return res.status(400).json({
        success: false,
        message: 'Challenge cannot be cancelled in current status'
      });
    }
    challenge.status = 'cancelled';
    challenge.winner = null;
    challenge.loser = null;
    challenge.updatedAt = new Date();
    await challenge.save();
    res.json({
      success: true,
      message: 'Challenge cancelled successfully',
      challenge: {
        id: challenge._id,
        status: challenge.status
      }
    });
  } catch (error) {
    console.error('Cancel challenge error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error cancelling challenge'
    });
  }
});
module.exports = router;