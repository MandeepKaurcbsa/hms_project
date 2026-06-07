//This model will help to register doctor via frontend by admin only.
//this doctor model consist of 20 columns along with timestamp.
const mongoose = require("mongoose");

const generateCustomId = require("../utils/idGenerator");

const doctorSchema = new mongoose.Schema({
    _id : {
        type : String
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
        required : true,
    },
    profile_img : {
        type : String,
        required : true 
    },
    license_no : {
        type : String,
        required : true 
    },
    department : {
        type : String,
        required : true 
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
    visit_address : {
        type : String,
        required : true
    },
    consult_fee : {
        type : Number,
        required : true 
    },
    consult_mode : {
        type : String,
        enum : ["online", "offline", "both"]
    },
    available_days : [
       {  
        type : String,
        required : true
       }
    ],
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
        enum : ["active", "inactive", "on-leave", "blocked"],
    },
    last_login : {
        type : Date
    },
    is_verified : {
        type : Boolean,
        default : false,
        required : true
    },
},{
    timestamps : true
});

doctorSchema.pre("save", async function () {

    if (!this.isNew) return;

    this._id = await generateCustomId(
        "doctorNums",
        "DOC",
        "",
        3
    );
});

module.exports = mongoose.model("Doctor", doctorSchema);