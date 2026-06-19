const express = require("express");
const router = express.Router();

const patientController = require("../controllers/patientController");

const { authMiddleware, userOnly } = require("../middleware/authMiddleware");
const doctorOnly = require("../middleware/doctorMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

// --------------------------------------------------
// USER PATIENT ROUTES
// --------------------------------------------------

// Create a new patient (logged-in user)
router.post(
    "/create",
    authMiddleware,
    userOnly,
    patientController.createPatient
);

// Get all patients belonging to logged-in user
router.get(
    "/my",
    authMiddleware,
    userOnly,
    patientController.getMyPatients
);

// Get single patient belonging to logged-in user
router.get(
    "/my/:id",
    authMiddleware,
    userOnly,
    patientController.getSinglePatient
);

// Update patient details
router.put(
    "/my/:id",
    authMiddleware,
    userOnly,
    patientController.updatePatient
);

// Inactivate patient
router.put(
    "/my/:id/inactivate",
    authMiddleware,
    userOnly,
    patientController.inactivatePatient
);

// Reactivate patient
router.put(
    "/my/:id/activate",
    authMiddleware,
    userOnly,
    patientController.activatePatient
);

// Get appointment history of a patient
router.get(
    "/my/:id/appointments",
    authMiddleware,
    userOnly,
    patientController.getPatientAppointments
);

// --------------------------------------------------
// DOCTOR PATIENT ROUTES
// --------------------------------------------------

// Get all patients assigned to logged-in doctor
router.get(
    "/doctor/all",
    authMiddleware,
    doctorOnly,
    patientController.getDoctorPatients
);

// Get single patient assigned to logged-in doctor
router.get(
    "/doctor/:id",
    authMiddleware,
    doctorOnly,
    patientController.getDoctorSinglePatient
);

// Get appointment history of assigned patient
router.get(
    "/doctor/:id/appointments",
    authMiddleware,
    doctorOnly,
    patientController.getDoctorPatientAppointments
);

module.exports = router;