const express          = require('express');
const TipoSimulado     = require('../models/TipoSimulado');
const Questao          = require('../models/Questao');
const router           = express.Router();
const mensagemNotFound = "Registro não encontrado.";
const mensagemSucess   = "Dados salvos com sucesso.";

// GET
router.get('/', async (req, res) =>
{
    try
    {
        const registros = await TipoSimulado.find();
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
        const registro = await TipoSimulado.findOne({ id: parseInt(req.params.id) });
        res.json(registro);
    }
    catch (err)
    {
        res.status(500).json({ message: err.message });
    }
});

// POST
router.post('/', async (req, res) =>
{
    try
    {
        let registro = new TipoSimulado();
        if (req.body.id != null)        { registro.id        = req.body.id; }
        if (req.body.descricao != null) { registro.descricao = req.body.descricao; }
        if (req.body.rgbFonte != null)  { registro.rgbFonte  = req.body.rgbFonte; }
        if (req.body.rgbFundo != null)  { registro.rgbFundo  = req.body.rgbFundo; }
        if (req.body.iniciais != null)  { registro.iniciais  = req.body.iniciais; }
        const resultado = await registro.save();
        res.json({ message: mensagemSucess, resultado });
    }
    catch (err)
    {
        console.log(err);
        res.status(400).json({ message: err.message });
    }
});

// PATCH (PUT)/:id
router.patch('/:id', async (req, res) =>
{
    try
    {
        let registro = await TipoSimulado.findById(req.params.id);
        if (registro == null)           { return res.status(404).json({ message: mensagemNotFound }); }
        if (req.body.id != null)        { registro.id        = req.body.id; }
        if (req.body.descricao != null) { registro.descricao = req.body.descricao; }
        if (req.body.rgbFonte != null)  { registro.rgbFonte  = req.body.rgbFonte; }
        if (req.body.rgbFundo != null)  { registro.rgbFundo  = req.body.rgbFundo; }
        if (req.body.iniciais != null)  { registro.iniciais  = req.body.iniciais; }
        const resultado = await registro.save();
        res.json({ message: mensagemSucess, resultado });
    }
    catch (err)
    {
        res.status(400).json({ message: err.message });
    }
});
    
// DELETE/:id
router.delete('/:id', async (req, res) =>
{
    try
    {
        let mensagem = "";
        const qtQuestoes = (await Questao.find({ 'tipoSimulado.id': parseInt(req.params.id) })).length;
        if (qtQuestoes > 0)
            mensagem = "Não é possível a exclusão, pois há " + qtQuestoes + " questões vinculadas.";
        else
        {
            const registro = await TipoSimulado.findOneAndDelete({ id: parseInt(req.params.id) });
            if (registro == null) { return res.status(404).json({ message: mensagemNotFound }); }
            mensagem = "Dados excluídos com sucesso.";
        }
        res.json({ message: mensagem, resultado });
    }
    catch (err)
    {
        res.status(500).json({ message: err.message });
    }
});
    
module.exports = router;