import mongoose from 'mongoose';

const statusEnum = ['Available', 'On Trip', 'In Shop', 'Retired'];

const vehicleSchema = new mongoose.Schema({
  registrationNumber: { type: String, required: true, unique: true, trim: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  maxLoadCapacity: { type: Number, required: true, min: 0 },
  odometer: { type: Number, required: true, min: 0 },
  acquisitionCost: { type: Number, required: true, min: 0 },
  region: { type: String, default: 'Unknown' },
  status: { type: String, required: true, enum: statusEnum, default: 'Available' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Vehicle', vehicleSchema);
export { statusEnum };
