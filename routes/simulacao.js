const express          = require('express');
const router           = express.Router();
const Simulacao        = require('../models/Simulacao');
const ItemSimulacao    = require('../models/ItemSimulacao');
const mensagemNotFound = "Registro não encontrado.";
const mensagemSuccess  = "Dados salvos com sucesso.";

// GET
router.get('/', async (req, res) =>
{
    try
    {
        const registros = await Simulacao.find();
        /*
        const dataFormatada = new Intl.DateTimeFormat('pt-BR', { day: '2-digit',
                                                                month: '2-digit',
                                                                year: 'numeric' 
                                                                }).format(dataAtual);
        */
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

// POST
router.post('/', async (req, res) =>
{
    try
    {
        let registro = new Simulacao();
        let mensagem = mensagemSuccess;
        registro.data = new Date();
        registro.id = await getNextId();
        registro.itensSimulacoes = [];

        for (let i = 0; i < req.body.itensSimulacoes.length; i++)
        {
            let itemSimulacao            = new ItemSimulacao();
            let dados = req.body.itensSimulacoes[i].split(' ');
            itemSimulacao.id             = (i + 1);
            itemSimulacao.idQuestao      = parseInt(dados[0]);
            itemSimulacao.opcaoCorreta   = dados[1];
            itemSimulacao.opcaoEscolhida = dados[2];
            registro.itensSimulacoes.push(itemSimulacao);
        }
        const resultado = await registro.save();
        const registros = await Simulacao.find();
        //const dadosImportacao = await doImport(registros, 4);
        res.status(201).json({ message: mensagem, registro });
    }
    catch (err)
    {
        console.log(err);
        res.status(400).json({ message: err.message });
    }
});

async function getNextId()
{
     const lastId = await Simulacao.findOne().sort({ id: -1 });
     return lastId ? lastId.id + 1 : 1;
}

module.exports = router;