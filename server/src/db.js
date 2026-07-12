import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import dotenv from 'dotenv';
import User from './models/User.js';
import Vehicle from './models/Vehicle.js';
import Driver from './models/Driver.js';
import { hashPassword } from './utils/hash.js';

dotenv.config();

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

const DEMO_USERS = [
  { name: 'Priya Sharma', email: 'fleet.manager@transitops.demo', password: 'password123', role: 'fleet_manager' },
  { name: 'Alex Kumar', email: 'driver@transitops.demo', password: 'password123', role: 'dispatcher' },
  { name: 'Ravi Menon', email: 'safety.officer@transitops.demo', password: 'password123', role: 'safety_officer' },
  { name: 'Neha Gupta', email: 'finance@transitops.demo', password: 'password123', role: 'financial_analyst' },
];

const SAMPLE_VEHICLES = [
  { registrationNumber: 'VAN-05', name: 'Tata Ace Gold', type: 'Van', maxLoadCapacity: 500, odometer: 12500, acquisitionCost: 650000, region: 'North' },
  { registrationNumber: 'TRK-11', name: 'Ashok Leyland Dost', type: 'Truck', maxLoadCapacity: 2000, odometer: 45000, acquisitionCost: 1800000, region: 'South' },
  { registrationNumber: 'VAN-09', name: 'Mahindra Bolero Pickup', type: 'Van', maxLoadCapacity: 700, odometer: 30200, acquisitionCost: 800000, region: 'East' },
];

const SAMPLE_DRIVERS = [
  { name: 'Alex Kumar', licenseNumber: 'DL-1420110012345', licenseCategory: 'LMV', licenseExpiryDate: new Date(Date.now() + 400 * 24 * 60 * 60 * 1000), contactNumber: '9876500001', safetyScore: 92 },
  { name: 'Suresh Rao', licenseNumber: 'DL-1420110099887', licenseCategory: 'HMV', licenseExpiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), contactNumber: '9876500002', safetyScore: 88 },
  { name: 'Meera Iyer', licenseNumber: 'DL-1420110055221', licenseCategory: 'LMV', licenseExpiryDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), contactNumber: '9876500003', safetyScore: 75 },
];

async function seedDatabase() {
  if (await User.exists({})) {
    return;
  }

  console.log('Seeding demo users...');
  for (const user of DEMO_USERS) {
    const passwordHash = await hashPassword(user.password);
    await User.create({ name: user.name, email: user.email, passwordHash, role: user.role });
  }

  if (!await Vehicle.exists({})) {
    console.log('Seeding demo vehicles...');
    await Vehicle.insertMany(SAMPLE_VEHICLES);
  }

  if (!await Driver.exists({})) {
    console.log('Seeding demo drivers...');
    await Driver.insertMany(SAMPLE_DRIVERS);
  }
}

export async function connectDatabase() {
  if (uri) {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log(`MongoDB connected to ${uri}`);
    await seedDatabase();
    return;
  }

  const memoryServer = await MongoMemoryServer.create();
  const memoryUri = memoryServer.getUri();
  await mongoose.connect(memoryUri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log(`MongoDB in-memory server connected to ${memoryUri}`);
  await seedDatabase();
}
