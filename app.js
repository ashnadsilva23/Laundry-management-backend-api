const express= require('express')
const mongoose=require('mongoose')
const cors=require('cors')
const jwt=require('jsonwebtoken')
const bcrypt=require('bcrypt')
const userModel = require('./models/users')
const adminModel = require('./models/adminmodel')



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

app.post("/adminlogin", (req, res) => {
    let input = req.body;

    // Default admin credentials
    const adminEmail = 'admin@gmail.com';
    const adminPassword = 'admin123';

    // Check if the input matches admin credentials
    if (input.email === adminEmail && input.password === adminPassword) {
        // Admin login successful
        jwt.sign({ email: input.email }, "laundryapp", { expiresIn: "1d" }, (error, token) => {
            if (error) {
                res.json({ "status": "Token credentials failed" });
            } else {
                res.json({ "status": "success", "token": token, "message": "Admin logged in successfully" });
            }
        });
    } else {
        // Check if the user exists in the database
        adminModel.find({ name: input.name }).then((response) => {
            if (response.length > 0) {
                const validator = bcrypt.compareSync(input.password, response[0].password);
                if (validator) {
                    // User login successful
                    jwt.sign({ email: input.email}, "laundryapp", { expiresIn: "1d" }, (error, token) => {
                        if (error) {
                            res.json({ "status": "Token credentials failed" });
                        } else {
                            res.json({ "status": "success", "token": token });
                        }
                    });
                } else {
                    res.json({ "status": "Wrong password" });
                }
            } else {
                res.json({ "status": "Username doesn't exist" });
            }
        }).catch((err) => {
            res.json({ "status": "Error occurred", "error": err.message });
        });
    }
});   

app.listen(3030,()=>{
    console.log("server started")
})