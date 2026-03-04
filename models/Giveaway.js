const mongoose = require('mongoose');

const giveawaySchema = new mongoose.Schema({
  // Giveaway Identifiers
  giveawayId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  messageId: {
    type: String,
    required: true
  },
  channelId: {
    type: String,
    required: true
  },

  // Prize Details
  prize: {
    type: String,
    required: true
  },

  // Creator Info
  createdBy: {
    type: String, // Discord ID
    required: true
  },
  createdByUsername: {
    type: String,
    required: true
  },

  // Settings
  duration: {
    type: Number, // Duration in hours
    required: true
  },
  maxParticipants: {
    type: Number,
    required: true,
    min: 1
  },
  minimumRole: {
    type: String, // Role ID
    default: null
  },

  // Role-based Probability
  roleProbabilities: [{
    roleId: String,
    probability: Number, // 1-100
    roleName: String
  }],

  // Participants
  participants: [{
    userId: String,
    username: String,
    joinedAt: Date
  }],

  // Winner
  winner: {
    userId: String,
    username: String,
    selectedAt: Date
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'ended', 'cancelled'],
    default: 'active'
  },

  // Timestamps
  endsAt: {
    type: Date,
    required: true
  },
  endedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Method to check if giveaway has ended
giveawaySchema.methods.hasEnded = function() {
  return Date.now() > this.endsAt || this.status === 'ended';
};

// Method to check if user has joined
giveawaySchema.methods.hasUserJoined = function(userId) {
  return this.participants.some(p => p.userId === userId);
};

// Method to add participant
giveawaySchema.methods.addParticipant = function(userId, username) {
  if (this.hasUserJoined(userId)) {
    throw new Error('User already joined');
  }
  
  if (this.participants.length >= this.maxParticipants) {
    throw new Error('Giveaway is full');
  }

  this.participants.push({
    userId: userId,
    username: username,
    joinedAt: Date.now()
  });

  return this.save();
};

// Method to select winner with role-based probability
giveawaySchema.methods.selectWinner = function(guild) {
  if (this.participants.length === 0) {
    return null;
  }

  // Create weighted list based on role probabilities
  const weightedParticipants = [];

  for (const participant of this.participants) {
    let weight = 1; // Base weight

    // Check if user has any special roles
    const member = guild.members.cache.get(participant.userId);
    
    if (member) {
      for (const roleProb of this.roleProbabilities) {
        if (member.roles.cache.has(roleProb.roleId)) {
          // Increase weight based on probability bonus
          weight += roleProb.probability / 100;
        }
      }
    }

    // Add participant multiple times based on weight
    const entries = Math.ceil(weight * 10); // Scale weight
    for (let i = 0; i < entries; i++) {
      weightedParticipants.push(participant);
    }
  }

  // Select random winner from weighted list
  const randomIndex = Math.floor(Math.random() * weightedParticipants.length);
  const winner = weightedParticipants[randomIndex];

  this.winner = {
    userId: winner.userId,
    username: winner.username,
    selectedAt: Date.now()
  };

  this.status = 'ended';
  this.endedAt = Date.now();

  return this.save();
};

module.exports = mongoose.model('Giveaway', giveawaySchema);