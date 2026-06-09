//adminController -> admminRoute
//handles admin routes

const express = require("express");
const router = express.Router();

const {
    createAdmin,
    adminLogin,
    getAdminProfile,
    addDoctor,
    addPharmacist
} = require("../controllers/adminController");

const {authMiddleware} = require("../middleware/authMiddleware");

//create admin 
router.post("/register", createAdmin);

//admin login
router.post("/login", adminLogin);

//admin profile fetch
router.get("/profile", authMiddleware, getAdminProfile);

//add doctor
router.post("/add-doctor", authMiddleware, addDoctor);

//add pharmacist
router.post("/add-pharmacist", authMiddleware, addPharmacist);

module.exports = router;
