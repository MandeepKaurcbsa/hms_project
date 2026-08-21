const Doctor = require("../models/doctorModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cloudinary = require("../config/cloudinary");

// Doctor Login
exports.doctorLogin = async (req, res) => {
    try {

        const { email, password } = req.body;

        // Check required fields
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        // Find doctor
        const doctor = await Doctor.findOne({ email });

        if (!doctor) {
            return res.status(404).json({
                success: false,
                message: "Doctor not found"
            });
        }

        // Check account status
        if (doctor.status === "blocked") {
            return res.status(403).json({
                success: false,
                message: "Your account has been blocked"
            });
        }

        if (doctor.status === "inactive") {
            return res.status(403).json({
                success: false,
                message: "Your account is inactive"
            });
        }

        // Compare password
        const isMatch = await bcrypt.compare(
            password,
            doctor.password
        );

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        // Update last login
        doctor.last_login = new Date();
        await doctor.save();

        // Generate token
        const token = jwt.sign(
            {
                id: doctor._id,
                role: "doctor"
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.status(200).json({
            success: true,
            message: "Doctor login successful",
            token,
            doctor: {
                id: doctor._id,
                first_name: doctor.first_name,
                last_name: doctor.last_name,
                email: doctor.email,
                last_login : doctor.last_login
            }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

//doctor profile admin can fetch 
exports.getSingleDoctor = async (req, res) => {
    try {

        const doctor = await Doctor.findById(req.params.id)
            .select("-password");

        if (!doctor) {
            return res.status(404).json({
                message: "Doctor not found"
            });
        }

    res.status(200).json({
    message: "Doctor fetched successfully",
    doctor
    });

    } catch (error) {
        res.status(500).json({
            message: "Error fetching doctor",
            error: error.message
        });
    }
};

//doctor profile  logged in doctor can view 
exports.getDoctorProfile = async (req, res) => {
    try {

        const doctor = await Doctor.findById(req.user.id)
            .select("-password");

        if (!doctor) {
            return res.status(404).json({
                message: "Doctor not found"
            });
        }

        res.status(200).json({
            message: "Doctor fetched successfully",
            doctor
        });

    } catch (error) {
        res.status(500).json({
            message: "Error fetching doctor",
            error: error.message
        });
    }
};

exports.getActiveDoctors = async (req, res) => {
    try {
        const doctors = await Doctor.find({ status: "active" })
            .select("-password")
            .sort({ createdAt: -1 });

        res.status(200).json({
            message: "Active doctors fetched successfully",
            totalDoctors: doctors.length,
            doctors
        });
    } catch (error) {
        res.status(500).json({
            message: "Error fetching active doctors",
            error: error.message
        });
    }
};

exports.getAllDoctors = async (req, res) => {
    try {

        const doctors = await Doctor.find()
            .select("-password");

        res.status(200).json({
            message: "Doctors fetched successfully",
            totalDoctors: doctors.length,
            doctors
        });

    } catch (error) {
        res.status(500).json({
            message: "Error fetching doctors",
            error: error.message
        });
    }
};

// update doctor profile
exports.updateDoctorProfile = async (req, res) => {
    try {
        const {
            phone,
            profile_img,
            signature,
            consult_fee,
            consult_mode,
            available_days,
            work_time_start,
            work_time_end,
            visit_address
        } = req.body;

        const doctor = await Doctor.findById(req.user.id);

        if (!doctor) {
            return res.status(404).json({
                message: "Doctor not found"
            });
        }

        let profileImgUrl = doctor.profile_img;

        try {
            if (req.files?.profile_img?.[0]) {
                const b64 = Buffer.from(req.files.profile_img[0].buffer).toString('base64');
                let dataURI = "data:" + req.files.profile_img[0].mimetype + ";base64," + b64;
                const result = await cloudinary.uploader.upload(dataURI, { folder: 'medipulse/doctors' });
                profileImgUrl = result.secure_url;
            } else if (req.file) {
                const b64 = Buffer.from(req.file.buffer).toString('base64');
                let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
                const result = await cloudinary.uploader.upload(dataURI, { folder: 'medipulse/doctors' });
                profileImgUrl = result.secure_url;
            } else if (profile_img) {
                profileImgUrl = profile_img;
            }
        } catch (imgErr) {
            console.error("Cloudinary profile_img upload error:", imgErr.message);
            if (profile_img) profileImgUrl = profile_img;
        }

        let signatureUrl = doctor.signature || "";
        if (req.files?.signature?.[0]) {
            const b64 = Buffer.from(req.files.signature[0].buffer).toString('base64');
            let dataURI = "data:" + req.files.signature[0].mimetype + ";base64," + b64;
            try {
                const result = await cloudinary.uploader.upload(dataURI, { folder: 'medipulse/signatures' });
                signatureUrl = result.secure_url;
            } catch (e) {
                console.error("Cloudinary signature file upload error:", e.message);
                signatureUrl = dataURI;
            }
        } else if (signature && typeof signature === 'string' && signature.startsWith('data:image/')) {
            try {
                const result = await cloudinary.uploader.upload(signature, { folder: 'medipulse/signatures' });
                signatureUrl = result.secure_url;
            } catch (e) {
                console.error("Cloudinary signature base64 upload error:", e.message);
                signatureUrl = signature;
            }
        } else if (signature !== undefined) {
            signatureUrl = signature;
        }

        // update allowed fields only
        if (phone) doctor.phone = phone;
        if (profileImgUrl) doctor.profile_img = profileImgUrl;
        if (signatureUrl !== undefined) doctor.signature = signatureUrl;
        if (consult_fee !== undefined && consult_fee !== '' && !isNaN(consult_fee)) doctor.consult_fee = Number(consult_fee);
        if (consult_mode) doctor.consult_mode = consult_mode;

        if (available_days) {
            let parsedDays = available_days;
            if (typeof available_days === 'string') {
                try {
                    parsedDays = JSON.parse(available_days);
                } catch (e) {
                    parsedDays = available_days.split(',').map(d => d.trim());
                }
            }
            doctor.available_days = parsedDays;
        }

        if (work_time_start) doctor.work_time_start = work_time_start;
        if (work_time_end) doctor.work_time_end = work_time_end;
        if (visit_address) doctor.visit_address = visit_address;

        await doctor.save();

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            doctor
        });

    } catch (error) {
        console.error("Error updating doctor profile:", error);
        return res.status(500).json({
            success: false,
            message: "Error updating profile",
            error: error.message
        });
    }
};

// change doctor password
exports.changePassword = async (req, res) => {
    try {

        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                message: "Current password and new password are required"
            });
        }

        const doctor = await Doctor.findById(req.user.id);

        if (!doctor) {
            return res.status(404).json({
                message: "Doctor not found"
            });
        }

        // verify current password
        const isMatch = await bcrypt.compare(
            currentPassword,
            doctor.password
        );

        if (!isMatch) {
            return res.status(400).json({
                message: "Current password is incorrect",
                _id : doctor._id
            });
        }

        // prevent same password
        if (currentPassword === newPassword) {
            return res.status(400).json({
                message: "New password must be different from current password"
            });
        }

        // hash new password
        const hashedPassword = await bcrypt.hash(
            newPassword,
            10
        );

        doctor.password = hashedPassword;

        await doctor.save();

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

// Update Doctor Status (Admin Only)

exports.updateDoctorStatus = async (req, res) => {
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

        const doctor = await Doctor.findById(req.params.id);

        if (!doctor) {
            return res.status(404).json({
                message: "Doctor not found"
            });
        }

        doctor.status = status;

        await doctor.save();

        res.status(200).json({
            message: `Doctor status updated to ${status}`,
            doctor
        });

    } catch (error) {
        res.status(500).json({
            message: "Error updating doctor status",
            error: error.message
        });
    }
};

// Reset Password (unauthenticated, after OTP verification)
exports.resetPassword = async (req, res) => {
    try {
        const { email, newPassword } = req.body;

        if (!email || !newPassword) {
            return res.status(400).json({
                message: "Email and new password are required"
            });
        }

        const doctor = await Doctor.findOne({ email });

        if (!doctor) {
            return res.status(404).json({
                message: "Doctor not found"
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        doctor.password = hashedPassword;

        await doctor.save();

        res.status(200).json({
            message: "Password reset successfully"
        });

    } catch (error) {
        res.status(500).json({
            message: "Error resetting password",
            error: error.message
        });
    }
};