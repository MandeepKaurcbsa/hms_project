const express = require("express");
const router = express.Router();

const medicineRequestController = require("../controllers/medicineRequestController");

const authMiddleware = require("../middleware/authMiddleware");
const pharmacistOnly = require("../middleware/pharmacistMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

// Create Medicine Request
router.post(
    "/create",
    authMiddleware,
    pharmacistOnly,
    medicineRequestController.createMedicineRequest
);

// Get all medicine requests submitted by logged-in pharmacist
router.get(
    "/my-requests",
    authMiddleware,
    pharmacistOnly,
    medicineRequestController.getMyMedicineRequests
);

// Get single medicine request
router.get(
    "/:id",
    authMiddleware,
    medicineRequestController.getSingleMedicineRequest
);

// Get all pending medicine requests (Admin)
router.get(
    "/pending",
    authMiddleware,
    adminOnly,
    medicineRequestController.getPendingMedicineRequests
);

// Approve medicine request (Admin)
router.put(
    "/approve/:id",
    authMiddleware,
    adminOnly,
    medicineRequestController.approveMedicineRequest
);

// Reject medicine request (Admin)
router.put(
    "/reject/:id",
    authMiddleware,
    adminOnly,
    medicineRequestController.rejectMedicineRequest
);

// Get all medicine requests (Admin)
router.get(
    "/",
    authMiddleware,
    adminOnly,
    medicineRequestController.getAllMedicineRequests
);

module.exports = router;