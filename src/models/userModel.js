const mongoose = require("mongoose");
const generateCustomId = require("../utils/idgenerator"); // Make sure this path points to your idgenerator.js file

const userSchema = new mongoose.Schema({
    // Changed to String to store your formatted ID (e.g., "USER-011")
    _id: {
        type: String
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
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    profile_img: {
        type: String
    },
    is_verified: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ["active", "blocked"],
        default: "active"
    },
    last_login: {
        type: Date
    },
    address: {
        type: String
    }
}, {
    timestamps: true
});

// GENERATE CUSTOM ID USING YOUR UTILITY
userSchema.pre("save", async function () {
    if (!this.isNew) return;

    try {
        // Parameters: (sequenceId, entityPrefix, subPrefix, paddingLength)
        // This will generate an ID like: USER-001
        this._id = await generateCustomId("userNums", "USER", "", 3);
    } catch (error) {
        throw error; // Passes the custom generator error out to your controller
    }
});

module.exports = mongoose.model("User", userSchema);
