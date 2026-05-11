//admin model -> admin controller 
// handles admin authentication and management logic

const Admin = require("../models/adminModel");
const Doctor = require("../models/doctorModel");
const Pharmacist = require("../models/pharmacistModel");

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

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
            {id : admin_id},
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
            doctor_code,
            first_name,
            last_name,
            email,
            password,
            phone,
            profile_img,
            liscense_no,
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
            doctor_code,
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
        });

        res.status(201).json({
            message : "Doctor added successfully",
            doctor
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
            pharmacist_code,
            first_name,
            last_name,
            email,
            password,
            phone,
            pharmacy_name,
            qualification,
            liscense_no,
            address,
            profile_img,
            working_days,
            work_time_start,
            work_time_end,
            status,
            is_verified,
            joining_date
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
            pharmacist_code,
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
            is_verified,
            joining_date
        });

        res.status(201).json({
            message : "Pharmacist added Successfully",
            pharmacist
        });

    } catch (error) {
        res.status(500).message({
            message : "Error adding pharmacist",
            error : error.message
        });
    }
};




