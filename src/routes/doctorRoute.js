const express = require("express");
const router = express.Router();

const doctorController = require("../controllers/doctorController");

const {authMiddleware} = require("../middleware/authMiddleware");

const adminOnly = require("../middleware/adminMiddleware")

//login doctor
router.post("/login", doctorController.doctorLogin);

//fetch logged in doctor's profile
router.get("/profile", authMiddleware, doctorController.getDoctorProfile);

//fetch all doctors by admin
router.get("/all", authMiddleware, adminOnly, doctorController.getAllDoctors);

//fetch single doctor profile by admin
router.get("/:id", authMiddleware, adminOnly, doctorController.getSingleDoctor);
module.exports = router;

//update doctor's profile
router.put("/profile", authMiddleware ,doctorController.updateDoctorProfile); 

//update password
router.put("/change-password", authMiddleware, doctorController.changePassword);