const Pharmacist = require("../models/pharmacistModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Pharmacist Login
exports.pharmacistLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        // Check pharmacist exists
        const pharmacist = await Pharmacist.findOne({ email });

        if (!pharmacist) {
            return res.status(404).json({
                message: "Pharmacist not found"
            });
        }

        // Check account status
        if (pharmacist.status !== "active") {
            return res.status(403).json({
                message: "Account is inactive. Please contact admin."
            });
        }

        // Compare password
        const isMatch = await bcrypt.compare(
            password,
            pharmacist.password
        );

        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid credentials"
            });
        }

        // Update last login
        pharmacist.last_login = new Date();
        await pharmacist.save();

        // Generate JWT
        const token = jwt.sign(
            {
                id: pharmacist._id,
                role: "pharmacist"
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.status(200).json({
            message: "Login successful",
            token,
            pharmacist: {
                _id: pharmacist._id,
                first_name: pharmacist.first_name,
                last_name: pharmacist.last_name,
                email: pharmacist.email,
                pharmacy_name: pharmacist.pharmacy_name,
                status: pharmacist.status,
                is_verified: pharmacist.is_verified
            }
        });

    } catch (error) {
        res.status(500).json({
            message: "Error logging in pharmacist",
            error: error.message
        });
    }
};

// Get Logged-in Pharmacist Profile
exports.getPharmacistProfile = async (req, res) => {
    try {

        const pharmacist = await Pharmacist.findById(req.user.id)
            .select("-password");

        if (!pharmacist) {
            return res.status(404).json({
                message: "Pharmacist not found"
            });
        }

        res.status(200).json({
            message: "Profile fetched successfully",
            pharmacist
        });

    } catch (error) {
        res.status(500).json({
            message: "Error fetching profile",
            error: error.message
        });
    }
};

// Get Single Pharmacist By ID
exports.getSinglePharmacist = async (req, res) => {
    try {

        const pharmacist = await Pharmacist.findById(req.params.id)
            .select("-password");

        if (!pharmacist) {
            return res.status(404).json({
                message: "Pharmacist not found"
            });
        }

        res.status(200).json({
            message: "Pharmacist fetched successfully",
            pharmacist
        });

    } catch (error) {
        res.status(500).json({
            message: "Error fetching pharmacist",
            error: error.message
        });
    }
};

// Get All Pharmacists
exports.getAllPharmacists = async (req, res) => {
    try {

        const pharmacists = await Pharmacist.find()
            .select("-password")
            .sort({ createdAt: -1 });

        res.status(200).json({
            message: "Pharmacists fetched successfully",
            total_pharmacists: pharmacists.length,
            pharmacists
        });

    } catch (error) {
        res.status(500).json({
            message: "Error fetching pharmacists",
            error: error.message
        });
    }
};

// Update Pharmacist Profile
exports.updatePharmacistProfile = async (req, res) => {
    try {

        const pharmacist = await Pharmacist.findById(req.user.id);

        if (!pharmacist) {
            return res.status(404).json({
                message: "Pharmacist not found"
            });
        }

        const allowedUpdates = [
            "first_name",
            "last_name",
            "phone",
            "address",
            "profile_img",
            "working_days",
            "work_time_start",
            "work_time_end",
            "pharmacy_name",
            "qualification"
        ];

        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                pharmacist[field] = req.body[field];
            }
        });

        await pharmacist.save();

        res.status(200).json({
            message: "Profile updated successfully",
            pharmacist: {
                _id: pharmacist._id,
                first_name: pharmacist.first_name,
                last_name: pharmacist.last_name,
                email: pharmacist.email,
                phone: pharmacist.phone,
                pharmacy_name: pharmacist.pharmacy_name
            }
        });

    } catch (error) {
        res.status(500).json({
            message: "Error updating profile",
            error: error.message
        });
    }
};

// Change Password
exports.changePassword = async (req, res) => {
    try {

        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                message: "Current password and new password are required"
            });
        }

        const pharmacist = await Pharmacist.findById(req.user.id);

        if (!pharmacist) {
            return res.status(404).json({
                message: "Pharmacist not found"
            });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(
            currentPassword,
            pharmacist.password
        );

        if (!isMatch) {
            return res.status(400).json({
                message: "Current password is incorrect"
            });
        }

        // Prevent same password
        const isSamePassword = await bcrypt.compare(
            newPassword,
            pharmacist.password
        );

        if (isSamePassword) {
            return res.status(400).json({
                message: "New password cannot be the same as the current password"
            });
        }

        // Hash new password
        pharmacist.password = await bcrypt.hash(newPassword, 10);

        await pharmacist.save();

        res.status(200).json({
            message: "Password changed successfully"
        });

    } catch (error) {
        res.status(500).json({
            message: "Error changing password",
            error: error.message
        });
    }
};

//update pharmist status by admin 

exports.updatePharmacistStatus = async (req, res) => {
    try {

        const { status } = req.body;

        const validStatuses = [
            "active",
            "inactive",
            "on-leave",
            "blocked"
        ];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid status"
            });
        }

        const pharmacist = await Pharmacist.findById(req.params.id);

        if (!pharmacist) {
            return res.status(404).json({
                message: "Pharmacist not found"
            });
        }

        pharmacist.status = status;

        await pharmacist.save();

        res.status(200).json({
            message: `Pharmacist status updated to ${status}`,
            pharmacist
        });

    } catch (error) {
        res.status(500).json({
            message: "Error updating pharmacist status",
            error: error.message
        });
    }
};

//verify pharmacist account 
exports.verifyPharmacist = async (req, res) => {
    try {

        const pharmacist = await Pharmacist.findById(req.params.id);

        if (!pharmacist) {
            return res.status(404).json({
                message: "Pharmacist not found"
            });
        }

        pharmacist.is_verified = true;

        await pharmacist.save();

        res.status(200).json({
            message: "Pharmacist verified successfully",
            pharmacist
        });

    } catch (error) {
        res.status(500).json({
            message: "Error verifying pharmacist",
            error: error.message
        });
    }
};
