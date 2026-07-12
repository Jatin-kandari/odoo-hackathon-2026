const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');

router.get('/', tripController.getAllTrips);
router.get('/:id', tripController.getTripById);
router.post('/', tripController.createTrip);
router.put('/:id', tripController.updateTrip);
router.post('/:id/dispatch', tripController.dispatchTrip);
router.post('/:id/complete', tripController.completeTrip);
router.post('/:id/cancel', tripController.cancelTrip);
router.delete('/:id', tripController.deleteTrip);

module.exports = router;
