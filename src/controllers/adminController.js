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
        // checks if admin is there or not 
        const admin = await Admin.findOne({email});
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
            working_days,
            work_time_start,
            work_time_end,
            status,
            is_verified
        } = req.body;

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
            profile_img,
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

// get dashboard stats
exports.getDashboardStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // 1. Total Patients
        const totalPatients = await Patient.countDocuments();

        // 2. Appointments Today
        const appointmentsToday = await Appointment.countDocuments({
            appointment_date: {
                $gte: today,
                $lt: tomorrow
            }
        });

        // 3. Total Revenue
        const allAppointments = await Appointment.find({
            status: "completed"
        });
        const totalRevenue = allAppointments.reduce((sum, app) => sum + (app.consultation_fee || 0), 0);

        // 4. Quick Stats
        const newPatientsToday = await Patient.countDocuments({
            createdAt: {
                $gte: today,
                $lt: tomorrow
            }
        });
        const consultationsDone = allAppointments.length;
        const pendingReports = 5; // Placeholder for now

        // 5. Recent Appointments List
        const recentAppointmentsList = await Appointment.find()
        .populate("doctor_id", "first_name last_name")
        .populate("patient_id", "first_name last_name")
        .limit(10)
        .sort({ createdAt: -1 });

        // Map it for the frontend
        const mappedAppointments = recentAppointmentsList.map(app => {
            let pName = app.patient_id ? `${app.patient_id.first_name} ${app.patient_id.last_name}` : "Unknown Patient";
            let dName = app.doctor_id ? `Dr. ${app.doctor_id.first_name} ${app.doctor_id.last_name}` : "Unknown Doctor";
            return {
                name: pName,
                time: app.appointment_time,
                doctor: dName,
                status: app.status,
                avatar: pName.substring(0, 2).toUpperCase()
            };
        });

        res.status(200).json({
            message: "Dashboard stats fetched successfully",
            stats: {
                totalPatients,
                appointmentsToday,
                totalRevenue,
                recoveryRate: "94%", // Placeholder
                quickStats: {
                    newPatientsToday,
                    consultationsDone,
                    pendingReports
                },
                todaysAppointmentsList: mappedAppointments
            }
        });

    } catch (error) {
        res.status(500).json({
            message: "Error fetching dashboard stats",
            error: error.message
        });
    }
};
