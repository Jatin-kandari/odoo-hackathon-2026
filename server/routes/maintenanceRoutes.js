const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenanceController');

// GET /api/maintenance - Get all maintenance records
router.get('/', maintenanceController.getAllMaintenance);

// GET /api/maintenance/:id - Get single maintenance record
router.get('/:id', maintenanceController.getMaintenanceById);

// GET /api/maintenance/vehicle/:vehicleId - Get maintenance by vehicle
router.get('/vehicle/:vehicleId', maintenanceController.getMaintenanceByVehicle);

// POST /api/maintenance - Create new maintenance
router.post('/', maintenanceController.createMaintenance);

// POST /api/maintenance/:id/close - Close maintenance
router.post('/:id/close', maintenanceController.closeMaintenance);

// DELETE /api/maintenance/:id - Delete maintenance
router.delete('/:id', maintenanceController.deleteMaintenance);

module.exports = router;
