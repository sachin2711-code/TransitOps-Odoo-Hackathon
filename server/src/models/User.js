import mongoose from 'mongoose';

const roleEnum = ['fleet_manager', 'dispatcher', 'safety_officer', 'financial_analyst'];

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, required: true, enum: roleEnum },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('User', userSchema);
export { roleEnum };
