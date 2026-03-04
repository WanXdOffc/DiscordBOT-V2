const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  // Ticket Identifiers
  ticketId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  ticketNumber: {
    type: Number,
    required: true
  },

  // User Info
  userId: {
    type: String, // Discord ID
    required: true,
    index: true
  },
  username: {
    type: String,
    required: true
  },

  // Ticket Details
  type: {
    type: String,
    enum: ['coins', 'premium'],
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'pending', 'closed'],
    default: 'open'
  },

  // Channel Info
  channelId: {
    type: String,
    required: true
  },

  // Closure Info
  closedBy: {
    type: String, // Discord ID of admin who closed
    default: null
  },
  closedByUsername: {
    type: String,
    default: null
  },
  closedAt: {
    type: Date,
    default: null
  },
  closeReason: {
    type: String,
    default: null
  },

  // Transaction Info (optional)
  amountPaid: {
    type: Number,
    default: null
  },
  coinsReceived: {
    type: Number,
    default: null
  },
  premiumDuration: {
    type: Number, // days
    default: null
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
ticketSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to close ticket
ticketSchema.methods.close = function(adminId, adminUsername, reason = null) {
  this.status = 'closed';
  this.closedBy = adminId;
  this.closedByUsername = adminUsername;
  this.closedAt = Date.now();
  this.closeReason = reason;
  return this.save();
};

module.exports = mongoose.model('Ticket', ticketSchema);