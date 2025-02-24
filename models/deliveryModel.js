const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'requests', required: true },
    pickupDate: { type: Date, required: true },
    pickupTime: { type: String, required: true }, // Adjust type based on your needs
    status: {
        type: String,
        enum: ['pending', 'pickup', 'delivered'],
        default: 'pending' // Default status when a delivery is created
    }
});

const deliveryModel = mongoose.model('delivery', deliverySchema);
module.exports = deliveryModel;
