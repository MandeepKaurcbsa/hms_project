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

const {authMiddleware} = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

//create admin 
router.post("/register", createAdmin);

//admin login
router.post("/login", adminLogin);

//admin profile fetch
router.get("/profile", authMiddleware, getAdminProfile);

//add doctor
router.post("/add-doctor", authMiddleware, upload.single('profile_img'), addDoctor);

//update doctor profile
router.put("/update-doctor-profile/:doctorId", authMiddleware, upload.single('profile_img'), updateDoctorProfile);

//add pharmacist
router.post("/add-pharmacist", authMiddleware, addPharmacist);

//get dashboard stats
router.get("/dashboard-stats", authMiddleware, getDashboardStats);

module.exports = router;
