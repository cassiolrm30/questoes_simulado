const express            = require('express');
const cors               = require('cors');
const mongoose           = require('mongoose');
const bodyParser         = require('body-parser');
const usuarioRouter      = require('./routes/usuario.js');
const tipoSimuladoRouter = require('./routes/tipoSimulado.js');
const questaoRouter      = require('./routes/questao.js');
const simulacaoRouter    = require('./routes/simulacao.js');
const dashboardRouter    = require('./routes/dashboard.js');
const app                = express();
const port               = 1234;

// Conectando ao MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/questoes_simulado")
        .then(() => { console.log("Conectado ao MongoDB"); })
        .catch(err => { console.error("Erro ao conectar ao MongoDB", err); });

// Middleware
app.use(bodyParser.json());
app.use(cors())

// Rotas
app.use('/usuarios', usuarioRouter);
app.use('/tiposSimulado', tipoSimuladoRouter);
app.use('/questoes', questaoRouter);
app.use('/simulacoes', simulacaoRouter);
app.use('/dashboard', dashboardRouter);

// Rota inicial
app.get('/', (req, res) => { res.send('Bem-vindo ao CRUD de exemplo!'); });
app.listen(port, () => { console.log(`Servidor rodando em http://localhost:${port}`); });