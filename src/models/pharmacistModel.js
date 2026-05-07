// stores pharmacists details 
const mongoose = require("mongoose");

const pharmacistSchema = new mongoose.Schema({
    pharmacist_code : {
        type : String,
        required : true,
        unique : true 
    },
    first_name : {
        type : String,
        required : true,
        trim : true 
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
        unique : true,
        lowercase : true 
    },
    password : {
        type : String,
        required : true 
    },
    phone : {
        type : String,
        required : true 
    },
    pharmacy_name : {
        type : String,
        required : true
    },
    qualification : {
        type : String,
        required : true 
    },
    license_no : {
        type : String,
        required : true,
        unique : true 
    },
    address : {
        type : String,
        required : true 
    },
    profile_img : {
        type : String,
        required : true 
    },
    working_days : [
        {
            type : String,
            required : true 
        }
    ],
    working_hour_start :{
        type : String,
        required : true
    },
    working_hour_end :{
        type : String,
        required : true
    },
    status : {
        type : String,
        required : true,
        enum : ["active", "inactive", "on-leave"],
        default : "active"
    },
    is_verified : {
        type : Boolean,
        required : true,
        default : false 
    },
    joining_date : {
        type : Date,
        default : Date.now 
    },
    last_login : {
        type : Date,
    },
},{
    timestamps : true
});

module.exports = mongoose.model("Pharmacist", pharmacistSchema);