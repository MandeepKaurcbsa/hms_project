// This model stores prescriptions created by doctors after consultation.
// One appointment can have only one prescription.
// A prescription can contain multiple prescribed medicines.

const mongoose = require("mongoose");
const generateCustomId = require("../utils/idGenerator");

// Individual prescribed medicine
const prescriptionMedicineSchema = new mongoose.Schema({

    medicine_id: {
        type: String,
        ref: "Medicine",
        required: true
    },

    // Stored to preserve prescription history
    // even if medicine details change later.
    medicine_name: {
        type: String,
        required: true
    },

    generic_name: {
        type: String,
        default: ""
    },

    strength: {
        type: String,
        default: ""
    },

    dosage: {
        type: String,
        required: true
    },

    frequency: {
        type: String,
        required: true
    },

    duration: {
        type: String,
        required: true
    },

    instructions: {
        type: String,
        default: ""
    }

}, { _id: false });

const prescriptionSchema = new mongoose.Schema({

    _id: {
        type: String
    },

    appointment_id: {
        type: String,
        ref: "Appointment",
        required: true,
        unique: true      // One prescription per appointment
    },

    medical_record_id: {
        type: String,
        ref: "MedicalRecord",
        required: true
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

    medicines: {
        type: [prescriptionMedicineSchema],
        validate: {
            validator: function (value) {
                return value.length > 0;
            },
            message: "At least one medicine must be prescribed."
        }
    },

    general_instructions: {
        type: String,
        default: ""
    },

    follow_up_date: {
        type: Date,
        default: null
    },

    quantity: {
    type: Number,
    required: true,
    min: 1
},  

    status: {
        type: String,
        enum: [
            "active",
            "completed"
        ],
        default: "active"
    },

    prescribed_date: {
        type: Date,
        default: Date.now
    }

}, {
    timestamps: true
});

// Generate Custom Prescription ID
prescriptionSchema.pre("save", async function () {

    if (!this.isNew) return;

    try {

        this._id = await generateCustomId(
            "prescriptionNums",
            "PRE",
            "",
            3
        );

    }

    catch (error) {

        throw error;

    }

});

/*
==========================================================
Future Improvements

1. Add digital doctor's signature.

doctor_signature

2. Add hospital/clinic details.

hospital_name
hospital_address

3. Add diagnosis summary.

diagnosis

4. Add prescription expiry date.

expiry_date

5. Add QR Code / Verification Code
for validating prescriptions.

verification_code

6. Store prescribed medicine image
to preserve prescription history.

medicine_image

==========================================================
*/

module.exports = mongoose.model("Prescription", prescriptionSchema);