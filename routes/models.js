// routes/models.js - Models API Routes

const express = require('express');
const router = express.Router();
const db = require('../database');

// GET all available models
router.get('/models', (req, res) => {
    try {
        const models = db.getAvailableModels();

        res.json({
            success: true,
            data: models,
            count: models.length,
            default: 'gpt-4o-mini'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET specific model details
router.get('/models/:id', (req, res) => {
    try {
        const model = db.getModel(req.params.id);

        if (!model) {
            return res.status(404).json({
                success: false,
                error: 'Model not found'
            });
        }

        res.json({
            success: true,
            data: model
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// GET system stats
router.get('/stats', (req, res) => {
    try {
        const stats = db.getStatistics();

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
