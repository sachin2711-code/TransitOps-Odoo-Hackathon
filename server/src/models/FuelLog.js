import mongoose from 'mongoose';

const fuelLogSchema = new mongoose.Schema({
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  liters: { type: Number, required: true, min: 0 },
  cost: { type: Number, required: true, min: 0 },
  date: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('FuelLog', fuelLogSchema);
