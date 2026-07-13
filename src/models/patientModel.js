//  Stores patients data along with the referenced user_id and doctor_id at the time of booking an appointment.

const mongoose = require("mongoose");
const generateCustomId = require("../utils/idGenerator"); // Make sure this path points to your idgenerator.js file

const patientSchema = new mongoose.Schema({
    _id: {
        type: String
    },
    user_id: {
        type: String,
        ref: "User",         //referenced to user
        required: true,
        index: true
    },
    first_name: {
        type: String,
        required: true,
        trim: true
    },
    last_name: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        match: [/^[0-9]{10}$/, "Please enter a valid 10-digit phone number"]
    },
    dob: {
        type: Date,
        required: true
    },
    gender: {
        type: String,
        enum: ["male", "female", "other"],
        required: true
    },
    blood_group: {
        type: String,
        enum: [
            "A+", "A-",
            "B+", "B-",
            "AB+", "AB-",
            "O+", "O-"
        ],
        required: true
    },
    relationship_to_user: {
        type: String,
        enum: [
            "self",
            "father",
            "mother",
            "spouse",
            "son",
            "daughter",
            "brother",
            "sister",
            "other"
        ],
        required: true
    },
    emergency_contact_name: {
        type: String,
        trim: true,
        required: true
    },

    emergency_contact_number: {
        type: String,
        required: true,
        match: [/^[0-9]{10}$/, "Please enter a valid 10-digit phone number"]
    },
    address: {
        type: String,
        trim: true
    },

    city: {
        type: String,
        trim: true
    },
    state: {
        type: String,
        trim: true
    },

    pincode: {
        type: String,
        match: [/^[0-9]{6}$/, "Please enter a valid pincode"]
    },
    allergies: [{
        type: String
    }],
    chronic_diseases: [{
        type: String
    }],
    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active"
    },
    profile_image: {
        type: String
    },
    notes: {
        type: String,
        trim: true
    },
}, {
    timestamps: true
});

patientSchema.pre("save", async function () {

    if (!this.isNew) return;

    try {

        this._id = await generateCustomId(
            "patientNums",
            "PAT",
            "",
            3
        );

    } catch (error) {

        throw error;
    }
});

module.exports = mongoose.model("Patient", patientSchema);