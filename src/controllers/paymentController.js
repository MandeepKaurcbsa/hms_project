const Razorpay = require('razorpay');
const crypto = require('crypto');
const Cart = require('../models/cartModel');
const Medicine = require('../models/medicineModel');
const Order = require('../models/orderModel');
const DeliveryBoy = require('../models/deliveryBoyModel');
const Appointment = require('../models/appointModel');
const User = require('../models/userModel');
const Doctor = require('../models/doctorModel');
const {
    sendAppointmentPaymentSuccessEmail,
    sendDoctorPaymentReceivedEmail,
    sendAppointmentRefundEmail
} = require('../services/emailService');

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
            payment_mode: 'UPI',
            payment_status: 'paid',
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

exports.placeCodOrder = async (req, res) => {
    try {
        const { delivery_address } = req.body;
        const user_id = req.user.id;

        const cart = await Cart.findOne({ user_id });
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: 'Cart is empty or not found' });
        }

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

        const availableBoy = await DeliveryBoy.findOne({ status: 'available' });

        const newOrder = new Order({
            user_id,
            delivery_boy_id: availableBoy ? availableBoy._id : null,
            razorpay_order_id: 'COD_' + Date.now(),
            razorpay_payment_id: 'COD_PAYMENT',
            payment_mode: 'COD',
            payment_status: 'pending',
            items: orderItems,
            total_items: orderItems.length,
            total_quantity,
            grand_total,
            status: 'processing',
            delivery_address: delivery_address || {}
        });
        await newOrder.save();

        if (availableBoy) {
            availableBoy.status = 'busy';
            await availableBoy.save();
        }

        cart.items = [];
        await cart.save();

        res.status(200).json({ success: true, message: 'COD Order placed successfully!', order: newOrder });
    } catch (error) {
        console.error('Error placing COD order:', error);
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
        appointment.awaiting_pharmacist_payment = false;
        appointment.razorpay_payment_id = razorpay_payment_id || null;
        appointment.razorpay_order_id = razorpay_order_id || null;
        await appointment.save();

        // Send payment success email to patient & payment notification to doctor
        try {
            const Patient = require('../models/patientModel');
            const user = await User.findById(appointment.user_id);
            const doctor = await Doctor.findById(appointment.doctor_id);
            const patient = await Patient.findById(appointment.patient_id);
            const patientName = patient ? `${patient.first_name || ''} ${patient.last_name || ''}`.trim() : (user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Patient');

            if (user && user.email && doctor) {
                await sendAppointmentPaymentSuccessEmail({
                    to: user.email,
                    userName: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Valued Patient',
                    doctorName: `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim() || 'Attending Doctor',
                    appointmentDate: appointment.appointment_date,
                    appointmentTime: appointment.appointment_time,
                    consultFee: appointment.consultation_fee,
                    consult_mode: appointment.consult_mode
                });
            }

            if (doctor && doctor.email) {
                await sendDoctorPaymentReceivedEmail({
                    to: doctor.email,
                    doctorName: `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim() || 'Doctor',
                    patientName,
                    appointmentDate: appointment.appointment_date,
                    appointmentTime: appointment.appointment_time,
                    consultFee: appointment.consultation_fee,
                    consult_mode: appointment.consult_mode,
                    appointmentId: appointment._id
                });
            }
        } catch (emailErr) {
            console.error('Payment notification email failed (non-fatal):', emailErr.message);
        }

        res.status(200).json({ success: true, message: 'Appointment payment verified successfully', appointment });
    } catch (error) {
        console.error('Error verifying appointment payment:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

exports.payAppointmentDirect = async (req, res) => {
    try {
        const { appointment_id, payment_method } = req.body;

        if (!appointment_id) {
            return res.status(400).json({ success: false, message: 'Appointment ID is required' });
        }

        const appointment = await Appointment.findById(appointment_id);
        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        if (appointment.user_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Unauthorized to pay for this appointment' });
        }

        if (appointment.status !== 'confirmed') {
            return res.status(400).json({ success: false, message: `Cannot pay for appointment with status "${appointment.status}"` });
        }

        if (appointment.payment_status === 'paid') {
            return res.status(400).json({ success: false, message: 'Appointment fee is already paid' });
        }

        const validMethods = ['cash', 'upi', 'net-banking', 'card'];
        const method = validMethods.includes(payment_method) ? payment_method : 'cash';

        appointment.payment_status = 'paid';
        appointment.payment_method = method;
        appointment.awaiting_pharmacist_payment = false;
        await appointment.save();

        try {
            const Patient = require('../models/patientModel');
            const user = await User.findById(appointment.user_id);
            const doctor = await Doctor.findById(appointment.doctor_id);
            const patient = await Patient.findById(appointment.patient_id);
            const patientName = patient ? `${patient.first_name || ''} ${patient.last_name || ''}`.trim() : (user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Patient');

            if (user && user.email && doctor) {
                await sendAppointmentPaymentSuccessEmail({
                    to: user.email,
                    userName: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Valued Patient',
                    doctorName: `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim() || 'Attending Doctor',
                    appointmentDate: appointment.appointment_date,
                    appointmentTime: appointment.appointment_time,
                    consultFee: appointment.consultation_fee,
                    consult_mode: appointment.consult_mode
                });
            }

            if (doctor && doctor.email) {
                await sendDoctorPaymentReceivedEmail({
                    to: doctor.email,
                    doctorName: `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim() || 'Doctor',
                    patientName,
                    appointmentDate: appointment.appointment_date,
                    appointmentTime: appointment.appointment_time,
                    consultFee: appointment.consultation_fee,
                    consult_mode: appointment.consult_mode,
                    appointmentId: appointment._id
                });
            }
        } catch (emailErr) {
            console.error('Payment notification email failed (non-fatal):', emailErr.message);
        }

        res.status(200).json({
            success: true,
            message: `Payment of ₹${appointment.consultation_fee} recorded successfully (${method.toUpperCase()})`,
            appointment
        });
    } catch (error) {
        console.error('Error in direct appointment payment:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

exports.processDoctorRefund = async (req, res) => {
    try {
        const appointmentId = req.params.id;

        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        // Verify doctor authorization
        if (appointment.doctor_id !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Unauthorized. You can only process refunds for your own appointments' });
        }

        // Verify payment status
        if (appointment.payment_status !== 'paid') {
            return res.status(400).json({
                success: false,
                message: `Refund cannot be processed because appointment payment status is "${appointment.payment_status}" (must be "paid")`
            });
        }

        // Check refund eligibility condition:
        // Situation 1: Doctor cancelled appointment after confirm and payment
        // Situation 2: Appointment expired because doctor did not join/complete meeting
        const isCancelledByDoc = appointment.status === 'cancelled' && appointment.cancelled_by === 'doctor';
        const isExpired = appointment.status === 'expired';

        if (!isCancelledByDoc && !isExpired) {
            return res.status(400).json({
                success: false,
                message: 'Refund button is only enabled when the appointment was cancelled by doctor after payment or expired due to doctor non-attendance.'
            });
        }

        if (appointment.refund_status === 'not_applicable') {
            return res.status(400).json({
                success: false,
                message: 'Refund is not applicable for this appointment (Patient did not join / visit clinic).'
            });
        }

        if (appointment.refund_status === 'refunded') {
            return res.status(400).json({ success: false, message: 'Refund has already been processed for this appointment.' });
        }

        let razorpayRefundId = null;

        // Process Razorpay API refund if razorpay_payment_id exists
        if (appointment.razorpay_payment_id) {
            try {
                const refundOptions = {
                    amount: Math.round(appointment.consultation_fee * 100),
                    speed: 'optimum',
                    notes: {
                        reason: appointment.cancel_reason || (isExpired ? 'Appointment expired refund' : 'Doctor cancellation refund')
                    }
                };
                const refundRes = await razorpayInstance.payments.refund(appointment.razorpay_payment_id, refundOptions);
                if (refundRes && refundRes.id) {
                    razorpayRefundId = refundRes.id;
                }
            } catch (razorpayErr) {
                console.error('Razorpay API refund error (proceeding with DB refund status update):', razorpayErr.message);
            }
        }

        appointment.payment_status = 'refunded';
        appointment.refund_status = 'refunded';
        appointment.refund_percentage = 100;
        appointment.refund_amount = appointment.consultation_fee;
        appointment.refund_processed_at = new Date();
        if (razorpayRefundId) {
            appointment.razorpay_refund_id = razorpayRefundId;
        }
        await appointment.save();

        // Send refund email to patient / user / pharmacist
        try {
            const user = await User.findById(appointment.user_id);
            const doctor = await Doctor.findById(appointment.doctor_id);
            const userName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Valued Patient';
            const doctorName = doctor ? `${doctor.first_name || ''} ${doctor.last_name || ''}`.trim() : 'Attending Doctor';
            const recipientEmail = user?.email;

            if (recipientEmail) {
                await sendAppointmentRefundEmail({
                    to: recipientEmail,
                    userName,
                    doctorName,
                    appointmentDate: appointment.appointment_date,
                    appointmentTime: appointment.appointment_time,
                    refundAmount: appointment.consultation_fee,
                    reason: appointment.cancel_reason || (isExpired ? 'Appointment expired without doctor consultation' : 'Appointment cancelled by doctor'),
                    appointmentId: appointment._id
                });
            }
        } catch (emailErr) {
            console.error('Refund email notification failed (non-fatal):', emailErr.message);
        }

        res.status(200).json({
            success: true,
            message: `100% Refund of ₹${appointment.consultation_fee} processed successfully`,
            appointment
        });

    } catch (error) {
        console.error('Error processing doctor refund:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

