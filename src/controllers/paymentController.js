const Razorpay = require('razorpay');
const crypto = require('crypto');
const Cart = require('../models/cartModel');
const Medicine = require('../models/medicineModel');
const Order = require('../models/orderModel');

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET
});

exports.createOrder = async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount) {
            return res.status(400).json({ success: false, message: 'Amount is required' });
        }
        const options = {
            amount: Math.round(amount * 100), // paise
            currency: 'INR',
            receipt: 'receipt_order_' + Date.now()
        };
        const order = await razorpayInstance.orders.create(options);
        if (!order) {
            return res.status(500).json({ success: false, message: 'Failed to create order' });
        }
        res.status(200).json({ success: true, order });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

exports.verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const sign = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac('sha256', process.env.RAZORPAY_SECRET)
            .update(sign.toString())
            .digest('hex');

        if (razorpay_signature !== expectedSign) {
            return res.status(400).json({ success: false, message: 'Invalid signature sent!' });
        }

        const user_id = req.user.id;

        // Fetch the user's cart with medicine details
        const cart = await Cart.findOne({ user_id });
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: 'Cart is empty or not found' });
        }

        // Build order items from cart
        const orderItems = [];
        let grand_total = 0;
        let total_quantity = 0;

        for (const cartItem of cart.items) {
            const medicine = await Medicine.findById(cartItem.medicine_id);
            const price = medicine ? medicine.price : cartItem.price_at_added;
            const name = medicine ? medicine.medicine_name : 'Unknown';
            const image = medicine ? medicine.medicine_image : '';
            const subtotal = price * cartItem.quantity;

            orderItems.push({
                medicine_id: cartItem.medicine_id,
                medicine_name: name,
                medicine_image: image,
                quantity: cartItem.quantity,
                price,
                subtotal
            });

            grand_total += subtotal;
            total_quantity += cartItem.quantity;
        }

        // Save the order
        const newOrder = new Order({
            user_id,
            razorpay_order_id,
            razorpay_payment_id,
            items: orderItems,
            total_items: orderItems.length,
            total_quantity,
            grand_total,
            status: 'paid'
        });
        await newOrder.save();

        // Clear the user's cart
        cart.items = [];
        await cart.save();

        res.status(200).json({ success: true, message: 'Payment verified and order placed successfully' });
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

exports.getMyOrders = async (req, res) => {
    try {
        const user_id = req.user.id;
        const orders = await Order.find({ user_id }).sort({ placed_at: -1 });
        res.status(200).json({ success: true, orders });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

exports.deleteOrder = async (req, res) => {
    try {
        const user_id = req.user.id;
        const order_id = req.params.id;
        
        const order = await Order.findOneAndDelete({ _id: order_id, user_id });
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        
        res.status(200).json({ success: true, message: 'Order removed successfully' });
    } catch (error) {
        console.error('Error deleting order:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
