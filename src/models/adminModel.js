//admin model
//in this 6 columns are there along with timestamp
const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
    admin_code : {
        type : String,
        required : true,
        unique : true
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

module.exports = mongoose.model("Admin", adminSchema);