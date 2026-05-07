//  Stores patients data along with the referenced user_id and doctor_id at the time of booking an appointment.

const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema({
    
    user_id : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",         //referenced to user
        required : true
    },
    doctor_id : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Doctor",       // referenced to doctor
        required : true 
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
    phone : {
        type : Number,
        required : true 
    },
    dob : {
        type : Date,
        required: true
    },
    gender : {
        type : String,
        enum : ["male", "female", "other"],
        required : true
    },
    age : {
        type : Number,
        required : true  
    },
    blood_group : {
        type : String,
        required : true 
    },
    disease : {
        type : String,
        required : true
    },        
},{
    timestamps : true
});

module.exports = mongoose.model("Patient", patientSchema);