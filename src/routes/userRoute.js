//userController -> userRoute
//api endponts

const express = require("express");
const router = express.Router();

const {
    registerUser,
    loginUser,
    getUser
} = require("../controllers/userController");

const authMiddleware = require("../middleware/authMiddleware");

//register user
router.post("/register", registerUser);

//login user
router.post("/login", loginUser);

//get users profile
router.get("/profile", authMiddleware, getUser);

module.exports = router;