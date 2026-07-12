const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

router.get('/kpis', dashboardController.getKPIs);
router.get('/fuel-efficiency', dashboardController.getFuelEfficiency);
router.get('/fleet-utilization', dashboardController.getFleetUtilization);
router.get('/operational-cost', dashboardController.getOperationalCost);
router.get('/vehicle-roi', dashboardController.getVehicleROI);
router.get('/monthly-revenue', dashboardController.getMonthlyRevenue);
router.get('/top-costliest', dashboardController.getTopCostliestVehicles);
router.get('/status-distribution', dashboardController.getVehicleStatusDistribution);
router.get('/recent-trips', dashboardController.getRecentTrips);

module.exports = router;
