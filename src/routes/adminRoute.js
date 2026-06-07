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

const authmiddleware = require("../middleware/authMiddleware");

//create admin 
router.post("/register", createAdmin);

//admin login
router.post("/login", adminLogin);

//admin profile fetch
router.get("/profile", authmiddleware, getAdminProfile);

//add doctor
router.post("/add-doctor", authmiddleware, addDoctor);

//add pharmacist
router.post("/add-pharmacist", authmiddleware, addPharmacist);

module.exports = router;
