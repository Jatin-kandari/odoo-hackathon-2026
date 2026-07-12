const express = require('express');
const router = express.Router();
const fuelController = require('../controllers/fuelController');

router.get('/', fuelController.getAllFuelLogs);
router.get('/vehicle/:vehicleId', fuelController.getFuelLogsByVehicle);
router.post('/', fuelController.createFuelLog);
router.delete('/:id', fuelController.deleteFuelLog);

module.exports = router;
