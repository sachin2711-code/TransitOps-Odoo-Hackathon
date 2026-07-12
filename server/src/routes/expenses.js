import express from 'express';
import Expense from '../models/Expense.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  const expenses = await Expense.find().populate('vehicle');
  res.json(expenses);
});

router.post('/', authenticate, authorize(['fleet_manager','dispatcher','financial_analyst']), async (req, res) => {
  try {
    const { vehicleId, description, amount, date } = req.body;
    if (!vehicleId || !description || amount == null || !date) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    const expense = await Expense.create({ vehicle: vehicleId, description, amount, date });
    res.status(201).json(expense);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
