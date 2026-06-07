//userModel -> userController
//The logic area

const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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