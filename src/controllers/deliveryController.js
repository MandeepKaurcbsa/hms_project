const DeliveryBoy = require('../models/deliveryBoyModel');
const Order = require('../models/orderModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.registerDeliveryBoy = async (req, res) => {
    try {
        const { first_name, last_name, email, password, phone, vehicle_number } = req.body;
        
        let existingUser = await DeliveryBoy.findOne({ email });
        if (existingUser) return res.status(400).json({ success: false, message: 'Email already exists' });
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const newDeliveryBoy = new DeliveryBoy({
            first_name, last_name, email, password: hashedPassword, phone, vehicle_number
        });
        await newDeliveryBoy.save();
        
        const token = jwt.sign({ id: newDeliveryBoy._id, role: 'delivery' }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        res.status(201).json({ success: true, message: 'Registered successfully', token, deliveryBoy: newDeliveryBoy });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

exports.loginDeliveryBoy = async (req, res) => {
    try {
        const { email, password } = req.body;
        const deliveryBoy = await DeliveryBoy.findOne({ email });
        if (!deliveryBoy) return res.status(400).json({ success: false, message: 'Invalid credentials' });
        
        const isMatch = await bcrypt.compare(password, deliveryBoy.password);
        if (!isMatch) return res.status(400).json({ success: false, message: 'Invalid credentials' });
        
        const token = jwt.sign({ id: deliveryBoy._id, role: 'delivery' }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        res.status(200).json({ success: true, message: 'Login successful', token, deliveryBoy });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

exports.getMyAssignedOrders = async (req, res) => {
    try {
        const delivery_boy_id = req.user.id;
        const orders = await Order.find({ delivery_boy_id }).populate('user_id', 'first_name last_name phone').sort({ placed_at: -1 });
        res.status(200).json({ success: true, orders });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

exports.updateOrderStatus = async (req, res) => {
    try {
        const delivery_boy_id = req.user.id;
        const { order_id } = req.params;
        const { status } = req.body;
        
        const validStatuses = ['shipped', 'out_for_delivery', 'delivered'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status for delivery boy' });
        }
        
        const order = await Order.findOne({ _id: order_id, delivery_boy_id });
        if (!order) return res.status(404).json({ success: false, message: 'Order not found or not assigned to you' });
        
        order.status = status;
        if (!order.tracking) order.tracking = {};
        
        if (status === 'out_for_delivery') order.tracking.out_for_delivery_at = new Date();
        if (status === 'delivered') {
            order.tracking.delivered_at = new Date();
            // Free up the delivery boy
            await DeliveryBoy.findByIdAndUpdate(delivery_boy_id, { status: 'available' });
        }
        
        await order.save();
        res.status(200).json({ success: true, message: 'Order updated', order });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};
