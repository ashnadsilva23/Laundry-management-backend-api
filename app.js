const express= require('express')
const mongoose=require('mongoose')
const cors=require('cors')
const multer = require('multer');
const bodyParser = require('body-parser');
const jwt=require('jsonwebtoken')
const bcrypt=require('bcrypt')
const userModel = require('./models/users')
const productModel = require('./models/productModel');
const path = require('path');
const dotenv = require('dotenv');
const serviceModel = require('./models/servicemodel');
const requestModel = require('./models/requestmodel');
const complaintModel = require('./models/complaintModel');
const deliveryModel = require('./models/deliveryModel');
const stripe = require('stripe')('sk_test_51QD1JrAYsfjpGlhUE3bFYHvQJARuxvZR87IKCd7y4CKskzVKrrgsE1tRr64hdSqRPNDxRoGmTW5IINWuVQYVly5U00xJNQdm0H'); // Replace with your Stripe secret key


dotenv.config();







const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/'); // Make sure this directory exists
    },
    filename: function (req, file, cb) {
      // Ensure the file is saved with a unique name
      cb(null, Date.now() + path.extname(file.originalname)); // Append timestamp to prevent name collisions
    }
  });
  
  // Initialize Multer with the storage configuration
  const upload = multer({ storage: storage });
  
  // Updated add product endpoint
 



let app=express()
app.use(bodyParser.json());

app.use(express.json())
app.use(cors())
app.use('/uploads', express.static('uploads')); // Example if your images are stored in an 'uploads' folder



mongoose.connect("mongodb+srv://ashna:ashna@cluster0.n9qo4.mongodb.net/LaundryDB?retryWrites=true&w=majority&appName=Cluster0")
mongoose.set('strictPopulate', false);






app.post('/pay', async (req, res) => {
  const { amount, id } = req.body;

  // Validate input
  if (!amount || !id) {
      return res.status(400).json({ message: 'Amount and payment ID are required.' });
  }

  try {
      const payment = await stripe.paymentIntents.create({
          amount, // amount in paise (1 INR = 100 paise)
          currency: 'inr',
          payment_method: id,
          confirm: true,
          automatic_payment_methods: {
              enabled: true,
              allow_redirects: 'never', // Prevent any redirects
          },
      });

      res.json({
          message: 'Payment successful',
          success: true,
          payment,
      });
  } catch (error) {
      console.error('Payment Error:', error);
      const errorMessage = error.message || 'Payment failed';
      res.status(500).json({
          message: errorMessage,
          success: false,
      });
  }
});

app.get('/deliveries', async (req, res) => {
  try {
      const deliveries = await deliveryModel.find().populate('userId', 'email'); // Populating userId to get the email
      res.status(200).json({ status: 'success', data: deliveries });
  } catch (error) {
      console.error('Error fetching deliveries:', error);
      res.status(500).json({ status: 'error', message: 'An error occurred while fetching deliveries.' });
  }
});

// Update delivery status
app.patch('/deliveries/:id', async (req, res) => {
  try {
      const { id } = req.params;
      const { status } = req.body;

      // Validate status
      if (!['pending', 'pickup', 'delivered'].includes(status)) {
          return res.status(400).json({ message: 'Invalid status' });
      }

      const updatedDelivery = await deliveryModel.findByIdAndUpdate(
          id,
          { status },
          { new: true } // Return the updated document
      );

      if (!updatedDelivery) {
          return res.status(404).json({ message: 'Delivery not found' });
      }

      res.status(200).json({ message: 'Status updated', data: updatedDelivery });
  } catch (error) {
      console.error('Error updating delivery status:', error);
      res.status(500).json({ message: 'An error occurred while updating status' });
  }
});






app.post('/delivery', async (req, res) => {
  try {
      const { requestId, userId, pickupDate, pickupTime } = req.body;

      // Validate required fields
      if (!requestId || !userId || !pickupDate || !pickupTime) {
          return res.status(400).json({ status: 'error', message: 'All fields are required.' });
      }

      // Optionally: Validate date and time formats here
      // Example: Check if pickupDate is a valid date and if pickupTime is in correct format

      // Create a new payment record
      const newDelivery = new deliveryModel({
          userId,
          requestId,
          pickupDate,
          pickupTime
      });

      const savedDelivery = await newDelivery.save();

      // Populate user details (address, pincode, and email)
      const populatedDelivery= await deliveryModel.findById(savedDelivery._id)
          .populate({
              path: 'userId', // Ensure userId is set up as a reference in your schema
              select: 'address pincode email' // Select only the fields you need
          });

      res.status(201).json({ status: 'success', data: populatedDelivery });
  } catch (error) {
      console.error('Error creating payment:', error); // Log the error for debugging
      res.status(500).json({ status: 'error', message: 'An error occurred while saving pickup details.' });
  }
});






// Route to get user details by userId
app.get('/users/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
      const user = await userModel.findById(userId).select('address pincode  email name'); // Select only the fields you need
      if (!user) {
          return res.status(404).json({ status: 'error', message: 'User not found' });
      }
      res.status(200).json({ status: 'success', data: user });
  } catch (error) {
      console.error('Error fetching user data:', error);
      res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});





// In routes/request.js
app.get('/request/:id', async (req, res) => {
  try {
      const requestId = req.params.id;
      const request = await requestModel.findById(requestId)
          .populate({
              path: 'services.serviceId',
              select: 'sname' // Explicitly select servicename
          })
          .populate({
              path: 'services.products.productId',
              select: 'productname' // Explicitly select productname
          });

      if (!request) {
          return res.status(404).json({ status: 'error', message: 'Request not found' });
      }

      res.status(200).json({ status: 'success', data: request });
  } catch (error) {
      console.error('Error fetching request details:', error);
      res.status(500).json({ status: 'error', message: 'Server error' });
  }
});





app.get('/viewmycomplaints', async (req, res) => {
  // Extract token from headers
  let token = req.headers.token;

  // Verify the token
  jwt.verify(token, "laundryapp", async (error, decoded) => {
    if (error) {
      return res.json({ status: "error", message: "Invalid token" });
    }

    // Check if the token contains the user's ID
    if (decoded && decoded._id) {
      try {
        // Fetch complaints for the logged-in user
        const complaints = await complaintModel.find({ userId: decoded._id })
          .populate('userId', 'name')  // Populate user's name
          .populate('requestId', '_id')  // Populate request ID
          .select('complaintdescription createdAt requestId status');  // Select required fields
        
        // If no complaints found, return an empty array
        if (complaints.length === 0) {
          return res.json({ status: "success", data: [] });
        }

        // Respond with the complaints data
        res.json({ status: "success", data: complaints });
      } catch (err) {
        console.error("Error fetching complaints:", err);
        res.status(500).json({ status: "error", message: "Error fetching complaints", error: err.message });
      }
    } else {
      res.json({ status: "invalid authentication" });
    }
  });
});




// Assuming you have a Request model defined and you're using Express
app.get('/viewmyrequests/:requestId', async (req, res) => {
  const { requestId } = req.params;
  try {
      const request = await requestModel.findById(requestId)
          .populate({
              path: 'services',
              select: 'sname price'
          });

      console.log('Request:', request); // Inspect the whole request object
      if (!request) {
          return res.status(404).json({ status: 'error', message: 'Request not found' });
      }

      if (!request.services || request.services.length === 0) {
          console.log('No services found for this request');
          return res.status(404).json({ status: 'error', message: 'No services found for this request' });
      }

      // Iterate through services and check for null or undefined
      request.services.forEach(service => {
          if (!service) {
              console.log('Service is null or undefined:', service);
          } else if (!service.price) {
              console.log('Price is missing for service:', service);
          } else {
              console.log('Service:', service);
          }
      });

      res.json({ status: 'success', data: request });
  } catch (error) {
      console.error("Error fetching request:", error);
      res.status(500).json({ status: 'error', message: 'An error occurred while fetching the request.' });
  }
});







app.put('/updateComplaintStatus/:complaintId', async (req, res) => {
  let token = req.headers.token;

  // Verify if the admin is authorized to update the status
  jwt.verify(token, "laundryapp", async (error, decoded) => {
    if (error || decoded.role !== "admin") {
      return res.json({ status: "error", message: "Unauthorized access" });
    }

    const { complaintId } = req.params;
    const { status } = req.body;

    try {
      // Update the complaint status
      const updatedComplaint = await complaintModel.findByIdAndUpdate(
        complaintId,
        { status },
        { new: true }
      );

      if (!updatedComplaint) {
        return res.status(404).json({ status: "error", message: "Complaint not found" });
      }

      res.json({ status: "success", data: updatedComplaint });
    } catch (err) {
      console.error("Error updating complaint status:", err);
      res.status(500).json({ status: "error", message: "Failed to update status" });
    }
  });
});


app.get("/viewallcomplaints", async (req, res) => {
  let token = req.headers.token;

  // Verify the token to ensure the user is an admin
  jwt.verify(token, "laundryapp", async (error, decoded) => {
    if (error || decoded.role !== "admin") { // Check if the token contains a role field for admin
      return res.json({ status: "error", message: "Unauthorized access" });
    }

    try {
      // Fetch all complaints with user name, request ID, complaint description, and createdAt
      const complaints = await complaintModel.find()
        .populate('userId', 'name')  // Populate user's name
        .populate('requestId', '_id')  // Populate request ID
        .select('complaintdescription createdAt'); // Fetch complaint description and createdAt

      // Log the fetched complaints for debugging purposes
      console.log(complaints);

      // Send the response with the complaints data
      res.json({ status: "success", data: complaints });
    } catch (err) {
      console.error("Error fetching all complaints:", err);
      res.status(500).json({ status: "error", message: "Error fetching complaints", error: err.message });
    }
  });
});



app.post('/add-complaint', async (req, res) => {
  const { userId, requestId, complaintdescription } = req.body;

 

  // Validate userId, requestId, and complaintdescription
  if (!userId || !requestId || !complaintdescription) {
    return res.status(400).json({ error: "userId, requestId, and complaintdescription are required." });
  }

  try {
    // Assuming you have a complaint model to handle the complaints
    const createdComplaint = await complaintModel.create({
      userId,
      requestId,
      complaintdescription,
    });

    console.log("Created Complaint:", createdComplaint); // Log the created complaint for debugging

    // Fetch all complaints including populated fields (if necessary)
    const complaints = await complaintModel.find()
      .populate('userId', 'name')  // Populate user details and fetch only 'name'
      .populate('requestId', 'status'); // Populate request details and fetch only 'status'

    // Respond with the newly created complaint and the updated list of complaints
    res.status(201).json({ createdComplaint, complaints });
  } catch (error) {
    console.error("Error creating complaint:", error);
    res.status(500).json({ error: "An error occurred while creating the complaint." });
  }
});




// app.put("/updaterequeststatus/:id", async (req, res) => {

//   try {
//     const { status } = req.body; // The new status (accepted/rejected) is sent in the request body
//     const updatedRequest = await requestModel.findByIdAndUpdate(req.params.id, { status }, { new: true });

//     if (!updatedRequest) {
//       return res.status(404).json({ status: "error", message: "Request not found" });
//     }

//     res.json({ status: "success", data: updatedRequest });
//   } catch (err) {
//     res.status(500).json({ status: "error", message: "Error updating request status", error: err.message });
//   }
// });


//view all requests 


app.patch("/updateRequestStatus/:id", async (req, res) => {
    const token = req.headers.token;
    const requestId = req.params.id;
    const { status } = req.body;

    // Verify the token to ensure the user is an admin
    jwt.verify(token, "laundryapp", async (error, decoded) => {
        if (error || decoded.role !== "admin") {
            return res.json({ status: "error", message: "Unauthorized access" });
        }

        // Validate status
        if (!['accepted', 'rejected', 'pending'].includes(status)) {
            return res.status(400).json({ status: "error", message: "Invalid status" });
        }

        try {
            // Find the request by ID and update the status
            const updatedRequest = await requestModel.findByIdAndUpdate(
                requestId,
                { status },
                { new: true } // Return the updated document
            );

            if (!updatedRequest) {
                return res.status(404).json({ status: "error", message: "Request not found" });
            }

            res.json({ status: "success", data: updatedRequest });
        } catch (err) {
            console.error("Error updating request status:", err);
            res.status(500).json({ status: "error", message: "Error updating request status", error: err.message });
        }
    });
});



// Route to view all requests with user names and update request status
app.get("/viewallrequests", async (req, res) => {
  let token = req.headers.token;

  // Verify the token to ensure the user is an admin
  jwt.verify(token, "laundryapp", async (error, decoded) => {
    if (error || decoded.role !== "admin") { // Check if the token contains a role field for admin
      return res.json({ status: "error", message: "Unauthorized access" });
    }

    try {
      // Fetch all requests with user names, service names, product names, and status
      const requests = await requestModel.find()
        .populate('userId', 'name') // Populate user's name
        .populate({
          path: 'services.serviceId',
          select: 'sname description price' // Populate service details
        })
        .populate({
          path: 'services.products.productId',
          select: 'productname productPrice' // Populate product details
        });

      console.log(requests);

      // Send the response with the requests data
      res.json({ status: "success", data: requests });
    } catch (err) {
      console.error("Error fetching all requests:", err);
      res.status(500).json({ status: "error", message: "Error fetching all requests", error: err.message });
    }
  });
});


// Route to update the status of a request by the admin





app.get('/viewmyrequests', async (req, res) => {
  // Extract token from headers
  let token = req.headers.token;

  // Verify the token
  jwt.verify(token, "laundryapp", async (error, decoded) => {
    if (error) {
      return res.json({ status: "error", message: "Invalid token" });
    }

    // Check for _id in the decoded token
    if (decoded && decoded._id) {
      try {
        // Fetch requests for the logged-in user
        const requests = await requestModel.find({ userId: decoded._id })
          .populate({
            path: 'services.serviceId',
            select: 'sname description price' // Populate service details
          })
          .populate({
            path: 'services.products.productId',
            select: 'productname productPrice' // Populate product details
          });

        if (requests.length === 0) {
          return res.json({ status: "success", data: [] }); // Return empty array if no requests found
        }

        // Format response to return each request with totalAmount
        const formattedRequests = requests.map(request => {
          let totalAmount = 0;

          request.services.forEach(service => {
            // Ensure serviceId is present and has a valid price
            totalAmount += service.serviceId && service.serviceId.price ? service.serviceId.price : 0; // Fallback to 0 if no price

            service.products.forEach(product => {
              // Ensure productId exists and has a valid price and quantity
              const productPrice = product.productId && product.productId.productPrice ? product.productId.productPrice : 0; // Default to 0 if no price
              const productQuantity = product.quantity ? product.quantity : 0; // Default to 0 if quantity is missing
              totalAmount += productPrice * productQuantity;
            });
          });

          return {
            _id: request._id,
            requestDate: request.requestDate,
            status: request.status,
            totalAmount: totalAmount.toFixed(2), // Format total amount to 2 decimal places
            services: request.services.map(service => ({
              serviceId: service.serviceId ? service.serviceId._id : null, // Check if serviceId exists
              serviceName: service.serviceId ? service.serviceId.sname : 'Unknown Service', // Default to 'Unknown Service'
              products: service.products.map(product => ({
                productId: product.productId ? product.productId._id : null, // Ensure productId exists
                productName: product.productId ? product.productId.productname : 'Unknown Product', // Default to 'Unknown Product'
                quantity: product.quantity || 0, // Default to 0 if quantity is missing
                productPrice: product.productId ? product.productId.productPrice : 0 // Default to 0 if price is missing
              })),
            })),
          };
        });

        // Respond with the formatted requests including totalAmount
        res.json({ status: "success", data: formattedRequests });
      } catch (err) {
        console.error("Error fetching requests:", err);
        res.status(500).json({ status: "error", message: "Error fetching requests", error: err.message });
      }
    } else {
      res.json({ status: "invalid authentication" });
    }
  });
});











//requests
app.post('/requests', async (req, res) => {
  const { userId, totalAmount, numberOfProducts, services } = req.body;

  if (!userId || !Array.isArray(services) || services.length === 0) {
    return res.status(400).json({ error: "userId and services (as an array) are required." });
  }

  for (const service of services) {
    if (!service.serviceId || !Array.isArray(service.products) || service.products.length === 0) {
      return res.status(400).json({ error: "Each service must have a valid serviceId and products array." });
    }

    for (const product of service.products) {
      if (!product.productId || !product.quantity) {
        return res.status(400).json({ error: "Each product must have a valid productId and quantity." });
      }
    }
  }

  try {
    const createdRequest = await requestModel.create({ userId, totalAmount, numberOfProducts, services });
    console.log(createdRequest);

    res.status(201).json({ createdRequest });
  } catch (error) {
    console.error("Error creating request:", error);
    res.status(500).json({ error: "An error occurred while creating the request." });
  }
});










app.get('/requests/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const requests = await requestModel.find({ userId }).populate('serviceId').populate('productId');
    if (!requests.length) {
      return res.status(404).json({ status: 'error', message: 'No requests found for this user' });
    }
    res.status(200).json({ status: 'success', data: requests });
  } catch (error) {
    console.error("Error fetching requests for user:", error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch requests' });
  }
});


// Get all products
app.get('/getproducts', async (req, res) => {
  try {
    const products = await productModel.find();
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Assuming you have a route to get services
app.get('/getservices', async (req, res) => {
  try {
    const services = await serviceModel.find()
    res.status(200).json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ message: 'Failed to fetch services' });
  }
});

//products
// Fetch Products

  
app.put('/updateservice/:id', async (req, res) => {
  const { id } = req.params;
  const { sname, price, description } = req.body; // Ensure the names match your request

  try {
    // Find the service by ID and update the fields
    const updatedService = await serviceModel.findByIdAndUpdate(
      id,
      {
        $set: { sname, price, description } // Ensure 'products' is used if it's an array
      },
      { new: true } // Return the updated document
    )

    if (!updatedService) {
      return res.status(404).json({ status: 'error', message: 'Service not found' });
    }

    // Respond with the updated service data
    res.status(200).json({ status: 'success', data: updatedService });
  } catch (error) {
    console.error('Error updating Service:', error);
    res.status(500).json({ status: 'error', message: 'Failed to update Service' });
  }
});


app.get('/viewservice/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Find the service by ID and populate the products with the product names
    const service = await serviceModel.findById(id)
    
    if (!service) {
      return res.status(404).json({ status: 'error', message: 'Service not found' });
    }
    
    res.status(200).json(service);
  } catch (error) {
    console.error('Error fetching Service:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch Service' });
  }
});



//delete service
app.post("/deleteservice",(req,res)=>{
  let input=req.body
  serviceModel.findByIdAndDelete(input._id).then(
      (response)=>{
          res.json({"status":"success"})
      }
  ).catch(
      (error)=>{
          res.json({"status":"error"})
      }
  ).finally()
  

})
//search service
app.post("/searchservice",(req,res)=>{
  let input = req.body
  serviceModel.find(input).then(
      (data)=>{
          res.json(data)

      }
  ).catch(
      (error)=>{
          res.json(error)
      }
  )
})
//view service
app.get("/viewservice",(req,res)=>{
  serviceModel.find().then(
      (data)=>{
          res.json(data)
      }
  ).catch(
      (error)=>{
          res.json(error)
      }
  ).finally()
})



//add service

app.get('/addservicename/:sname', async (req, res) => {
  try {
    const { sname } = req.params;

    // Check if a service with the same name already exists
    const existingService = await serviceModel.findOne({ sname: sname });

    if (existingService) {
      // If service exists, return true
      return res.json({ exists: true });
    }

    // If no service exists, return false
    return res.json({ exists: false });
  } catch (error) {
    console.error('Error checking service name:', error);
    res.status(500).json({ message: 'An error occurred while checking the service name' });
  }
});





app.post("/addservice", upload.single('image'), async (req, res) => {
  try {
    // Get the product name and image path
    const sname = req.body.sname;
    const description = req.body.description;
    const price = req.body.price;
    const image = req.file ? req.file.path : null; // Save the image path

    // Check if image is provided
    if (!image) {
      return res.status(400).json({ status: "error", message: "Product image is required" });
    }

    // Check if product name already exists
    const existingProduct = await serviceModel.findOne({ sname });
    if (existingProduct) {
      return res.json({ status: "service already exists" });
    }

    // Create new product and save it to the database
    const newProduct = new serviceModel({ sname, price,description,image });
    await newProduct.save();

    res.json({ status: "success", service: newProduct });
  } catch (error) {
    console.error("Error saving product:", error);
    res.status(500).json({ status: "error", message: "Failed to add product" });
  }
});





// update service

 app.get('/viewproducts/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const products = await productModel.findById(id);
      if (!products) {
        return res.status(404).json({ status: 'error', message: 'Product not found' });
      }
      res.status(200).json(products);
    } catch (error) {
      console.error('Error fetching Product:', error);
      res.status(500).json({ status: 'error', message: 'Failed to fetch Product' });
    }
  });
  

app.put('/updateproducts/:id', async (req, res) => {
    const { id } = req.params;
    const { productname,productimage,pdescription,productPrice } = req.body;
  
    try {
      // Find the user by ID and update
      const updatedProduct = await productModel.findByIdAndUpdate(
        id,
        {
          $set: { productname,productimage,pdescription,productPrice }
        },
        { new: true } // Return the updated document
      );
  
      if (!updatedProduct) {
        return res.status(404).json({ status: 'error', message: 'Product not found' });
      }
  
      res.status(200).json({ status: 'success', data: updatedProduct });
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({ status: 'error', message: 'Failed to update product' });
    }
  });


//delete product
app.post("/deleteproduct",(req,res)=>{
    let input=req.body
    productModel.findByIdAndDelete(input._id).then(
        (response)=>{
            res.json({"status":"success"})
        }
    ).catch(
        (error)=>{
            res.json({"status":"success"})
        }
    ).finally()
    

})
//search product
app.post("/searchproduct",(req,res)=>{
    let input = req.body
    productModel.find(input).then(
        (data)=>{
            res.json(data)

        }
    ).catch(
        (error)=>{
            res.json(error)
        }
    )
})
//view product
app.get("/viewproduct",(req,res)=>{
    productModel.find().then(
        (data)=>{
            res.json(data)
        }
    ).catch(
        (error)=>{
            res.json(error)
        }
    ).finally()
})


app.post("/addproduct", upload.single('image'), async (req, res) => {
    try {
      // Get the product name and image path
      const productname = req.body.productname;
      const pdescription = req.body.pdescription;
      const productPrice = req.body.productPrice;
      const productimage = req.file ? req.file.path : null; // Save the image path
  
      // Check if image is provided
      if (!productimage) {
        return res.status(400).json({ status: "error", message: "Product image is required" });
      }
  
      // Check if product name already exists
      const existingProduct = await productModel.findOne({ productname });
      if (existingProduct) {
        return res.json({ status: "productname already exists" });
      }
  
      // Create new product and save it to the database
      const newProduct = new productModel({ productname, productimage,pdescription,productPrice });
      await newProduct.save();
  
      res.json({ status: "success", product: newProduct });
    } catch (error) {
      console.error("Error saving product:", error);
      res.status(500).json({ status: "error", message: "Failed to add product" });
    }
  });
  







  
  

  

//update users

app.get('/view/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const user = await userModel.findById(id);
      if (!user) {
        return res.status(404).json({ status: 'error', message: 'User not found' });
      }
      res.status(200).json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ status: 'error', message: 'Failed to fetch user' });
    }
  });
  

app.put('/updateuser/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email, phone, place, address, gender } = req.body;
  
    try {
      // Find the user by ID and update
      const updatedUser = await userModel.findByIdAndUpdate(
        id,
        {
          $set: { name, email, phone, place, address, gender }
        },
        { new: true } // Return the updated document
      );
  
      if (!updatedUser) {
        return res.status(404).json({ status: 'error', message: 'User not found' });
      }
  
      res.status(200).json({ status: 'success', data: updatedUser });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ status: 'error', message: 'Failed to update user' });
    }
  });





//search users

app.post("/search",(req,res)=>{
    let input = req.body
    userModel.find(input).then(
        (data)=>{
            res.json(data)

        }
    ).catch(
        (error)=>{
            res.json(error)
        }
    )
})

//delete users


app.post("/delete",(req,res)=>{
    let input=req.body
    userModel.findByIdAndDelete(input._id).then(
        (response)=>{
            res.json({"status":"success"})
        }
    ).catch(
        (error)=>{
            res.json({"status":"error"})
        }
    ).finally()
    

})




//view users
app.get("/view",(req,res)=>{
    userModel.find().then(
        (data)=>{
            res.json(data)
        }
    ).catch(
        (error)=>{
            res.json(error)
        }
    ).finally()
})

//delete users

app.post("/delete",(req,res)=>{
    let token=req.headers["token"]
    let input=req.body
    jwt.verify(token,"laundryapp",(error,decoded)=>{
        if(error)
            {
                res.json({"status":"unauthorised access"})
            }
            else{
                if(decoded){
                    userModel.findByIdAndDelete(input._id).then(
                    (response)=>{
                        res.json(response)
                    }
                ).catch().finally()

            }
        }
    })
   

})
//products count
app.get('/product-count', async (req, res) => {
  try {
      const count = await productModel.countDocuments(); // Get the count of users
      res.json({ status: 'success', count }); // Send the count in the response
  } catch (error) {
      console.error("Error fetching user count:", error);
      res.status(500).json({ status: 'error', message: 'An error occurred while fetching user count.' });
  }
});
//services count
app.get('/services-count', async (req, res) => {
  try {
      const count = await serviceModel.countDocuments(); // Get the count of users
      res.json({ status: 'success', count }); // Send the count in the response
  } catch (error) {
      console.error("Error fetching user count:", error);
      res.status(500).json({ status: 'error', message: 'An error occurred while fetching user count.' });
  }
});

//complaints count
app.get('/complaint-count', async (req, res) => {
  try {
      const count = await complaintModel.countDocuments(); // Get the count of users
      res.json({ status: 'success', count }); // Send the count in the response
  } catch (error) {
      console.error("Error fetching user count:", error);
      res.status(500).json({ status: 'error', message: 'An error occurred while fetching user count.' });
  }
});
//user count
app.get('/user-count', async (req, res) => {
  try {
      const count = await userModel.countDocuments(); // Get the count of users
      res.json({ status: 'success', count }); // Send the count in the response
  } catch (error) {
      console.error("Error fetching user count:", error);
      res.status(500).json({ status: 'error', message: 'An error occurred while fetching user count.' });
  }
});
//request count

app.get('/request-count', async (req, res) => {
  try {
      const count = await requestModel.countDocuments(); // Get the count of users
      res.json({ status: 'success', count }); // Send the count in the response
  } catch (error) {
      console.error("Error fetching user count:", error);
      res.status(500).json({ status: 'error', message: 'An error occurred while fetching user count.' });
  }
});
app.get('/products-count', async (req, res) => {
  try {
      const count = await productModel.countDocuments(); // Get the count of users
      res.json({ status: 'success', count }); // Send the count in the response
  } catch (error) {
      console.error("Error fetching user count:", error);
      res.status(500).json({ status: 'error', message: 'An error occurred while fetching user count.' });
  }
});
app.get('/service-count', async (req, res) => {
  try {
      const count = await serviceModel.countDocuments(); // Get the count of users
      res.json({ status: 'success', count }); // Send the count in the response
  } catch (error) {
      console.error("Error fetching user count:", error);
      res.status(500).json({ status: 'error', message: 'An error occurred while fetching user count.' });
  }
});


//login

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  // Default admin credentials (Move these to env variables for better security)
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@gmail.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  try {
      // Check if the input matches the default admin credentials
      if (email === adminEmail && password === adminPassword) {
          // Admin login successful (for hardcoded admin)
          const token = jwt.sign({ email, role: 'admin' }, "laundryapp", { expiresIn: "1d" });
          return res.json({ status: "success", token, role: 'admin', message: "Admin logged in successfully" });
      }

      // Check if the user exists in the user table
      const user = await userModel.findOne({ email });
      if (!user) {
          return res.json({ status: "error", message: "Invalid email id" });
      }

      // Compare the password with the stored hash
      const passwordMatch = bcrypt.compareSync(password, user.password);
      if (!passwordMatch) {
          return res.json({ status: "error", message: "Incorrect password" });
      }

      // Generate token for user
      const token = jwt.sign({ email: user.email, _id: user._id, role: 'user' }, "laundryapp", { expiresIn: "1d" });
      return res.json({ 
          status: "success", 
          token, 
          role: 'user', 
          userId: user._id,  // Return the user ID
          username: user.name  // Assuming the user model has a 'name' field
      });

  } catch (error) {
      console.error("Login error:", error);
      return res.json({ status: "error", message: "An error occurred", error: error.message });
  }
});

//signup users
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





app.listen(3031,()=>{
    console.log("server started")
})