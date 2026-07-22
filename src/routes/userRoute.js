//userController -> userRoute
//api endponts

const express = require("express");
const router = express.Router();

const {
    registerUser,
    loginUser,
    getSingleUser,
    getUserProfile,
    getAllUsers,
    getAllUsersWithPatients,
    updateUser,
    inactivateUser,
    blockUser,
    activateUser,
    sendOtp,
    verifyOtp,
    resetPassword
} = require("../controllers/userController");

const authMiddleware = require("../middleware/authMiddleware");
const userOnly = require("../middleware/userMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

//register user
router.post("/register", registerUser);

// OTP routes
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

//login user
router.post("/login", loginUser);

//get logged in users profile
router.get("/profile", authMiddleware, userOnly, getUserProfile);

//get all users
router.get("/all", authMiddleware, adminOnly, getAllUsers);

// get all users with their patients (admin)
router.get("/all-with-patients", authMiddleware, adminOnly, getAllUsersWithPatients);

//get single user(admin fetches this)
router.get("/:id", authMiddleware, adminOnly, getSingleUser);

//update a users profile
router.put("/update", authMiddleware, userOnly, updateUser);

//inactivates the user profile by admin(soft delete)
router.put("/inactivate/:id", authMiddleware, adminOnly, inactivateUser);
    
//blocks user profile by admin(restricted by admin)
router.put("/block/:id", authMiddleware, adminOnly, blockUser);

//reactivates user profile by admin after inactivating/blocking
router.put("/activate/:id", authMiddleware, adminOnly, activateUser);


module.exports = router;