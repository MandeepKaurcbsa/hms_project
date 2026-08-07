const express = require("express");
const router = express.Router();

const pharmacistController = require("../controllers/pharmacistController");

const authMiddleware = require("../middleware/authMiddleware");

const adminOnly = require("../middleware/adminMiddleware");

const pharmacistOnly = require("../middleware/pharmacistMiddleware");

//login pharmacist 
router.post("/login", pharmacistController.pharmacistLogin);

//fetch profile api by pharmacist 
 router.get("/profile", authMiddleware, pharmacistOnly, pharmacistController.getPharmacistProfile);

//get all pharmacist 
router.get("/all", authMiddleware, adminOnly, pharmacistController.getAllPharmacists);

//get single pharmacist 
 router.get("/:id", authMiddleware, adminOnly, pharmacistController.getSinglePharmacist);

const upload = require("../middleware/uploadMiddleware");

//update pharmacist profile 
router.put("/profile", authMiddleware, pharmacistOnly, upload.single("profile_img"), pharmacistController.updatePharmacistProfile);

//change password of pharmacist 
router.put("/change-password", authMiddleware, pharmacistOnly, pharmacistController.changePassword);

//update pharmacist status
router.put("/:id/status", authMiddleware, adminOnly, pharmacistController.updatePharmacistStatus);

//reset password (unauthenticated / forgot password)
router.put("/reset-password", pharmacistController.resetPassword);

module.exports = router;