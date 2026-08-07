const express = require("express");
const router = express.Router();

const medicineRequestController = require("../controllers/medicineRequestController");

const authMiddleware = require("../middleware/authMiddleware");
const pharmacistOnly = require("../middleware/pharmacistMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

// 1. Get all medicine requests (Admin)
router.get(
    "/",
    authMiddleware,
    adminOnly,
    medicineRequestController.getAllMedicineRequests
);

// 2. Get all pending medicine requests (Admin)
router.get(
    "/pending",
    authMiddleware,
    adminOnly,
    medicineRequestController.getPendingMedicineRequests
);

// 3. Get all medicine requests submitted by logged-in pharmacist
router.get(
    "/my-requests",
    authMiddleware,
    pharmacistOnly,
    medicineRequestController.getMyMedicineRequests
);

// 4. Create Medicine Request (Pharmacist)
router.post(
    "/create",
    authMiddleware,
    pharmacistOnly,
    medicineRequestController.createMedicineRequest
);

// 5. Approve medicine request (Admin)
router.put(
    "/approve/:id",
    authMiddleware,
    adminOnly,
    medicineRequestController.approveMedicineRequest
);

// 6. Reject medicine request (Admin)
router.put(
    "/reject/:id",
    authMiddleware,
    adminOnly,
    medicineRequestController.rejectMedicineRequest
);

// 7. Cancel medicine request (Pharmacist)
router.put(
    "/cancel/:id",
    authMiddleware,
    pharmacistOnly,
    medicineRequestController.cancelMedicineRequest
);

// 8. Get single medicine request by ID (Must be last to avoid route collision!)
router.get(
    "/:id",
    authMiddleware,
    medicineRequestController.getSingleMedicineRequest
);

module.exports = router;