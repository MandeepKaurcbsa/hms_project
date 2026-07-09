// This model stores the shopping cart of a user.
// Each user has only one active cart.
// The cart contains medicines selected by the user before checkout.

const mongoose = require("mongoose");
const generateCustomId = require("../utils/idGenerator");

const cartItemSchema = new mongoose.Schema({

    medicine_id: {
        type: String,
        ref: "Medicine",
        required: true
    },

    quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1
    },

    price_at_added: {
    type: Number,
    required: true
},

is_selected: {

    type: Boolean,

    default: true

},

added_at: {
        type: Date,
        default: Date.now
    }

}, { _id: false });

const cartSchema = new mongoose.Schema({

    _id: {
        type: String
    },

    user_id: {
        type: String,
        ref: "User",
        required: true,
        unique: true      // One active cart per user
    },

    items: [cartItemSchema]

}, {
    timestamps: true
});

// Generate Custom Cart ID
cartSchema.pre("save", async function () {

    if (!this.isNew) return;

    try {

        this._id = await generateCustomId(
            "cartNums",
            "CART",
            "",
            3
        );

    } catch (error) {

        throw error;
    }

});

module.exports = mongoose.model("Cart", cartSchema);