//This model will store appointment details, time and status between doctor and patient.  

const mongoose = require("mongoose");
const generateCustomId = require("../utils/idGenerator"); // Make sure this path points to your idgenerator.js file


const appointmentSchema = new mongoose.Schema({
    // Changed to String to store your formatted ID (e.g., "APPOINTMENT")
    _id: {
        type: String
    },
    //user who booked appointment
    user_id: {
        type: String,
        ref: "User",
        required: true
    },
    //patient for whom the appointment is booked 
    patient_id: {
        type: String,
        ref: "Patient",
        required: true
    },
    doctor_id: {
        type: String,
        ref: "Doctor",
        required: true
    },
    appointment_date: {
        type: Date,
        required: true
    },
    appointment_time: {                //"10:00"  it must be written like this only**
        type: String,
        required: true
    },
    consult_mode: {
        type: String,
        enum: ["online", "offline"],
        default: "offline",
        required: true
    },
    disease: {
        type: String,
        required: true
    },
    symptoms: [
        {
            type: String,
            required: true
        }
    ],
    status: {
        type: String,
        enum: ["pending", "confirmed", "completed", "cancelled", "rejected"],
        default: "pending",
        required: true
    },
    payment_status: {
        type: String,
        enum: [
            "pending",
            "paid",
            "failed",
            "refunded",
            "partially_refunded"
        ],
        default: "pending",
        required: true
    },
    payment_method: {
        type: String,
        enum: ["cash", "upi", "net-banking", "card"],
        default: "upi",
        required: true
    },
    consultation_fee: {
        type: Number,
        required: true
    },
    prescription_added: {
        type: Boolean,
        default: false,
        required: true
    },
    notes: {
        type: String,
    },
    cancelled_by: {
        type: String,
        enum: ["user", "doctor", "admin"],
    },
    cancel_reason: {
        type: String,
    },
    refund_status: {
        type: String,
        enum: [
            "not_applicable",
            "pending",
            "refunded",
            "failed"
        ],
        default: "not_applicable"
    },

    //     Status	Meaning
    // not_applicable	No refund should be given
    // pending	Refund is waiting to be processed
    // refunded	Money has been successfully returned
    // failed	Refund attempt failed

    refund_percentage: {
        type: Number,
        default: 0,
        min: 0
    },

    refund_amount: {
        type: Number,
        default: 0,
        min: 0
    },
    cancelled_at: {
        type: Date
    },
    refund_processed_at: {
        type: Date
    }
}, {
    timestamps: true
});

appointmentSchema.pre("save", async function () {

    if (!this.isNew) return;

    try {

        this._id = await generateCustomId(
            "appointmentNums",
            "APPOINTMENT",
            "",
            3
        );

    } catch (error) {

        throw error;
    }
});

module.exports = mongoose.model("Appointment", appointmentSchema);