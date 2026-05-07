//stores user data when any user registers themselves.
//The database 

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

    first_name : {
        type : String, 
        required: true,
        trim : true  //removes extra space from beginning and at the end.
    },
    last_name : {
        type : String,
        required : true,
        trim : true 
    },
    email : {
        type : String,
        required : true,
        trim : true,
        lowercase : true,
        unique : true 
    },
    password : {
        type : String,
        required : true 
    },
    phone : {
        type : String,
        required : true 
    },
    profile_img : {
        type : String
    },
    is_verified : {
        type : Boolean,
        default : false 
    },
    status : {
        type : String,
        enum : ["active", "blocked"],
        default : "active",
        required : true
    },
    last_login : {
        type : Date
    },
    address : {
        type : String
    },
},{
    timestamps : true   // it automatically adds created_at and updated_at
});

module.exports = mongoose.model("User", userSchema);