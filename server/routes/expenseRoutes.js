const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');

router.get('/', expenseController.getAllExpenses);
router.get('/operational-cost', expenseController.getOperationalCost);
router.get('/vehicle/:vehicleId', expenseController.getExpensesByVehicle);
router.post('/', expenseController.createExpense);
router.delete('/:id', expenseController.deleteExpense);

module.exports = router;
