const express          = require('express');
const router           = express.Router();
const Usuario          = require('../models/Usuario');
const mensagemNotFound = "Registro não encontrado.";
const mensagemSucess   = "Dados salvos com sucesso.";

// Obter todos os usuários
router.get('/', async (req, res) =>
{
    try
    {
        const usuarios = await Usuario.find();
        res.json(usuarios);
    }
    catch (err)
    {
        res.status(500).json({ message: err.message });
    }
});

// Obter um usuário por ID
router.get('/:id', async (req, res) =>
{
    try
    {
        const usuario = await Usuario.findById(req.params.id);
        if (usuario == null)
            return res.status(404).json({ message: mensagemNotFound });
        res.json(usuario);
    }
    catch (err)
    {
        res.status(500).json({ message: err.message });
    }
});

// Criar um novo usuário (Create)
router.post('/', async (req, res) => 
{
    //req.body.ID = 2;
    const usuario = new Usuario(req.body);
    try
    {
        const novoUsuario = await usuario.save();
        //mongoose.connection.close(); // Fechando a conexão após salvar
        res.status(201).json({ message: mensagemSucess, register: novoUsuario });
    }
    catch (err)
    {
        res.status(400).json({ message: err.message });
    }
});

// Atualizar um usuário
router.patch('/:id', async (req, res) =>
{
    try
    {
        const usuario = await Usuario.findById(req.params.id);
        if (usuario == null) { return res.status(404).json({ message: mensagemNotFound }); }
        if (req.body.nome != null)  { usuario.nome = req.body.nome; }
        if (req.body.idade != null) { usuario.idade = req.body.idade; }
        if (req.body.email != null) { usuario.email = req.body.email; }

        const atual = await usuario.save();
        res.json({ message: mensagemSucess, register: atual });
    }
    catch (err)
    {
        res.status(400).json({ message: err.message });
    }
});

// Excluir um usuário
router.delete('/:id', async (req, res) =>
{
    try
    {
        const usuario = await Usuario.findById(req.params.id);
        if (usuario == null) { return res.status(404).json({ message: mensagemNotFound }); }
        await usuario.deleteOne({ _id: req.params.id });
        res.json({ message: "Dados excluídos com sucesso.", register: usuario });
    }
    catch (err)
    {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;