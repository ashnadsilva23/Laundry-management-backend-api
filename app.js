const express= require('express')
const mongoose=require('mongoose')
const cors=require('cors')
const jwt=require('jsonwebtoken')
const bcrypt=require('bcrypt')
const userModel = require('./models/users')



let app=express()
app.use(express.json())
app.use(cors())


mongoose.connect("mongodb+srv://ashna:ashna@cluster0.n9qo4.mongodb.net/LaundryDB?retryWrites=true&w=majority&appName=Cluster0")


//signin
app.post("/signIn",async(req,res)=>{
    let input =req.body
    let result=userModel.find({email:req.body.email}).then(
        (items)=>{
            if (items.length>0)
            {
                const passwordvalidator=bcrypt.compareSync(req.body.password,items[0].password)
                if (passwordvalidator) {
                    jwt.sign({email:req.body.email},"laundryapp",{expiresIn:"1d"},(error,token)=>{
                        if (error) {
                            res.json({"status":"error","errorMessage":error})

                            
                        } else {
                            res.json({"status":"success","token":token,"userId":items[0]._id})
                            
                        }
                    })
                    
                } else {
                    res.json({"status":"Incorect password"})


                    
                }
            }
            else{
                res.json({"status":"invalid email id "})

            }
        }
    ).catch()
})

//signup
app.post("/signUp",async(req,res)=>{
   let input=req.body
   let hashedPassword= bcrypt.hashSync(req.body.password,10)
   req.body.password=hashedPassword

   userModel.find({email:req.body.email}).then(
    (items)=>{
        if(items.length>0){
            res.json({"status":"email id already exist"})
        }
        else{
            let result=new userModel(input)
            result.save()
            res.json({"status":"success"})
        }
    }
   ).catch(
    (error)=>{}
   )

        
  

})
app.listen(3030,()=>{
    console.log("server started")
})