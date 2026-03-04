/**
 * Script to clean up users with malformed verification codes
 * Run this once to fix existing database entries
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function cleanupUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all users with verification codes containing '-'
    const usersToFix = await User.find({
      verificationCode: { $regex: '-' }
    });

    console.log(`Found ${usersToFix.length} users to fix`);

    for (const user of usersToFix) {
      // Split the malformed code
      const parts = user.verificationCode.split('-');
      const code = parts[0];
      const password = parts[1] || null;

      // Update user
      user.verificationCode = code;
      user.tempPassword = password;
      await user.save();

      console.log(`✅ Fixed user: ${user.discordUsername} (${user.email})`);
    }

    // Alternative: Delete all unverified users to start fresh
    // Uncomment the lines below if you want to delete all unverified users instead
    /*
    const deleteResult = await User.deleteMany({ isVerified: false });
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} unverified users`);
    */

    console.log('✅ Cleanup complete!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

cleanupUsers();