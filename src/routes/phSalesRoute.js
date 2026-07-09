const express = require("express");

const router = express.Router();

const phSalesController = require("../controllers/phSalesController");

const authMiddleware = require("../middleware/authMiddleware");

const userOnly = require("../middleware/userMiddleware");

const pharmacistOnly = require("../middleware/pharmacistMiddleware");

const adminOnly = require("../middleware/adminMiddleware");

// -------------------------user side ------------------------------------------------------

// Get logged-in user's purchase history
router.get(
    "/my-sales",
    authMiddleware,
    userOnly,
    phSalesController.getMySales
);

// Get logged-in user's sale details
router.get(
    "/:sale_id",
    authMiddleware,
    userOnly,
    phSalesController.getMySaleDetails
);

// --------------------------------pharmacy side -------------------------------------------

// Get all pharmacy sales (Pharmacist)
router.get(
    "/",
    authMiddleware,
    pharmacistOnly,
    phSalesController.getAllSales
);

// Get sale details (Pharmacist)
router.get(
    "/details/:sale_id",
    authMiddleware,
    pharmacistOnly,
    phSalesController.getSaleDetails
);

// ------------------------------------admin side ----------------------------------------------

// Sales statistics (Admin)
router.get(
    "/statistics",
    authMiddleware,
    adminOnly,
    phSalesController.getSalesStatistics
);

// Monthly Sales Report (Admin)
router.get(
    "/monthly-report",
    authMiddleware,
    adminOnly,
    phSalesController.getMonthlySalesReport
);

// Top Selling Medicines (Admin)
router.get(
    "/top-selling-medicines",
    authMiddleware,
    adminOnly,
    phSalesController.getTopSellingMedicines
);

// Get sale invoice
router.get(
    "/invoice/:sale_id",
    authMiddleware,
    adminOnly,
    phSalesController.getSaleInvoice
);



module.exports = router;

