const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');

const DashboardController = require('../controllers/DashboardController');
const PatientController = require('../controllers/PatientController');

// --- PROTECTED ROUTES (Wajib JWT) ---
router.use(verifyToken);

// Manajemen Pasien (CRUD)
router.get('/', PatientController.index);
router.get('/:telegram_id', DashboardController.getPatientDetail);
router.delete('/:telegram_id', PatientController.destroy);

module.exports = router;