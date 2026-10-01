const mongoose = require("mongoose");
const generateCustomId = require("../utils/idGenerator");

const wishlistItemSchema = new mongoose.Schema({
    medicine_id: {
        type: String,
        ref: "Medicine",
        required: true
    },
    added_at: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

const wishlistSchema = new mongoose.Schema({
    _id: {
        type: String
    },
    user_id: {
        type: String,
        ref: "User",
        required: true,
        unique: true
    },
    items: [wishlistItemSchema]
}, {
    timestamps: true
});

// Generate Custom Wishlist ID
wishlistSchema.pre("save", async function () {
    if (!this.isNew) return;
    try {
        this._id = await generateCustomId(
            "wishlistNums",
            "WISH",
            "",
            3
        );
    } catch (error) {
        throw error;
    }
});

module.exports = mongoose.model("Wishlist", wishlistSchema);
