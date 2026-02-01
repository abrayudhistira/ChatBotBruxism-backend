const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware'); // Middleware JWT

const AuthController = require('../controllers/AuthController');
const DashboardController = require('../controllers/DashboardController');
const PatientController = require('../controllers/PatientController');
const QuestionController = require('../controllers/QuestionController');

// --- PUBLIC ROUTES (Login) ---
router.post('/login', AuthController.login);

// --- PROTECTED ROUTES (Wajib JWT) ---
router.use(verifyToken); // Semua route di bawah baris ini butuh token

// 1. Dashboard Stats
router.get('/stats/count', DashboardController.getStats); // Total Pasien
router.get('/stats/recent', DashboardController.getRecentActivity); // 10 Jawaban Terbaru

// 2. Manajemen Pasien (CRUD)
// (Create/Update Pasien biasanya via WA Bot, tapi jika mau tambah endpoint bisa di PatientController)

// 3. Manajemen Pertanyaan (CRUD)
router.get('/questions', QuestionController.index);
router.post('/questions', QuestionController.store);
router.get('/questions/:id', QuestionController.show);
router.put('/questions/:id', QuestionController.update);
router.delete('/questions/:id', QuestionController.destroy);

// 4. Manajemen Admin (CRUD)
router.post('/register', AuthController.registerAdmin);
// Tambahkan list/delete admin jika perlu

module.exports = router;