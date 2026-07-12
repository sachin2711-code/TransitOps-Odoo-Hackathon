import mongoose from 'mongoose';

const maintenanceStatus = ['Active', 'Closed'];

const maintenanceSchema = new mongoose.Schema({
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  description: { type: String, required: true },
  cost: { type: Number, default: 0, min: 0 },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: maintenanceStatus, default: 'Active' },
  closedAt: { type: Date },
});

export default mongoose.model('Maintenance', maintenanceSchema);
export { maintenanceStatus };
