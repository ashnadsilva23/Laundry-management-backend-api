const mongoose = require('mongoose');

const serviceSchema = mongoose.Schema({
  sname: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: String, required: true },
  description: { type: String, required: true },

});

const serviceModel = mongoose.model("services", serviceSchema); // It's common to use singular form for model names
module.exports = serviceModel;




