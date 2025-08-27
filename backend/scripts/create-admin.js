const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const Admin = require('../models/Admin');

async function getNextAdminId() {
  const year = new Date().getFullYear();
  const prefix = `ADMIN${year}`;
  const latest = await Admin.findOne({ adminId: { $regex: `^${prefix}` } })
    .sort({ adminId: -1 })
    .lean();

  let nextNumber = 1;
  if (latest && latest.adminId && typeof latest.adminId === 'string') {
    const suffix = latest.adminId.replace(prefix, '');
    const parsed = parseInt(suffix, 10);
    if (!Number.isNaN(parsed)) {
      nextNumber = parsed + 1;
    }
  }
  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
}

async function run() {
  const email = 'irtazamira@gmail.com';
  const password = '123456';
  const fullName = 'Irtaza Mira';

  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/iwiz-hrms');
    console.log('✅ Connected to MongoDB');

    // Check if admin exists and update password
    let existing = await Admin.findOne({ email });
    if (existing) {
      console.log('✅ Admin exists, updating password...');
      // TEMPORARILY DISABLED: No hashing for testing
      // const salt = await bcrypt.genSalt(12);
      // const hashed = await bcrypt.hash(password, salt);
      // Use updateOne to bypass pre-save hooks
      await Admin.updateOne({ email }, { password: password });
      console.log('🎉 Admin password updated successfully');
      console.log('Email:', email);
      console.log('Password:', password);
      console.log('Admin ID:', existing.adminId);
      return;
    }

    const adminId = await getNextAdminId();

    // TEMPORARILY DISABLED: No hashing for testing
    // const salt = await bcrypt.genSalt(12);
    // const hashed = await bcrypt.hash(password, salt);

    const admin = new Admin({
      fullName,
      email,
      password: password,
      adminId,
      department: 'Management',
      position: 'Administrator',
      phone: '+0000000000',
      dateOfBirth: new Date('1990-01-01'),
      address: {
        street: 'N/A',
        city: 'N/A',
        state: 'N/A',
        zipCode: '00000',
        country: 'N/A'
      }
    });

    await admin.save();
    console.log('🎉 Admin created successfully');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Admin ID:', admin.adminId);
  } catch (err) {
    console.error('❌ Failed to create/update admin:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected');
  }
}

run();
