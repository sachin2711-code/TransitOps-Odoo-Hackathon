import express from 'express';
import Trip from '../models/Trip.js';
import Vehicle from '../models/Vehicle.js';
import Driver from '../models/Driver.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

const getDriverIsValid = (driver) => {
  if (!driver) return false;
  if (driver.status === 'Suspended') return false;
  if (new Date(driver.licenseExpiryDate) < new Date()) return false;
  return true;
};

router.get('/', authenticate, async (req, res) => {
  const trips = await Trip.find().populate('vehicle driver');
  res.json(trips);
});

router.post('/', authenticate, authorize(['dispatcher']), async (req, res) => {
  try {
    const { source, destination, vehicleId, driverId, cargoWeight, plannedDistance, revenue } = req.body;
    if (!source || !destination || !vehicleId || !driverId || cargoWeight == null || plannedDistance == null) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const vehicle = await Vehicle.findById(vehicleId);
    const driver = await Driver.findById(driverId);
    if (!vehicle) return res.status(400).json({ message: 'Vehicle not found' });
    if (!driver) return res.status(400).json({ message: 'Driver not found' });
    if (['Retired', 'In Shop'].includes(vehicle.status)) {
      return res.status(400).json({ message: 'Selected vehicle is not available for dispatch' });
    }
    if (vehicle.status === 'On Trip') {
      return res.status(400).json({ message: 'Selected vehicle is already on trip' });
    }
    if (!getDriverIsValid(driver)) {
      return res.status(400).json({ message: 'Selected driver is not eligible for dispatch' });
    }
    if (driver.status === 'On Trip') {
      return res.status(400).json({ message: 'Selected driver is already on trip' });
    }
    if (cargoWeight > vehicle.maxLoadCapacity) {
      return res.status(400).json({ message: 'Cargo weight exceeds vehicle maximum load capacity' });
    }

    const trip = await Trip.create({ source, destination, vehicle: vehicle._id, driver: driver._id, cargoWeight, plannedDistance, status: 'Dispatched', revenue: revenue ?? 0 });
    vehicle.status = 'On Trip';
    driver.status = 'On Trip';
    await Promise.all([vehicle.save(), driver.save()]);
    res.status(201).json(await trip.populate('vehicle driver'));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.patch('/:id/complete', authenticate, authorize(['dispatcher']), async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ message: 'Trip not found' });
    if (trip.status !== 'Dispatched') return res.status(400).json({ message: 'Only dispatched trips can be completed' });
    const vehicle = await Vehicle.findById(trip.vehicle);
    const driver = await Driver.findById(trip.driver);
    trip.status = 'Completed';
    await trip.save();
    if (vehicle) vehicle.status = 'Available';
    if (driver) driver.status = 'Available';
    await Promise.all([vehicle?.save(), driver?.save()]);
    res.json(await trip.populate('vehicle driver'));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.patch('/:id/cancel', authenticate, authorize(['dispatcher']), async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ message: 'Trip not found' });
    if (trip.status !== 'Dispatched') return res.status(400).json({ message: 'Only dispatched trips can be cancelled' });
    const vehicle = await Vehicle.findById(trip.vehicle);
    const driver = await Driver.findById(trip.driver);
    trip.status = 'Cancelled';
    await trip.save();
    if (vehicle) vehicle.status = 'Available';
    if (driver) driver.status = 'Available';
    await Promise.all([vehicle?.save(), driver?.save()]);
    res.json(await trip.populate('vehicle driver'));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
