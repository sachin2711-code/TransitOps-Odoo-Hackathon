const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    description: { type: String, required: true },
    type: { 
        type: String, 
        enum: ['Toll', 'Maintenance', 'Other'],
        required: true 
    },
    amount: { type: Number, required: true },
    date: { type: Date, required: true, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);
