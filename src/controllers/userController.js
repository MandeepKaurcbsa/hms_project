//userModel -> userController
//The logic area

const User = require("../models/userModel");
const OTP = require("../models/otpModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

//register user
exports.registerUser = async(req, res) => {

    try {

        const {first_name, last_name, email, password, phone, profile_img, address, status, is_verified} = req.body;

        //check existing user
        const userExists = await User.findOne({email});

        if(userExists){
            return res.status(400).json({
                message : "User already Exists"
            });
        }

        //hash password
        const hashPassword = await bcrypt.hash(password, 10);

        //create user
        const user = await User.create({
            first_name,
            last_name,
            email,
            password : hashPassword,
            phone,
            profile_img,
            address,
            status,
            is_verified
        });

        res.status(201).json({
            message : "User Created Successfully",
            _id : user._id
        });

    } catch (error) {

        res.status(500).json({
            message : "Error registering User",
            error : error.message
        });

    }
};

//user login
exports.loginUser = async(req, res) => {
    try {
        const{email, password} = req.body;

    //check if user is there or not
    const user = await User.findOne({email});
    if(!user){
       return  res.status(400).json({message : "Invalid email or password"});
    }

    //compare passsword
    const isMatch = await bcrypt.compare(password, user.password);
    if(!isMatch){
        return res.status(400).json({message : "Invalid email or password"});
    }

    if(user.status === "inactive"){
    return res.status(403).json({
        message: "Account is inactive. Please contact admin."
    });
}

    if(user.status === "blocked"){
    return res.status(403).json({
        message: "Account has been blocked by admin."
    });
}

    // update last login
user.last_login = new Date();
await user.save();

    //generates token 
    const token = jwt.sign(
        {
            id : user._id,
            role : "user"
        },
        process.env.JWT_SECRET,
        {expiresIn : "1d"}
    );

    res.json({
    success: true,
    message : "Login Successful",
    token,
    user: {
        id: user._id,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        last_login: user.last_login
    }
});

    } catch (error) {
       res.status(500).json({
        message : "Error logging in",
        error : error.message
       }); 
    }
};

//get user profile (single user that admin can fetch)
exports.getSingleUser = async(req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-password");
        if(!user){
            return res.status(400).json({message : "User Not Found"});
        }

        res.json(user);

    } catch (error) {
        res.status(500).json({
            message : "Error fetching profile",
            error : error.message
        });
    }
};

//get user profile (logged in user can view their profile)
exports.getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");

        if(!user){
            return res.status(400).json({
                message : "User not found"
            });
        }

        res.status(200).json({
            message : "User fetched successfully",
            user
        })
    } catch (error) {
        res.status(500).json({
            message : "Error fetching user",
            error : error.message
        });
    }
};

//get all users (admin can access)
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select("-password");

        res.status(200).json({
            message : "Users fetched successfully",
            totalUsers : users.length,
            users 
        })
    } catch (error) {
        res.status(500).json({
            message : "Error fetching users",
            error : error.message 
        });
    }
};

// Get all users with their patients (admin)
exports.getAllUsersWithPatients = async (req, res) => {
    try {
        const Patient = require("../models/patientModel");

        const users = await User.find().select("-password").lean();

        const usersWithPatients = await Promise.all(
            users.map(async (user) => {
                const patients = await Patient.find({ user_id: user._id.toString() }).lean();
                return { ...user, patients };
            })
        );

        res.status(200).json({
            message: "Users with patients fetched successfully",
            total: usersWithPatients.length,
            users: usersWithPatients
        });
    } catch (error) {
        res.status(500).json({
            message: "Error fetching users with patients",
            error: error.message
        });
    }
};

//update user profile 
exports.updateUser = async (req, res) => {
    try {
        const {
            first_name,
            last_name,
            address,
            profile_img
        } = req.body;

        const updatedUser = await User.findByIdAndUpdate(
            //user.id tells about the user id which has logged in
            req.user.id,  
            {
                first_name,
                last_name,
                address,
                profile_img
            },
            {
                new : true,
                runValidators : true
            }
        ).select("-password");

        if(!updatedUser){
            return res.status(400).json({
                message : "User not found"
            });
        }

        res.status(200).json({
            message : "User updated successfully",
            updatedUser
        });

    } catch (error) {
        res.status(500).json({
            message : "Error updating user's profile",
            error : error.message 
        });
    }
};


// Inactivate User (Soft Delete)
exports.inactivateUser = async (req, res) => {
    try {

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { status: "inactive" },
            { new: true }
        ).select("-password");

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.status(200).json({
            message: "User account inactivated successfully",
            user
        });

    } catch (error) {
        res.status(500).json({
            message: "Error inactivating user",
            error: error.message
        });
    }
};

// Block User
exports.blockUser = async (req, res) => {
    try {

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { status: "blocked" },
            { new: true }
        ).select("-password");

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.status(200).json({
            message: "User account blocked successfully",
            user
        });

    } catch (error) {
        res.status(500).json({
            message: "Error blocking user",
            error: error.message
        });
    }
};

// Activate User  //this logic reactivates the blocked or inactivated user 
exports.activateUser = async (req, res) => {
    try {

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { status: "active" },
            { new: true }
        ).select("-password");

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.status(200).json({
            message: "User account activated successfully",
            user
        });

    } catch (error) {
        res.status(500).json({
            message: "Error activating user",
            error: error.message
        });
    }
};

// Send OTP
exports.sendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        // Generate a 6 digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Save OTP to database
        await OTP.create({
            email,
            otp
        });

        // Setup Nodemailer transport
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        // Send Email
        await transporter.sendMail({
            from: `MediPulse <${process.env.SMTP_FROM_EMAIL}>`,
            to: email,
            subject: "Your MediPulse Verification Code",
            text: `Your verification code is: ${otp}. It will expire in 5 minutes.`,
            html: `
<div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
    <div style="background-color: #14b8a6; padding: 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: -0.5px;">MediPulse</h1>
    </div>
    <div style="padding: 40px 30px; color: #1a202c;">
        <h2 style="margin-top: 0; color: #1a202c; font-size: 20px;">Verify your email address</h2>
        <p style="font-size: 16px; color: #4a5568; line-height: 1.6;">Hello,</p>
        <p style="font-size: 16px; color: #4a5568; line-height: 1.6;">Thank you for registering with MediPulse. Please use the verification code below to complete your sign-up process:</p>
        
        <div style="background-color: #f0fdfa; border: 2px dashed #14b8a6; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #14b8a6;">${otp}</span>
        </div>
        
        <p style="font-size: 14px; color: #718096; margin-bottom: 0;">This code will expire in <strong>5 minutes</strong>. If you did not request this code, please ignore this email.</p>
    </div>
    <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; font-size: 12px; color: #a0aec0;">&copy; ${new Date().getFullYear()} MediPulse Healthcare Systems. All rights reserved.</p>
    </div>
</div>
            `
        });

        res.status(200).json({ message: "OTP sent successfully" });
    } catch (error) {
        res.status(500).json({
            message: "Error sending OTP",
            error: error.message
        });
    }
};

// Verify OTP
exports.verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: "Email and OTP are required" });
        }

        // Find the most recent OTP for this email
        const otpRecord = await OTP.findOne({ email }).sort({ createdAt: -1 });

        if (!otpRecord) {
            return res.status(400).json({ message: "OTP not found or has expired" });
        }

        if (otpRecord.otp !== otp) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        // Delete the OTP after successful verification so it can't be reused
        await OTP.deleteOne({ _id: otpRecord._id });

        // Mark user email as verified
        await User.findOneAndUpdate({ email }, { is_verified: true });

        res.status(200).json({ message: "OTP verified successfully" });
    } catch (error) {
        res.status(500).json({
            message: "Error verifying OTP",
            error: error.message
        });
    }
};

// Reset Password
exports.resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({ message: "Email, OTP, and new password are required" });
        }

        // Verify the OTP
        const otpRecord = await OTP.findOne({ email }).sort({ createdAt: -1 });

        if (!otpRecord) {
            return res.status(400).json({ message: "OTP not found or has expired" });
        }

        if (otpRecord.otp !== otp) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password
        user.password = hashedPassword;
        await user.save();

        // Delete the used OTP
        await OTP.deleteOne({ _id: otpRecord._id });

        res.status(200).json({ message: "Password reset successfully" });
    } catch (error) {
        res.status(500).json({
            message: "Error resetting password",
            error: error.message
        });
    }
};