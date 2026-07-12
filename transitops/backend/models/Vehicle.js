const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
    registrationNumber: { type: String, required: true, unique: true },
    nameModel: { type: String, required: true },
    type: { type: String, required: true },
    maxLoadCapacity: { type: Number, required: true }, // in kg
    odometer: { type: Number, required: true },
    acquisitionCost: { type: Number, required: true },
    status: { 
        type: String, 
        enum: ['Available', 'On Trip', 'In Shop', 'Retired'],
        default: 'Available'
    }
}, { timestamps: true });

module.exports = mongoose.model('Vehicle', vehicleSchema);
