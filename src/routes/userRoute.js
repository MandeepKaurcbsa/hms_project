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
    updateUser
} = require("../controllers/userController");

const authMiddleware = require("../middleware/authMiddleware");

//register user
router.post("/register", registerUser);

//login user
router.post("/login", loginUser);

//get logged in users profile
router.get("/profile", authMiddleware, getUserProfile);

//get all users
router.get("/", getAllUsers);

//get single user(admin fetches this)
router.get("/:id", getSingleUser);

//update a users profile
router.put("/:id", authMiddleware, updateUser);

module.exports = router;