const mongoose = require('mongoose');

const productSchema = mongoose.Schema({
  productname: { type: String, required: true },
  productPrice: { type: Number, required: true },
  productimage: { type: String, required: true },
  pdescription: { type: String, required: true },

});

const productModel = mongoose.model("products", productSchema); // It's common to use singular form for model names
module.exports = productModel;




