const express          = require('express');
const router           = express.Router();
const Simulacao        = require('../models/Simulacao');
const ItemSimulacao    = require('../models/ItemSimulacao');

// GET
router.get('/', async (req, res) =>
{
    try
    {
        const registros = await ItemSimulacao.find();
        res.json(registros);
    }
    catch (err)
    {
        res.status(500).json({ message: err.message });
    }
});


// GET/:id
router.get('/:id', async (req, res) =>
{
    try
    {
        const registro = await Simulacao.findOne({ id: parseInt(req.params.id) });
        if (registro == null)
            return res.status(404).json({ message: mensagemNotFound });
        res.json(registro);
    }
    catch (err)
    {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;