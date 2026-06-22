const express = require("express");
const router = express.Router();

const pharmacistController = require("../controllers/pharmacistController");

const {authMiddleware} = require("../middleware/authMiddleware");

const adminOnly = require("../middleware/adminMiddleware");

//login pharmacist 
router.post("/login", pharmacistController.pharmacistLogin);

//fetch profile api by pharmacist 
 router.get("/profile", authMiddleware, pharmacistController.getPharmacistProfile);

//get all pharmacist 
router.get("/all", authMiddleware, adminOnly, pharmacistController.getAllPharmacists);

//get single pharmacist 
 router.get("/:id", authMiddleware, adminOnly, pharmacistController.getSinglePharmacist);

//update pharmacist profile 
router.put("/profile", authMiddleware, pharmacistController.updatePharmacistProfile);

//change password of pharmacist 
router.put("/change-password", authMiddleware, pharmacistController.changePassword);

//update pharmacist status
router.put("/:id/status", authMiddleware, adminOnly, pharmacistController.updatePharmacistStatus);

//verify pharmacist account 
router.put("/:id/verify", authMiddleware, adminOnly, pharmacistController.verifyPharmacist);

module.exports = router;