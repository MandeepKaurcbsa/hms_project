const express = require("express");
const router = express.Router();

const cartController = require("../controllers/cartController");

const authMiddleware = require("../middleware/authMiddleware");

const userOnly = require("../middleware/userMiddleware");

// Add medicine to cart
router.post(
    "/add",
    authMiddleware,
    userOnly,
    cartController.addMedicineToCart
);

// Get logged-in user's cart
router.get(
    "/",
    authMiddleware,
    userOnly,
    cartController.getMyCart
);

// Increase medicine quantity
router.patch(
    "/increase/:medicine_id",
    authMiddleware,
    userOnly,
    cartController.increaseQuantity
);

// Decrease medicine quantity
router.patch(
    "/decrease/:medicine_id",
    authMiddleware,
    userOnly,
    cartController.decreaseQuantity
);

// Remove medicine from cart
router.delete(
    "/remove/:medicine_id",
    authMiddleware,
    userOnly,
    cartController.removeMedicineFromCart
);

// Clear entire cart
router.delete(
    "/clear",
    authMiddleware,
    userOnly,
    cartController.clearCart
);

// Select / Unselect a medicine
router.patch(
    "/select/:medicine_id",
    authMiddleware,
    userOnly,
    cartController.toggleCartItemSelection
);

// Select / Unselect all medicines
router.patch(
    "/select-all",
    authMiddleware,
    userOnly,
    cartController.toggleAllCartItems
);

// Validate cart
router.post(
    "/validate",
    authMiddleware,
    userOnly,
    cartController.validateCart
);

// Checkout cart
router.post(
    "/checkout",
    authMiddleware,
    userOnly,
    cartController.checkoutCart
);

module.exports = router;