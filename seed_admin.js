require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./src/models/adminModel');

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Update mandeep@gmail.com
    await Admin.updateOne({ email: 'mandeep@gmail.com' }, { password: hashedPassword });
    
    // Update sunam@gmail.com
    await Admin.updateOne({ email: 'sunam@gmail.com' }, { password: hashedPassword });
    
    // Check or create admin@gmail.com
    const defaultAdmin = await Admin.findOne({ email: 'admin@gmail.com' });
    if (!defaultAdmin) {
      await Admin.create({
        fullname: 'Default Admin',
        email: 'admin@gmail.com',
        password: hashedPassword,
        phone: '9999999999',
        profile_img: 'https://via.placeholder.com/150'
      });
      console.log('Created default admin: admin@gmail.com / admin123');
    } else {
      await Admin.updateOne({ email: 'admin@gmail.com' }, { password: hashedPassword });
    }
    
    console.log('Admin passwords set to "admin123" successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
