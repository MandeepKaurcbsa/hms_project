const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    medicine_id: { type: String, required: true },
    medicine_name: { type: String, required: true },
    medicine_image: { type: String, default: '' },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    subtotal: { type: Number, required: true }
}, { _id: false });

const orderSchema = new mongoose.Schema({
    user_id: { type: String, required: true, ref: 'User' },
    razorpay_order_id: { type: String, required: true },
    razorpay_payment_id: { type: String, required: true },
    items: [orderItemSchema],
    total_items: { type: Number, required: true },
    total_quantity: { type: Number, required: true },
    grand_total: { type: Number, required: true },
    status: {
        type: String,
        enum: ['pending', 'paid', 'processing', 'delivered', 'cancelled'],
        default: 'paid'
    },
    placed_at: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
