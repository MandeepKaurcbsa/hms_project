// This model stores pharmacy sales after successful checkout.

const mongoose = require("mongoose");
const generateCustomId = require("../utils/idGenerator");

const saleItemSchema = new mongoose.Schema({

    medicine_id: {
        type: String,
        ref: "Medicine",
        required: true
    },

    medicine_name: {
        type: String,
        required: true
    },

    quantity: {
        type: Number,
        required: true,
        min: 1
    },

    price: {
        type: Number,
        required: true
    },

    subtotal: {
        type: Number,
        required: true
    }

}, { _id: false });

const phSalesSchema = new mongoose.Schema({

    _id: {
        type: String
    },

    user_id: {
        type: String,
        ref: "User",
        required: true
    },

    user_name: {
    type: String,
    required: true
},

    pharmacist_id: {
        type: String,
        ref: "Pharmacist",
        required: true
    },

    pharmacist_name: {
    type: String,
    required: true
},

    items: [saleItemSchema],

    total_items: {
        type: Number,
        required: true
    },

    total_quantity: {
        type: Number,
        required: true
    },

    total_price: {
        type: Number,
        required: true
    },

    sold_at: {
        type: Date,
        default: Date.now
    }

}, {
    timestamps: true
});

// Generate Custom Sale ID
phSalesSchema.pre("save", async function () {

    if (!this.isNew) return;

    try {

        this._id = await generateCustomId(
            "phSalesNums",
            "SALE",
            "",
            3
        );

    }

    catch (error) {

        throw error;

    }

});

module.exports = mongoose.model("PhSales", phSalesSchema);