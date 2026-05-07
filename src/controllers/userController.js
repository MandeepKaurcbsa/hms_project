//userModel -> userController
//The logic area

const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

//register user
exports.registerUser = async(req, res) => {
    try {
        const {first_name, last_name, email, password, phone} = req.body;

        //check existing user
        const userExists = await User.findOne({email});
        if(userExists){
            return res.status(400).json({message : "User already Exists"});
        }

        //help to hash password
        const hashPassword = await bcrypt.hash(password, 10);

        //creates user
        const user = await User.create({
            first_name,
            last_name,
            email,
            password : hashPassword,
            phone
        });

        res.status(201).json({
            message : "User Created Successfully"
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

    //generates token 
    const token = jwt.sign(
        {id : user._id},
        process.env.JWT_SECRET,
        {expiresIn : "1d"}
    );

    res.json({
        message : "Login Successfull",
        token
    });

    } catch (error) {
       res.status(500).json({
        message : "Error logging in",
        error : error.message
       }); 
    }
};

//get user profile
exports.getUser = async(req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
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

