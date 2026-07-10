const express = require("express");
const router = express.Router();

const medicineController = require("../controllers/medicineController");

const authMiddleware = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

// Create medicine
router.post(
    "/create",
    authMiddleware,
    adminOnly,
    medicineController.createMedicine
);

module.exports = router;

// Get all medicines
router.get(
    "/",
    medicineController.getAllMedicines
);

// Get single medicine
router.get(
    "/:id",
    medicineController.getSingleMedicine
);

// Search medicines
router.get(
    "/search",
    medicineController.searchMedicines
);

// Filter medicines
router.get(
    "/filter",
    medicineController.filterMedicines
);

// Update medicine
router.put(
    "/:id",
    authMiddleware,
    adminOnly,
    medicineController.updateMedicine
);

// Update medicine stock
router.patch(
    "/:id/stock",
    authMiddleware,
    adminOnly,
    medicineController.updateMedicineStock
);

// Get low stock medicines
router.get(
    "/low-stock",
    authMiddleware,
    adminOnly,
    medicineController.getLowStockMedicines
);

// Get out of stock medicines
router.get(
    "/out-of-stock",
    authMiddleware,
    adminOnly,
    medicineController.getOutOfStockMedicines
);

// Get medicines expiring within next 30 days
router.get(
    "/expiring",
    authMiddleware,
    adminOnly,
    medicineController.getExpiringMedicines
);

// Deactivate medicine
router.patch(
    "/:id/deactivate",
    authMiddleware,
    adminOnly,
    medicineController.deactivateMedicine
);

// Activate medicine
router.patch(
    "/:id/activate",
    authMiddleware,
    adminOnly,
    medicineController.activateMedicine
);

module.exports = router;
