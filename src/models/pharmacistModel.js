// stores pharmacists details
//this model has 18 columns along with timestamp

const mongoose = require("mongoose");

const generateCustomId = require("../utils/idGenerator");

const pharmacistSchema = new mongoose.Schema({
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
    work_time_start :{
        type : String,
        required : true
    },
    work_time_end :{
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

pharmacistSchema.pre("save", async function () {

    if (!this.isNew) return;

    this._id = await generateCustomId(
        "pharmacistNums",
        "PHR",
        "",
        3
    );
});

module.exports = mongoose.model("Pharmacist", pharmacistSchema);