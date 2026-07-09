const express = require("express");
const router = express.Router();

const medicalRecordController = require("../controllers/medicalRecordController");

const authMiddleware = require("../middleware/authMiddleware");
const doctorOnly = require("../middleware/doctorMiddleware");
const userOnly = require("../middleware/userMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

// ----------------------------- doctor side ----------------------------------------------------

// Create Medical Record
router.post(
    "/create",
    authMiddleware,
    doctorOnly,
    medicalRecordController.createMedicalRecord
);

module.exports = router;

// Get all medical records created by logged-in doctor
router.get(
    "/my-records",
    authMiddleware,
    doctorOnly,
    medicalRecordController.getMyMedicalRecords
);

// Get single medical record
router.get(
    "/:id",
    authMiddleware,
    doctorOnly,
    medicalRecordController.getSingleMedicalRecord
);

// Update medical record
router.put(
    "/:id",
    authMiddleware,
    doctorOnly,
    medicalRecordController.updateMedicalRecord
);

// --------------------------patient side ----------------------------------------------------------

// Get medical records of logged-in user's patients
// Optional Query: ?patient_id=PAT-001
router.get(
    "/my-records",
    authMiddleware,
    userOnly,
    medicalRecordController.getMyMedicalRecords
);

// Get single medical record of logged-in user's patient
router.get(
    "/my-record/:id",
    authMiddleware,
    userOnly,
    medicalRecordController.getSingleMyMedicalRecord
);

// -----------------------------admin side ------------------------------------------------

// Get all medical records
router.get(
    "/all",
    authMiddleware,
    adminOnly,
    medicalRecordController.getAllMedicalRecords
);

// Archive medical record
router.patch(
    "/:id/archive",
    authMiddleware,
    adminOnly,
    medicalRecordController.archiveMedicalRecord
);

// Restore medical record
router.patch(
    "/:id/restore",
    authMiddleware,
    adminOnly,
    medicalRecordController.restoreMedicalRecord
);

module.exports = router;