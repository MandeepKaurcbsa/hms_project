// this model stores patients medical records 

const mongoose = require("mongoose");

const medicalRecordSchema = new mongoose.Schema({
    patient_id : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Patient",
        required : true
    },
    doctor_id : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Doctor",
        required : true 
    },
    appointment_id : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Appointment",
        required : true 
    },
    diagnosis : {
        type : String,
        required : true 
    },
    symptoms : {
        type : String,
        required : true 
    },
    test_result : {
        type : String,
        enum : ["positive", "negative"],
        required : true
    },
    visit_date : {
        type : Date,
        required : true
    },
},{
    timestamps : true
});

module.exports = mongoose.model("MedicalRecord", medicalRecordSchema);