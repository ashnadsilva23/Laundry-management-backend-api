const mongoose= require('mongoose')
const adminSchema =mongoose.Schema(
    {
        email:{type:String,required:true},
        password:{type:String,required:true}
        

    }
)

var adminModel=mongoose.model("admin",adminSchema)
module.exports=adminModel