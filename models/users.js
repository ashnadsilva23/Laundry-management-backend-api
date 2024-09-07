const mongoose= require('mongoose')
const userSchema =mongoose.Schema(
    {
        name:{type:String,required:true},
        phone:{type:String,required:true},
        place:{type:String,required:true},
        address:{type:String,required:true},
        gender:{type:String,require:true},
        email:{type:String,required:true},
        password:{type:String,required:true}


    }
)

var userModel=mongoose.model("users",userSchema)
module.exports=userModel