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
    updateUser,
    inactivateUser,
    blockUser,
    activateUser
} = require("../controllers/userController");

const {authMiddleware} = require("../middleware/authMiddleware");
const adminOnly = require("../middleware/adminMiddleware");

//register user
router.post("/register", registerUser);

//login user
router.post("/login", loginUser);

//get logged in users profile
router.get("/profile", authMiddleware, getUserProfile);

//get all users
router.get("/all", authMiddleware, adminOnly, getAllUsers);

//get single user(admin fetches this)
router.get("/:id", authMiddleware, adminOnly, getSingleUser);

//update a users profile
router.put("/update", authMiddleware, updateUser);

//inactivates the user profile by admin(soft delete)
router.put("/inactivate/:id", authMiddleware, adminOnly, inactivateUser);
    
//blocks user profile by admin(restricted by admin)
router.put("/block/:id", authMiddleware, adminOnly, blockUser);

//reactivates user profile by admin after inactivating/blocking
router.put("/activate/:id", authMiddleware, adminOnly, activateUser);


module.exports = router;