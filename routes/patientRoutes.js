const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware'); // Middleware JWT

const DashboardController = require('../controllers/DashboardController');
const PatientController = require('../controllers/PatientController');


// --- PROTECTED ROUTES (Wajib JWT) ---
router.use(verifyToken); // Semua route di bawah baris ini butuh token

// 2. Manajemen Pasien (CRUD)
router.get('/', PatientController.index);
router.get('/:phone', DashboardController.getPatientDetail); // Detail + Jawaban
router.delete('/:phone', PatientController.destroy);
// (Create/Update Pasien biasanya via WA Bot, tapi jika mau tambah endpoint bisa di PatientController)
module.exports = router;