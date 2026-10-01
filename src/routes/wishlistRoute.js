const express = require("express");
const router = express.Router();
const wishlistController = require("../controllers/wishlistController");
const authMiddleware = require("../middleware/authMiddleware");
const userOnly = require("../middleware/userMiddleware");

// Get logged-in user's wishlist
router.get(
    "/",
    authMiddleware,
    userOnly,
    wishlistController.getWishlist
);

// Toggle medicine in wishlist (Add/Remove)
router.post(
    "/toggle",
    authMiddleware,
    userOnly,
    wishlistController.toggleWishlistItem
);

// Add medicine to wishlist
router.post(
    "/add",
    authMiddleware,
    userOnly,
    wishlistController.addToWishlist
);

// Remove medicine from wishlist
router.delete(
    "/remove/:medicine_id",
    authMiddleware,
    userOnly,
    wishlistController.removeFromWishlist
);

// Clear entire wishlist
router.delete(
    "/clear",
    authMiddleware,
    userOnly,
    wishlistController.clearWishlist
);

module.exports = router;
