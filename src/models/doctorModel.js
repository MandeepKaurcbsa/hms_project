//This model will help to register doctor via frontend by admin only.

const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema({
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
        type : Number,
        required : true,
    },
    specialization : {
        type : String,
        required : true 
    },
    qualification : {
        type : String,
        required : true 
    },
    experience_year : {
        type : Number,
        required : true 
    },
    consult_fee : {
        type : Number,
        required : true 
    },
    available_days : {
        type : String,
        required : true
    },
    work_time_start : {
        type : String,
        required : true 
    },
    work_time_end : {
        type : String,
        required : true
    },
    status : {
        type : String,
        required : true,
        enum : ["active", "inactive"],
    },
},{
    timestamps : true
});

module.exports = mongoose.model("Doctor", doctorSchema);