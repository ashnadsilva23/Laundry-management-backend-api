const mongoose = require('mongoose');


const requestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users', // Reference to User model
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  numberOfProducts: {
    type: Number,
    required: true
  },
  services: [{
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'services', // Reference to Service model
      required: true
    },
    products: [{
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'products', // Reference to Product model
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        default: 1 // Default to 1 if not provided
      }
    }]
  }],
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'], // Allowed values for status
    default: 'pending' // Default status when a request is created
  },
  requestDate: {
    type: Date,
    default: Date.now // Automatically set to the current date
  },
  isPaid: { type: Boolean, default: false },

}, { timestamps: true });



const requestModel = mongoose.model("requests", requestSchema);
module.exports = requestModel;
