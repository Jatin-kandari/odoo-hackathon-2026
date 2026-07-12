const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');

router.get('/', driverController.getAllDrivers);
router.get('/available', driverController.getAvailableDrivers);
router.get('/:id', driverController.getDriverById);
router.post('/', driverController.createDriver);
router.put('/:id', driverController.updateDriver);
router.patch('/:id/status', driverController.toggleStatus);
router.delete('/:id', driverController.deleteDriver);

module.exports = router;
