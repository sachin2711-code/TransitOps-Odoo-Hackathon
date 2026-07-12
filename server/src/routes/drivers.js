import express from 'express';
import Driver from '../models/Driver.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  const drivers = await Driver.find();
  res.json(drivers);
});

router.post('/', authenticate, authorize(['fleet_manager']), async (req, res) => {
  try {
    const { name, licenseNumber, licenseCategory, licenseExpiryDate, contactNumber, safetyScore, status } = req.body;
    if (!name || !licenseNumber || !licenseCategory || !licenseExpiryDate || !contactNumber || safetyScore == null) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const existing = await Driver.findOne({ licenseNumber });
    if (existing) return res.status(400).json({ message: 'License number must be unique' });
    const driver = await Driver.create({ name, licenseNumber, licenseCategory, licenseExpiryDate, contactNumber, safetyScore, status });
    res.status(201).json(driver);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
