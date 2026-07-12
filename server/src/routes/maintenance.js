import express from 'express';
import Maintenance from '../models/Maintenance.js';
import Vehicle from '../models/Vehicle.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  const records = await Maintenance.find().populate('vehicle');
  res.json(records);
});

router.post('/', authenticate, authorize(['fleet_manager']), async (req, res) => {
  try {
    const { vehicleId, description, cost } = req.body;
    if (!vehicleId || !description) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(400).json({ message: 'Vehicle not found' });
    const maintenance = await Maintenance.create({ vehicle: vehicle._id, description, cost });
    vehicle.status = 'In Shop';
    await vehicle.save();
    res.status(201).json(await maintenance.populate('vehicle'));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.patch('/:id/close', authenticate, authorize(['fleet_manager']), async (req, res) => {
  try {
    const maintenance = await Maintenance.findById(req.params.id);
    if (!maintenance) return res.status(404).json({ message: 'Maintenance record not found' });
    maintenance.status = 'Closed';
    maintenance.closedAt = new Date();
    await maintenance.save();
    const vehicle = await Vehicle.findById(maintenance.vehicle);
    if (vehicle && vehicle.status !== 'Retired') {
      vehicle.status = 'Available';
      await vehicle.save();
    }
    res.json(await maintenance.populate('vehicle'));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
