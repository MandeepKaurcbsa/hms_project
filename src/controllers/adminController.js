//admin model -> admin controller 
// handles admin authentication and management logic

const Admin = require("../models/adminModel");
const Doctor = require("../models/doctorModel");
const Pharmacist = require("../models/pharmacistModel");
const Patient = require("../models/patientModel");
const Appointment = require("../models/appointModel");

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cloudinary = require("../config/cloudinary");
 
// Create Admin
exports.createAdmin = async (req, res) => {
    try {
        const {
            fullname,
            email,
            password,
            phone,
            profile_img
        } = req.body;

        // Check if admin already exists
        const adminExists = await Admin.findOne({ email });

        if (adminExists) {
            return res.status(400).json({
                message: "Admin already exists"
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create admin
        const admin = await Admin.create({
            fullname,
            email,
            password: hashedPassword,
            phone,
            profile_img
        });

        res.status(201).json({
            message: "Admin created successfully",
            admin
        });

    } catch (error) {
        res.status(500).json({
            message: "Error creating admin",
            error: error.message
        });
    }
};

//Admin login 
exports.adminLogin = async (req, res) => {
    try {
        const {email, password} = req.body;
        if (!email || !password) {
            return res.status(400).json({
                message: "Please enter both email and password"
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        // checks if admin is there or not 
        const admin = await Admin.findOne({ email: cleanEmail });
        if(!admin){
            return res.status(400).json({
                message : "Invalid email or password"
            });
        }
        //compares password
        const isMatch = await bcrypt.compare(password, admin.password);
        if(!isMatch){
            return res.status(400).json({
                message : "Invalid email or password"
            });
        }

        //generates token 
        const token = jwt.sign(
            {
                id : admin._id,
                role : "admin"
            },
            process.env.JWT_SECRET,
            {expiresIn : "1d"}
        );

        res.status(200).json({
            message : "Admin login successfull",
            token
        });

    } catch (error) {
        res.status(500).json({
            message : "Error logging in admin",
            error : error.message
        });
    }
};

//fetch admin profile 
exports.getAdminProfile = async (req, res) => {
    try {
        const admin = await Admin.findById(req.user.id).select("-password");

        if(!admin){
            return res.status(400).json({
                message : "Admin not found"
            });
        }

        res.status(200).json(admin);

    } catch (error) {
        res.status(500).json({
            message : "Error fetching admin profile",
            error : error.message
        });
    }
};

// Change Admin Password
exports.changeAdminPassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                message: "Current password and new password are required"
            });
        }

        const admin = await Admin.findById(req.user.id);
        if (!admin) {
            return res.status(404).json({
                message: "Admin account not found"
            });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, admin.password);
        if (!isMatch) {
            return res.status(400).json({
                message: "Current password is incorrect"
            });
        }

        // Prevent same password
        const isSamePassword = await bcrypt.compare(newPassword, admin.password);
        if (isSamePassword) {
            return res.status(400).json({
                message: "New password cannot be the same as current password"
            });
        }

        // Hash new password and save
        admin.password = await bcrypt.hash(newPassword, 10);
        await admin.save();

        res.status(200).json({
            success: true,
            message: "Password changed successfully"
        });

    } catch (error) {
        console.error("Error changing admin password:", error);
        res.status(500).json({
            message: "Error changing admin password",
            error: error.message
        });
    }
};

// Reset Admin Password (Forgot Password)
exports.resetAdminPassword = async (req, res) => {
    try {
        const { email, newPassword } = req.body;

        if (!email || !newPassword) {
            return res.status(400).json({
                message: "Email and new password are required"
            });
        }

        if (newPassword.length < 4) {
            return res.status(400).json({
                message: "New password must be at least 4 characters long"
            });
        }

        const cleanEmail = email.toLowerCase().trim();
        const admin = await Admin.findOne({ email: cleanEmail });

        if (!admin) {
            return res.status(404).json({
                message: "Admin account with this email not found"
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        admin.password = hashedPassword;

        await admin.save();

        res.status(200).json({
            success: true,
            message: "Password reset successfully! You can now log in with your new password."
        });

    } catch (error) {
        console.error("Error resetting admin password:", error);
        res.status(500).json({
            message: "Error resetting password",
            error: error.message
        });
    }
};

// Update Admin Profile
exports.updateAdminProfile = async (req, res) => {
    try {
        const { fullname, email, phone, profile_img } = req.body;
        const admin = await Admin.findById(req.user.id);

        if (!admin) {
            return res.status(404).json({
                message: "Admin account not found"
            });
        }

        if (fullname) admin.fullname = fullname.trim();
        if (email) {
            const cleanEmail = email.trim().toLowerCase();
            const existing = await Admin.findOne({ email: cleanEmail, _id: { $ne: admin._id } });
            if (existing) {
                return res.status(400).json({
                    message: "Email is already in use by another admin"
                });
            }
            admin.email = cleanEmail;
        }
        if (phone) admin.phone = phone.trim();
        if (profile_img !== undefined) admin.profile_img = profile_img;

        await admin.save();

        res.status(200).json({
            success: true,
            message: "Admin profile updated successfully",
            admin: {
                id: admin._id,
                fullname: admin.fullname,
                email: admin.email,
                phone: admin.phone,
                profile_img: admin.profile_img
            }
        });

    } catch (error) {
        console.error("Error updating admin profile:", error);
        res.status(500).json({
            message: "Error updating admin profile",
            error: error.message
        });
    }
};

// add doctor

exports.addDoctor = async (req, res) => {
    try {
        const {
            first_name,
            last_name,
            email,
            password,
            phone,
            profile_img,
            license_no,
            department,
            specialization,
            qualification,
            experience_year,
            consult_fee,
            consult_mode,
            visit_address,
            work_time_start,
            work_time_end,
            status,
            is_verified
        } = req.body;
        
        let available_days = req.body.available_days;
        if (typeof available_days === 'string') {
            try {
                available_days = JSON.parse(available_days);
            } catch (e) {
                available_days = available_days.split(',').map(d => d.trim());
            }
        }

        let profileImgUrl = req.body.profile_img || 'https://via.placeholder.com/150';

        // Check if an image was uploaded
        if (req.file) {
            const b64 = Buffer.from(req.file.buffer).toString('base64');
            let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
            const result = await cloudinary.uploader.upload(dataURI, {
                folder: 'medipulse/doctors'
            });
            profileImgUrl = result.secure_url;
        }

        //checking if doctor exists 
        const doctorExists = await Doctor.findOne({email});

        if(doctorExists){
            return res.status(400).json({
                message : "Doctor already exists"
            });
        }

        //hash password
        const hashed = await bcrypt.hash(password, 10);
        
        //create doctor
        const doctor = await Doctor.create({
            first_name,
            last_name,
            email,
            password : hashed,
            phone,
            profile_img: profileImgUrl,
            license_no,
            department,
            specialization,
            qualification,
            experience_year,
            consult_fee,
            consult_mode,
            visit_address,
            available_days,
            work_time_start,
            work_time_end,
            status,
            is_verified
        });

        res.status(201).json({
            message : "Doctor added successfully",
            _id : doctor._id
        });

    } catch (error) {
        res.status(500).json({
            message : "Error adding doctor",
            error : error.message 
        });
    }
};

// Update Doctor Profile
exports.updateDoctorProfile = async (req, res) => {
    try {
        const { doctorId } = req.params;
        
        const doctor = await Doctor.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({ message: "Doctor not found" });
        }

        let profileImgUrl = doctor.profile_img;

        if (req.file) {
            const b64 = Buffer.from(req.file.buffer).toString('base64');
            let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
            const result = await cloudinary.uploader.upload(dataURI, {
                folder: 'medipulse/doctors'
            });
            profileImgUrl = result.secure_url;
        }

        const updateData = { ...req.body, profile_img: profileImgUrl };

        if (updateData.available_days && typeof updateData.available_days === 'string') {
            try {
                updateData.available_days = JSON.parse(updateData.available_days);
            } catch (e) {
                updateData.available_days = updateData.available_days.split(',').map(d => d.trim());
            }
        }

        const updatedDoctor = await Doctor.findByIdAndUpdate(doctorId, updateData, { new: true });

        res.status(200).json({
            message: "Doctor profile updated successfully",
            doctor: updatedDoctor
        });
    } catch (error) {
        res.status(500).json({
            message: "Error updating doctor profile",
            error: error.message
        });
    }
};

//add pharmacist 

exports.addPharmacist = async (req,res) => {
    try {
        const {
            first_name,
            last_name,
            email,
            password,
            phone,
            pharmacy_name,
            qualification,
            license_no,
            address,
            profile_img,
            work_time_start,
            work_time_end,
            status,
            is_verified
        } = req.body;

        let working_days = req.body.working_days;
        if (typeof working_days === 'string') {
            try {
                working_days = JSON.parse(working_days);
            } catch (e) {
                working_days = working_days.split(',').map(d => d.trim());
            }
        }

        let profileImgUrl = req.body.profile_img || '';

        if (req.file) {
            const b64 = Buffer.from(req.file.buffer).toString('base64');
            let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
            const result = await cloudinary.uploader.upload(dataURI, {
                folder: 'medipulse/pharmacists'
            });
            profileImgUrl = result.secure_url;
        }

        //checking if pharmacist exists 
        const pharmacistExists = await Pharmacist.findOne({email});
        if(pharmacistExists){
            return res.status(400).json({
                message : "Pharmacist already exists"
            });
        }

        //hashes password
        const hashed = await bcrypt.hash(password, 10);

        //create pharmacist
        const pharmacist = await Pharmacist.create({
            first_name,
            last_name,
            email,
            password : hashed,
            phone,
            pharmacy_name,
            qualification,
            license_no,
            address,
            profile_img: profileImgUrl,
            working_days,
            work_time_start,
            work_time_end,
            status,
            is_verified
        });

        res.status(201).json({
            message : "Pharmacist added Successfully",
            _id : pharmacist._id
        });

    } catch (error) {
        res.status(500).json({
            message : "Error adding pharmacist",
            error : error.message
        });
    }
};

// Update Pharmacist Profile (Admin)
exports.updatePharmacistProfile = async (req, res) => {
    try {
        const { pharmacistId } = req.params;
        const pharmacist = await Pharmacist.findById(pharmacistId);
        if (!pharmacist) {
            return res.status(404).json({ message: "Pharmacist not found" });
        }

        const updateData = { ...req.body };
        if (updateData.working_days && typeof updateData.working_days === 'string') {
            try {
                updateData.working_days = JSON.parse(updateData.working_days);
            } catch (e) {
                updateData.working_days = updateData.working_days.split(',').map(d => d.trim()).filter(Boolean);
            }
        }

        delete updateData.password;

        const updatedPharmacist = await Pharmacist.findByIdAndUpdate(pharmacistId, updateData, { new: true });

        res.status(200).json({
            message: "Pharmacist updated successfully",
            pharmacist: updatedPharmacist
        });
    } catch (error) {
        res.status(500).json({
            message: "Error updating pharmacist profile",
            error: error.message
        });
    }
};

// get dashboard stats
exports.getDashboardStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // 1. Total Patients
        const totalPatients = await Patient.countDocuments().catch(() => 0);

        // 2. Appointments Today
        const appointmentsToday = await Appointment.countDocuments({
            appointment_date: {
                $gte: today,
                $lt: tomorrow
            }
        }).catch(() => 0);

        // 3. Total Revenue
        const allAppointments = await Appointment.find({
            status: "completed"
        }).catch(() => []);

        const totalRevenue = allAppointments.reduce(
            (sum, app) => sum + (app.consultation_fee || 0),
            0
        );

        // 4. Quick Stats
        const newPatientsToday = await Patient.countDocuments({
            createdAt: {
                $gte: today,
                $lt: tomorrow
            }
        }).catch(() => 0);

        const consultationsDone = allAppointments.length;
        const pendingReports = 5;

        // 5. Recent Appointments List
        const recentAppointmentsList = await Appointment.find()
            .select("appointment_time status doctor_id patient_id")
            .populate("doctor_id", "first_name last_name")
            .populate("patient_id", "first_name last_name")
            .sort({ createdAt: -1 })
            .limit(10)
            .catch(() => []);

        // Map it for the frontend
        const mappedAppointments = recentAppointmentsList.map(app => {
            const pObj = app.patient_id;
            const pName = (pObj && typeof pObj === 'object' && pObj.first_name)
                ? `${pObj.first_name} ${pObj.last_name || ''}`.trim()
                : (typeof pObj === 'string' ? pObj : "Patient");

            const dObj = app.doctor_id;
            const dName = (dObj && typeof dObj === 'object' && dObj.first_name)
                ? `Dr. ${dObj.first_name} ${dObj.last_name || ''}`.trim()
                : (typeof dObj === 'string' ? dObj : "Doctor");

            return {
                name: pName,
                patient: pName,
                time: app.appointment_time || "10:00 AM",
                doctor: dName,
                status: app.status || "pending",
                avatar: (pName && pName !== 'Patient') ? pName.substring(0, 2).toUpperCase() : "PA"
            };
        });

        res.status(200).json({
            success: true,
            message: "Dashboard stats fetched successfully",
            stats: {
                totalPatients: totalPatients || 0,
                appointmentsToday: appointmentsToday || 0,
                totalRevenue: totalRevenue || 0,
                recoveryRate: "95%",
                quickStats: {
                    newPatientsToday: newPatientsToday || 0,
                    consultationsDone: consultationsDone || 0,
                    pendingReports: pendingReports || 0
                },
                recentAppointmentsList: mappedAppointments,
                todaysAppointmentsList: mappedAppointments
            }
        });

    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching dashboard stats",
            error: error.message
        });
    }
};