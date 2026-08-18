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
    delivery_boy_id: { type: String, ref: 'DeliveryBoy', default: null },
    razorpay_order_id: { type: String, required: true },
    razorpay_payment_id: { type: String, required: true },
    items: [orderItemSchema],
    total_items: { type: Number, required: true },
    total_quantity: { type: Number, required: true },
    grand_total: { type: Number, required: true },
    delivery_address: {
        street: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' },
        zip_code: { type: String, default: '' }
    },
    payment_mode: {
        type: String,
        enum: ['COD', 'UPI', 'CARD', 'ONLINE'],
        default: 'UPI'
    },
    payment_status: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        default: 'paid'
    },
    status: {
        type: String,
        enum: ['pending', 'paid', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'],
        default: 'paid'
    },
    tracking: {
        processing_at: { type: Date },
        shipped_at: { type: Date },
        out_for_delivery_at: { type: Date },
        delivered_at: { type: Date }
    },
    delivery_otp: { type: String, default: null },
    is_otp_verified: { type: Boolean, default: false },
    estimated_delivery_minutes: { type: Number, default: 30 },
    estimated_delivery_time: { type: Date, default: null },
    placed_at: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
