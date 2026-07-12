const mongoose = require('mongoose');

const maintenanceLogSchema = new mongoose.Schema({
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    description: { type: String, required: true },
    cost: { type: Number, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    status: { 
        type: String, 
        enum: ['Active', 'Closed'],
        default: 'Active'
    }
}, { timestamps: true });

module.exports = mongoose.model('MaintenanceLog', maintenanceLogSchema);
