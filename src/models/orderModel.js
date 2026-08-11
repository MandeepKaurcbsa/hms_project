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
    placed_at: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
