//adminController -> adminRoute
//handles admin routes

const express = require("express");
const router = express.Router();

const {
    createAdmin,
    adminLogin,
    getAdminProfile,
    changeAdminPassword,
    resetAdminPassword,
    updateAdminProfile,
    addDoctor,
    updateDoctorProfile,
    addPharmacist,
    updatePharmacistProfile,
    getDashboardStats
} = require("../controllers/adminController");

const authMiddleware = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");
const upload = require("../middleware/uploadMiddleware");

//create admin
router.post("/register", createAdmin);

//admin login
router.post("/login", adminLogin);

//admin reset password (forgot password)
router.put("/reset-password", resetAdminPassword);

//admin profile fetch
router.get("/profile", authMiddleware, adminOnly, getAdminProfile);

//update admin profile
router.put("/update-profile", authMiddleware, adminOnly, updateAdminProfile);

//change admin password
router.put("/change-password", authMiddleware, adminOnly, changeAdminPassword);

//add doctor
router.post(
    "/add-doctor",
    authMiddleware,
    adminOnly,
    upload.single("profile_img"),
    addDoctor
);

//update doctor profile
router.put(
    "/update-doctor-profile/:doctorId",
    authMiddleware,
    adminOnly,
    upload.single("profile_img"),
    updateDoctorProfile
);

//add pharmacist
router.post(
    "/add-pharmacist",
    authMiddleware,
    adminOnly,
    upload.single("profile_img"),
    addPharmacist
);

//update pharmacist profile
router.put(
    "/update-pharmacist-profile/:pharmacistId",
    authMiddleware,
    adminOnly,
    updatePharmacistProfile
);

//get dashboard stats
router.get("/dashboard-stats", authMiddleware, adminOnly, getDashboardStats);

module.exports = router;