import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import connectDB from '../config/db.js';
import User from '../models/User.js';

const run = async () => {
  try {
    const email = process.argv[2];
    const newPassword = process.argv[3];
    if (!email || !newPassword) {
      console.error('Usage: node src/scripts/updateRootPassword.js <email> <newPassword>');
      process.exit(1);
    }

    await connectDB();

    const user = await User.findOne({ email: email.toLowerCase().trim(), role: 'root' });
    if (!user) {
      console.error('Root user not found');
      process.exit(1);
    }

    user.passwordHash = bcrypt.hashSync(newPassword, 12);
    user.tokenVersion += 1; // logout everywhere
    await user.save();

    console.log('✅ Root password updated for:', user.email);
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Error updating root password:', err.message);
    process.exit(1);
  }
};

run();


