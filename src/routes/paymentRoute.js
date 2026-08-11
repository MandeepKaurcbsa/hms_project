const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/create-order', authMiddleware, paymentController.createOrder);
router.post('/verify-payment', authMiddleware, paymentController.verifyPayment);
router.post('/verify-appointment-payment', authMiddleware, paymentController.verifyAppointmentPayment);
router.get('/my-orders', authMiddleware, paymentController.getMyOrders);
router.delete('/my-orders/:id', authMiddleware, paymentController.deleteOrder);
router.get('/all-orders', authMiddleware, paymentController.getAllOrders);
router.put('/update-order-status/:id', authMiddleware, paymentController.updateOrderStatus);

module.exports = router;
