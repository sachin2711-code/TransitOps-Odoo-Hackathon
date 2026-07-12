import mongoose from 'mongoose';

const statusEnum = ['Available', 'On Trip', 'Off Duty', 'Suspended'];

const driverSchema = new mongoose.Schema({
  name: { type: String, required: true },
  licenseNumber: { type: String, required: true, unique: true, trim: true },
  licenseCategory: { type: String, required: true },
  licenseExpiryDate: { type: Date, required: true },
  contactNumber: { type: String, required: true },
  safetyScore: { type: Number, required: true, min: 0, max: 100 },
  status: { type: String, required: true, enum: statusEnum, default: 'Available' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Driver', driverSchema);
export { statusEnum };
