//stores user data when any user registers themselves.
//The database 
//this model has 10 colums along with timestamp

const mongoose = require("mongoose");


//mongoose-sequence helps to store user id in a sequence and a format 
//for making user id auto incrementing npm package is installed 
//it can also be done using counter collection
const autoIncrement = require("mongoose-sequence")(mongoose);

const userSchema = new mongoose.Schema({
    user_id : {
        type : Number,
        unique : true
    },
    first_name : {
        type : String, 
        required: true,
        trim : true  //removes extra space from beginning and at the end.
    },
    last_name : {
        type : String,
        required : true,
        trim : true 
    },
    email : {
        type : String,
        required : true,
        trim : true,
        lowercase : true,
        unique : true 
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
        type : String
    },
    is_verified : {
        type : Boolean,
        default : false 
    },
    status : {
        type : String,
        enum : ["active", "blocked"],
        default : "active",
    },
    last_login : {
        type : Date
    },
    address : {
        type : String
    },
},{
    timestamps : true   // it automatically adds created_at and updated_at
});


userSchema.plugin(autoIncrement,{
    inc_field : "user_id",  //this will increment the user_id field
    id : "userNumms",  //it will store id like : USR001 and so on 
    start_seq : 1000      // it will start the squence from 1000
});

userSchema.pre("save", function(next){
    this.user_id = `USR${String(this.user_id).padStart(3,"0")}`;
    next();
})
module.exports = mongoose.model("User", userSchema);