const express = require("express");

const router = express.Router();

const prescriptionController = require("../controllers/prescriptionController");

const authMiddleware = require("../middleware/authMiddleware");

const doctorOnly = require("../middleware/doctorMiddleware");

const userOnly = require("../middleware/userMiddleware");

const adminOnly = require("../middleware/adminMiddleware");

// ---------------------------------doctor side -----------------------------------------------

// Create Prescription
router.post(
    "/",
    authMiddleware,
    doctorOnly,
    prescriptionController.createPrescription
);

// Get logged-in doctor's prescriptions
router.get(
    "/doctor/my-prescriptions",
    authMiddleware,
    doctorOnly,
    prescriptionController.getMyPrescriptions
);

// Update prescription
router.put(
    "/:prescription_id",
    authMiddleware,
    doctorOnly,
    prescriptionController.updatePrescription
);

// --------------------------------patient side--------------------------------------------------

// Get logged-in user's prescriptions
router.get(
    "/patient/my-prescriptions",
    authMiddleware,
    userOnly,
    prescriptionController.getMyPatientPrescriptions
);

// ----------------------------------admin side --------------------------------------------

// Get all prescriptions
router.get(
    "/",
    authMiddleware,
    adminOnly,
    prescriptionController.getAllPrescriptions
);

// ---------------------------------------common api -----------------------------------------

// Get single prescription
router.get(
    "/:prescription_id",
    authMiddleware,
    prescriptionController.getPrescriptionDetails
);

module.exports = router;