// This model stores the complete medical history of a patient's visit.

const mongoose = require("mongoose");
const generateCustomId = require("../utils/idGenerator");

const medicalRecordSchema = new mongoose.Schema({

    _id: {
        type: String
    },

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

    appointment_id: {
        type: String,
        ref: "Appointment",
        required: true
    },

    diagnosis: {
        type: String,
        required: true,
        trim: true
    },

    symptoms: {
        type: String,
        required: true,
        trim: true
    },

    prescription: {
        type: String,
        trim: true,
        default: ""
    },

    medicines_prescribed: [{
        medicine_id: {
            type: String,
            ref: "Medicine"
        },
        dosage: {
            type: String,
            default: ""
        },
        duration: {
            type: String,
            default: ""
        }
    }],

    test_result: {
        type: String,
        default: ""
    },

    doctor_notes: {
        type: String,
        trim: true,
        default: ""
    },

    follow_up_date: {
        type: Date
    },

    visit_date: {
        type: Date,
        required: true
    },
    
    record_status: {
    type: String,
    enum: ["Active", "Archived"],
    default: "Active"
}

}, {
    timestamps: true
});

medicalRecordSchema.pre("save", async function () {

    if (!this.isNew) return;

    this._id = await generateCustomId(
        "medicalRecordNums",
        "MR",
        "",
        3
    );

});

module.exports = mongoose.model("MedicalRecord", medicalRecordSchema);