//admin model -> admin controller 
// handles admin authentication and management logic

const Admin = require("../models/adminModel");
const Doctor = require("../models/doctorModel");
const Pharmacist = require("../models/pharmacistModel");

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
 
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
            available_days,
            work_time_start,
            work_time_end,
            status,
            is_verified
        } = req.body;

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
            profile_img,
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




