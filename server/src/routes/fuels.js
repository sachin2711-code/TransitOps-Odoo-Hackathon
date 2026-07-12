import express from 'express';
import FuelLog from '../models/FuelLog.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  const logs = await FuelLog.find().populate('vehicle');
  res.json(logs);
});

router.post('/', authenticate, authorize(['fleet_manager','dispatcher','financial_analyst']), async (req, res) => {
  try {
    const { vehicleId, liters, cost, date } = req.body;
    if (!vehicleId || liters == null || cost == null || !date) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const log = await FuelLog.create({ vehicle: vehicleId, liters, cost, date });
    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
