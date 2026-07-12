import express from 'express';
import Vehicle from '../models/Vehicle.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  const vehicles = await Vehicle.find();
  res.json(vehicles);
});

router.post('/', authenticate, authorize(['fleet_manager']), async (req, res) => {
  try {
    const { registrationNumber, name, type, maxLoadCapacity, odometer, acquisitionCost, region, status } = req.body;
    if (!registrationNumber || !name || !type || maxLoadCapacity == null || odometer == null || acquisitionCost == null) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const existing = await Vehicle.findOne({ registrationNumber });
    if (existing) return res.status(400).json({ message: 'Vehicle registration number must be unique' });
    const vehicle = await Vehicle.create({ registrationNumber, name, type, maxLoadCapacity, odometer, acquisitionCost, region, status });
    res.status(201).json(vehicle);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
