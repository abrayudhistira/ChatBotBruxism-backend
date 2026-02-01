const express = require('express');
const router = express.Router();
const QuestionController = require('../controllers/QuestionController');

router.get('/', (req, res) => QuestionController.index(req, res));
router.post('/', (req, res) => QuestionController.store(req, res));
router.get('/:id', (req, res) => QuestionController.show(req, res));
router.put('/:id', (req, res) => QuestionController.update(req, res));
router.delete('/:id', (req, res) => QuestionController.destroy(req, res));

module.exports = router;