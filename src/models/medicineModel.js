// This model stores different types of medicines available in the application
// along with their pricing, stock, manufacturer, and prescription details.

const mongoose = require("mongoose");
const generateCustomId = require("../utils/idGenerator");

const medicineSchema = new mongoose.Schema({
    _id : {
        type : String
    },
    medicine_name: {
        type: String,
        required: true,
        trim: true
    },

    generic_name: {
        type: String,
        trim: true,
        default: ""
    },

    category: {
        type: String,
        required: true,
        enum: ["Tablet", "Capsule", "Syrup", "Injection", "Cream", "Drops", "Powder", "Other"]
    },

    manufacturer: {
        type: String,
        required: true,
        trim: true
    },

    strength: {
        type: String,
        required: true,
        trim: true        // Example: 500mg, 250mg/5ml
    },

    unit: {
        type: String,
        required: true,
        enum: ["Strip", "Bottle", "Ampoule", "Vial", "Tin", "Box", "Tube", "Piece", "Packet"]
    },

    price: {
        type: Number,
        required: true,
        min: 0
    },

    stock_available: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },

    description: {
        type: String,
        trim: true,
        default: ""
    },

    medicine_image: {
        type: String,
        default: ""
    },

    requires_prescription: {
        type: Boolean,
        default: false
    },

    mfg_date: {
        type: Date,
        required: true
    },

    expiry_date: {
        type: Date,
        required: true
    },

    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active"
    }

}, {
    timestamps: true
});

medicineSchema.index({ status: 1, medicine_name: 1 });
medicineSchema.index({ category: 1 });

// GENERATE CUSTOM ID USING YOUR UTILITY
medicineSchema.pre("save", async function () {

    if (!this.isNew) return;

    try {

        this._id = await generateCustomId(
            "medicineNums",
            "MED",
            "",
            3
        );

    } catch (error) {

        throw error;
    }
});

module.exports = mongoose.model("Medicine", medicineSchema);