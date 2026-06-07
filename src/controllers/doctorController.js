const Doctor = require("../models/doctorModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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

        // update allowed fields only

        if (phone) doctor.phone = phone;

        if (profile_img) doctor.profile_img = profile_img;

        if (consult_fee !== undefined)
            doctor.consult_fee = consult_fee;

        if (consult_mode)
            doctor.consult_mode = consult_mode;

        if (available_days)
            doctor.available_days = available_days;

        if (work_time_start)
            doctor.work_time_start = work_time_start;

        if (work_time_end)
            doctor.work_time_end = work_time_end;

        if (visit_address)
            doctor.visit_address = visit_address;

        await doctor.save();

        res.status(200).json({
            message: "Profile updated successfully",
            doctor
        });

    } catch (error) {
        res.status(500).json({
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