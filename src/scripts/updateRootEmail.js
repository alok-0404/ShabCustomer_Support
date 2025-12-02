import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';

const run = async () => {
  try {
    const currentEmail = process.argv[2];
    const newEmail = process.argv[3];
    if (!currentEmail || !newEmail) {
      console.error('Usage: node src/scripts/updateRootEmail.js <currentEmail> <newEmail>');
      process.exit(1);
    }

    await connectDB();

    const user = await User.findOne({ email: currentEmail.toLowerCase().trim(), role: 'root' });
    if (!user) {
      console.error('Root user not found');
      process.exit(1);
    }

    const normalized = newEmail.toLowerCase().trim();
    const exists = await User.findOne({ email: normalized, _id: { $ne: user._id } });
    if (exists) {
      console.error('Target email already in use');
      process.exit(1);
    }

    user.email = normalized;
    await user.save();

    console.log('✅ Root email updated to:', user.email);
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Error updating root email:', err.message);
    process.exit(1);
  }
};

run();


