const Razorpay = require('razorpay');
const crypto = require('crypto');
const Cart = require('../models/cartModel');
const Medicine = require('../models/medicineModel');
const Order = require('../models/orderModel');
const DeliveryBoy = require('../models/deliveryBoyModel');
const Appointment = require('../models/appointModel');
const User = require('../models/userModel');
const Doctor = require('../models/doctorModel');
const { sendAppointmentPaymentSuccessEmail } = require('../services/emailService');

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
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, delivery_address } = req.body;

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

        // Auto-assign delivery boy
        const availableBoy = await DeliveryBoy.findOne({ status: 'available' });
        
        const newOrder = new Order({
            user_id,
            delivery_boy_id: availableBoy ? availableBoy._id : null,
            razorpay_order_id,
            razorpay_payment_id,
            items: orderItems,
            total_items: orderItems.length,
            total_quantity,
            grand_total,
            status: 'paid',
            delivery_address: delivery_address || {}
        });
        await newOrder.save();

        if (availableBoy) {
            availableBoy.status = 'busy';
            await availableBoy.save();
        }

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

exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find().populate('user_id', 'first_name last_name email').sort({ placed_at: -1 });
        res.status(200).json({ success: true, orders });
    } catch (error) {
        console.error('Error fetching all orders:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

exports.updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['pending', 'paid', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        order.status = status;
        
        // update tracking timestamps
        if (!order.tracking) {
            order.tracking = {};
        }
        
        if (status === 'processing') order.tracking.processing_at = new Date();
        if (status === 'shipped') order.tracking.shipped_at = new Date();
        if (status === 'out_for_delivery') order.tracking.out_for_delivery_at = new Date();
        if (status === 'delivered') order.tracking.delivered_at = new Date();

        await order.save();

        res.status(200).json({ success: true, message: 'Order status updated', order });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

exports.verifyAppointmentPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, appointment_id } = req.body;

        if (!appointment_id) {
            return res.status(400).json({ success: false, message: 'Appointment ID is required' });
        }

        const sign = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac('sha256', process.env.RAZORPAY_SECRET)
            .update(sign.toString())
            .digest('hex');

        if (razorpay_signature !== expectedSign) {
            return res.status(400).json({ success: false, message: 'Invalid signature sent!' });
        }

        // Update appointment payment status
        const appointment = await Appointment.findById(appointment_id);
        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        appointment.payment_status = 'paid';
        appointment.payment_method = 'upi';
        await appointment.save();

        // Send payment success email
        try {
            const user = await User.findById(appointment.user_id);
            const doctor = await Doctor.findById(appointment.doctor_id);
            if (user && user.email && doctor) {
                await sendAppointmentPaymentSuccessEmail({
                    to: user.email,
                    userName: `${user.first_name} ${user.last_name}`,
                    doctorName: `${doctor.first_name} ${doctor.last_name}`,
                    appointmentDate: appointment.appointment_date,
                    appointmentTime: appointment.appointment_time,
                    consultFee: appointment.consultation_fee,
                    consult_mode: appointment.consult_mode
                });
            }
        } catch (emailErr) {
            console.error('Payment success email failed (non-fatal):', emailErr.message);
        }

        res.status(200).json({ success: true, message: 'Appointment payment verified successfully', appointment });
    } catch (error) {
        console.error('Error verifying appointment payment:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
