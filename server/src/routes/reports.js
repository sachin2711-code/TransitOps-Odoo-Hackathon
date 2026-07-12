import express from 'express';
import Vehicle from '../models/Vehicle.js';
import FuelLog from '../models/FuelLog.js';
import Expense from '../models/Expense.js';
import Trip from '../models/Trip.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/analytics', authenticate, authorize(['fleet_manager','dispatcher','safety_officer','financial_analyst']), async (req, res) => {
  const vehicles = await Vehicle.find();
  const fuelLogs = await FuelLog.find();
  const expenses = await Expense.find();
  const trips = await Trip.find();

  const vehicleCosts = vehicles.map((vehicle) => {
    const fuelCost = fuelLogs.filter((f) => f.vehicle.toString() === vehicle._id.toString())
      .reduce((sum, log) => sum + log.cost, 0);
    const maintenanceCost = expenses.filter((e) => e.vehicle.toString() === vehicle._id.toString())
      .reduce((sum, expense) => sum + expense.amount, 0);
    const tripDistance = trips.filter((t) => t.vehicle.toString() === vehicle._id.toString() && t.status === 'Completed')
      .reduce((sum, trip) => sum + trip.plannedDistance, 0);
    const fuelVolume = fuelLogs.filter((f) => f.vehicle.toString() === vehicle._id.toString())
      .reduce((sum, log) => sum + log.liters, 0);
    const fuelEfficiency = fuelVolume > 0 ? tripDistance / fuelVolume : 0;
    const revenue = trips.filter((t) => t.vehicle.toString() === vehicle._id.toString())
      .reduce((sum, trip) => sum + trip.revenue, 0);
    const operationalCost = fuelCost + maintenanceCost;
    const roi = vehicle.acquisitionCost > 0 ? (revenue - operationalCost) / vehicle.acquisitionCost : 0;
    return {
      vehicleId: vehicle._id,
      registrationNumber: vehicle.registrationNumber,
      fuelEfficiency,
      operationalCost,
      roi,
      status: vehicle.status,
    };
  });

  res.json({ vehicles: vehicleCosts });
});

export default router;
