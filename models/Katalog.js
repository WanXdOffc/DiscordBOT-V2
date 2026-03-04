const mongoose = require('mongoose');

const katalogSchema = new mongoose.Schema({
  // Product ID (for easy reference)
  productId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },

  // Product Details
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },

  // Specifications
  ram: {
    type: Number, // in MB
    required: true,
    min: 128
  },
  disk: {
    type: Number, // in MB
    required: true,
    min: 512
  },
  cpu: {
    type: Number, // in percentage
    required: true,
    min: 25,
    max: 500
  },
  
  // Pterodactyl Settings
  egg: {
    type: Number,
    required: true
  },
  nest: {
    type: Number,
    required: true
  },

  // Database
  databases: {
    type: Number,
    default: 0,
    min: 0
  },

  // Pricing
  price: {
    type: Number, // in coins
    required: true,
    min: 1
  },
  
  // Duration
  durationDays: {
    type: Number,
    required: true,
    min: 1
  },

  // Status
  isAvailable: {
    type: Boolean,
    default: true
  },

  // Stock (optional)
  stock: {
    type: Number,
    default: null // null = unlimited
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
katalogSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to calculate price with voucher discount
katalogSchema.methods.calculatePrice = function(discountPercent = 0) {
  const discount = (this.price * discountPercent) / 100;
  return Math.max(1, Math.floor(this.price - discount));
};

// Method to check if product is in stock
katalogSchema.methods.isInStock = function() {
  if (this.stock === null) return true; // Unlimited stock
  return this.stock > 0;
};

// Method to decrease stock
katalogSchema.methods.decreaseStock = function() {
  if (this.stock !== null && this.stock > 0) {
    this.stock -= 1;
    return this.save();
  }
};

module.exports = mongoose.model('Katalog', katalogSchema);