const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const DeliveryBoy = require('./src/models/deliveryBoyModel');

dotenv.config();
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hms')
    .then(async () => {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);
        
        await DeliveryBoy.deleteMany({ email: 'driver1@medipulse.com' }); // Cleanup
        
        const boy = new DeliveryBoy({
            first_name: 'John',
            last_name: 'Driver',
            email: 'driver1@medipulse.com',
            password: hashedPassword,
            phone: '9876543210',
            vehicle_number: 'DL 01 AB 1234',
            status: 'available'
        });
        
        await boy.save();
        console.log('Delivery Boy Created successfully!');
        console.log('Login Email: driver1@medipulse.com');
        console.log('Password: password123');
        process.exit();
    })
    .catch(err => console.error(err));
