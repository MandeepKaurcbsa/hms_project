//This model will store appointment details, time and status between doctor and patient.  

const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
    appointment_code : {
        type : String,
        required : true 
    },
    //user who booked appointment
    user_id : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
        required : true
    },
    //patient for whom the appointment is booked 
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
    appointment_date : {
        type : Date,
        required : true 
    },
    appointment_time : {
        type : String,
        required : true 
    },
    consult_mode :{
        type : String,
        enum : ["online", "offline"],
        default : offline,
        required : true
    },
    disease : {
        type : String,
        required : true 
    },
    symptoms : [
        {
            type : String,
            required : true
        }
    ],
    status : {
        type : String,
        enum : ["pending", "confirmed", "completed" , "cancelled", "rejected"],
        default : "pending",
        required : true 
    },
    payment_status : {
        type : String,
        enum : ["pending", "paid", "failed"],
        default : "pending",
        required : true
    },
    payment_method : {
        type : String,
        enum : ["cash", "upi", "net-banking", "card"],
        default : "upi",
        required : true
    },
    consultation_fee : {
        type : Number,
        required : true 
    },
    prescription_added : {
        type : Boolean,
        default : false,
        required : true 
    },
    notes : {
        type : String,
        required : true 
    },
    cancelled_by : {
        type : String,
        enum : ["user", "doctor", "admin"],
        required : true
    },
    cancel_reason : {
        type : String,
        required : true
    }
},{
    timestamps : true 
});

module.exports = mongoose.model("Appointment", appointmentSchema);