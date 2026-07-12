const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
    source: { type: String, required: true },
    destination: { type: String, required: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
    cargoWeight: { type: Number, required: true },
    plannedDistance: { type: Number, required: true },
    status: { 
        type: String, 
        enum: ['Draft', 'Dispatched', 'Completed', 'Cancelled'],
        default: 'Draft'
    }
}, { timestamps: true });

module.exports = mongoose.model('Trip', tripSchema);
