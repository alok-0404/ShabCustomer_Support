import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import connectDB from '../config/db.js';
import User from '../models/User.js';

const run = async () => {
  try {
    const email = process.argv[2];
    const password = process.argv[3];
    if (!email || !password) {
      console.error('Usage: node src/scripts/seedRoot.js <email> <password>');
      process.exit(1);
    }

    // Connect using the existing connection from db.js
    await connectDB();

    // Check if user exists
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      console.log('⚠️ Root user already exists with this email.');
      console.log('  Email:', existing.email);
      console.log('  Role:', existing.role);
      console.log('  IsActive:', existing.isActive);
      console.log('\n💡 If you want to reset password, use: npm run root:password');
      await mongoose.connection.close();
      process.exit(0);
    }

    // Create root user
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      userId: 'ROOT-ADMIN',
      email: email.toLowerCase().trim(),
      passwordHash,
      role: 'root',
      isActive: true,
      createdBy: null,
      tokenVersion: 0
    });

    console.log('✅ Root admin created successfully!');
    console.log('  ID:', String(user._id));
    console.log('  Email:', user.email);
    console.log('  Role:', user.role);
    console.log('\n🎉 You can now login with:');
    console.log('  Email:', email);
    console.log('  Password:', password);
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding root user:', err.message);
    if (err.code === 11000) {
      console.error('  User with this email already exists');
    }
    process.exit(1);
  }
};

run();


