const Admin = require('../models/Admin');

async function ensureFailsafeAdmin(options = {}) {
  const email = (options.email || process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const password = options.password || process.env.ADMIN_PASSWORD;
  const fullName = options.fullName || process.env.ADMIN_NAME || 'Failsafe Admin';

  if (!email || !password) {
    return { executed: false, reason: 'ADMIN_EMAIL or ADMIN_PASSWORD not set' };
  }

  try {
    let admin = await Admin.findOne({ email }).select('+password');

    if (admin) {
      const shouldUpdate = admin.password !== password || admin.isActive === false;
      if (shouldUpdate) {
        await Admin.updateOne(
          { _id: admin._id },
          { $set: { password, isActive: true, fullName: admin.fullName || fullName } }
        );
      }
      return { executed: true, created: false, email };
    }

    const adminId = await Admin.generateAdminId();

    await Admin.create({
      fullName,
      email,
      password,
      adminId,
      department: 'Management',
      position: 'Administrator',
      phone: '+0000000000',
      dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
      isActive: true
    });

    return { executed: true, created: true, email };
  } catch (error) {
    return { executed: true, created: false, email, error: error?.message || String(error) };
  }
}

module.exports = { ensureFailsafeAdmin };


