import mongoose from 'mongoose';

const tripStatus = ['Draft', 'Dispatched', 'Completed', 'Cancelled'];

const tripSchema = new mongoose.Schema({
  source: { type: String, required: true },
  destination: { type: String, required: true },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
  cargoWeight: { type: Number, required: true, min: 0 },
  plannedDistance: { type: Number, required: true, min: 0 },
  status: { type: String, enum: tripStatus, default: 'Draft' },
  revenue: { type: Number, default: 0, min: 0 },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Trip', tripSchema);
export { tripStatus };
