const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Order = require('./src/models/orderModel');
const DeliveryBoy = require('./src/models/deliveryBoyModel');

dotenv.config();
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hms')
    .then(async () => {
        const boy = await DeliveryBoy.findOne({ email: 'driver1@medipulse.com' });
        
        if (boy) {
            // Assign all unassigned orders to this driver so the user can test
            const res = await Order.updateMany(
                { delivery_boy_id: null },
                { $set: { delivery_boy_id: boy._id } }
            );
            console.log(`Updated ${res.modifiedCount} old orders to be assigned to the driver!`);
        } else {
            console.log('Driver not found');
        }
        process.exit();
    })
    .catch(err => console.error(err));
