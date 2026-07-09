// This model stores medicine requests submitted by pharmacists.
// These requests are reviewed by the admin before becoming available
// in the Medicine collection.

const mongoose = require("mongoose");
const generateCustomId = require("../utils/idGenerator");

const medicineRequestSchema = new mongoose.Schema({

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
        trim: true
    },

    unit: {
        type: String,
        required: true,
        enum: ["Strip", "Bottle", "Box", "Tube", "Piece", "Packet"]
    },

    price: {
        type: Number,
        required: true,
        min: 0
    },

    stock_available: {
        type: Number,
        required: true,
        min: 0
    },

    description: {
        type: String,
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

    requested_by: {
        type: String,
        required: true
    },

    status: {
        type: String,
        enum: ["Pending", "Approved", "Rejected"],
        default: "Pending"
    },

    approved_by: {
        type: String,
        default: null
    },

    rejection_reason: {
        type: String,
        default: ""
    },

    reviewed_at: {
        type: Date,
        default: null
    }

}, {
    timestamps: true
});

medicineRequestSchema.pre("save", async function () {

    if (!this.isNew) return;

    this._id = await generateCustomId(
        "medicineRequestNums",
        "MED-REQ",
        "",
        3
    );
});


module.exports = mongoose.model("MedicineRequest", medicineRequestSchema);