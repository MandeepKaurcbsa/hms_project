const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/deliveryController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/register', deliveryController.registerDeliveryBoy);
router.post('/login', deliveryController.loginDeliveryBoy);

router.get('/my-orders', authMiddleware, (req, res, next) => {
    if (req.user.role !== 'delivery') return res.status(403).json({ success: false, message: 'Forbidden' });
    next();
}, deliveryController.getMyAssignedOrders);

router.put('/update-status/:order_id', authMiddleware, (req, res, next) => {
    if (req.user.role !== 'delivery') return res.status(403).json({ success: false, message: 'Forbidden' });
    next();
}, deliveryController.updateOrderStatus);

module.exports = router;
