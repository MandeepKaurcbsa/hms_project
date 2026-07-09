//adminController -> admminRoute
//handles admin routes

const express = require("express");
const router = express.Router();

const {
    createAdmin,
    adminLogin,
    getAdminProfile,
    addDoctor,
    updateDoctorProfile,
    addPharmacist,
    getDashboardStats
} = require("../controllers/adminController");

<<<<<<< HEAD
const {authMiddleware} = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
=======
const authMiddleware = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");
>>>>>>> fdaae64 (Major Backend Completed)

//create admin 
router.post("/register", createAdmin);

//admin login
router.post("/login", adminLogin);

//admin profile fetch
router.get("/profile", authMiddleware, adminOnly, getAdminProfile);

//add doctor
<<<<<<< HEAD
router.post("/add-doctor", authMiddleware, upload.single('profile_img'), addDoctor);

//update doctor profile
router.put("/update-doctor-profile/:doctorId", authMiddleware, upload.single('profile_img'), updateDoctorProfile);
=======
router.post("/add-doctor", authMiddleware, adminOnly, addDoctor);
>>>>>>> fdaae64 (Major Backend Completed)

//add pharmacist
router.post("/add-pharmacist", authMiddleware, adminOnly, addPharmacist);

//get dashboard stats
router.get("/dashboard-stats", authMiddleware, adminOnly, getDashboardStats);

module.exports = router;
