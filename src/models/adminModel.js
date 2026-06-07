//admin model
//in this 6 columns are there along with timestamp

const mongoose = require("mongoose");
const generateCustomId = require("../utils/idGenerator");

const adminSchema = new mongoose.Schema({
    _id : {
        type : String
    },
    fullname : {
        type : String,
        required : true,
        trim : true 
    },
    email : {
        type : String,
        required : true,
        trim : true,
        unique : true,
        lowercase : true 
    },
    password : {
        type : String,
        required : true
    },
    phone : {
        type : String,
        required : true 
    },
    profile_img : {
        type : String,
    }
},{
    timestamps : true
});

adminSchema.pre("save", async function () {

    if (!this.isNew) return;

    this._id = await generateCustomId(
        "adminNums",
        "ADMIN",
        "",
        3
    );
});

module.exports = mongoose.model("Admin", adminSchema);