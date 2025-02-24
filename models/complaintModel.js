const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true,
  },
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'requests',
    required: true,
  },
  complaintdescription: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['solved', 'pending'],
    default: 'pending'
  }
});

const complaintModel = mongoose.model('complaints', complaintSchema);
module.exports = complaintModel;
