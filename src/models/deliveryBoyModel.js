const mongoose = require('mongoose');

const deliveryBoySchema = new mongoose.Schema({
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    vehicle_number: { type: String, required: true },
    status: { type: String, enum: ['available', 'busy', 'offline'], default: 'available' },
    profile_img: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('DeliveryBoy', deliveryBoySchema);
