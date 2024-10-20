const express          = require('express');
const router           = express.Router();
const TipoSimulado     = require('../models/TipoSimulado');
const Questao          = require('../models/Questao');
const Resposta         = require('../models/Resposta');
const mongoose         = require('mongoose');
const mensagemNotFound = "Registro não encontrado.";
const mensagemSucess   = "Dados salvos com sucesso.";
const chr              = 65;

// GET
router.get('/', async (req, res) =>
{
    try
    {
        const registros = await Questao.find();
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
        const registro = await Questao.findOne({ id: parseInt(req.params.id) });
        if (registro == null)
            return res.status(404).json({ message: mensagemNotFound });
        res.json(registro);
    }
    catch (err)
    {
        res.status(500).json({ message: err.message });
    }
});
    
// GET/:tipoSimuladoId
router.get('/byTipoSimulado/:tipoSimuladoId', async (req, res) =>
{
    try
    {
        const registros = await Questao.find({ 'tipoSimulado.id': parseInt(req.params.tipoSimuladoId) });
        res.json(registros);
    }
    catch (err)
    {
        res.status(500).json({ message: err.message });
    }
});
    
// POST
router.post('/import', async (req, res) =>
{
    try
    {
        const tiposSimulados  = await TipoSimulado.find();
        const questoes        = req.body; //await Questao.find();
        let mensagem          = "Importação realizada com sucesso.";
        const opcoesRespostas = [];
        const fs              = require('fs');
        const path            = require('path');
        let conteudo          = "";

        // Diretório específico onde o arquivo será salvo
        //const dirPath = path.join(__dirname, "..", "..", "..", "..", "Minha Estante (HTML 5)", "carga");
        const dirPath = path.join(__dirname, "..", "..", "..", "Teste", "Minha Estante (HTML 5)", "carga");

        // Verifica se o diretório existe, se não, cria-o
        if (!fs.existsSync(dirPath)) { fs.mkdirSync(dirPath, { recursive: true }); }

        // Caminho completo do arquivo
        //const filePathQuestoes = path.join(dirPath, "questoes.js");
        const filePathQuestoes = path.join(dirPath, "questoes_teste.js");

        conteudo = "var tipos_simulado = [];\n\n";
        for (let i = 0; i < tiposSimulados.length; i++)
        {
            let linha = (i == 0) ? "" : "\n";
            linha +="tipos_simulado.push( {\"cod_tipo_simulado\": \"{0}\", \"dsc_cor_fonte\": \"{1}\", \"dsc_cor_fundo\": \"{2}\", \"dsc_iniciais\": \"{3}\", \"dsc_tipo_simulado\": \"{4}\"} );";
            linha = linha.replace("{0}", tiposSimulados[i].id);
            linha = linha.replace("{1}", tiposSimulados[i].rgbFonte);
            linha = linha.replace("{2}", tiposSimulados[i].rgbFundo);
            linha = linha.replace("{3}", tiposSimulados[i].iniciais);
            linha = linha.replace("{4}", tiposSimulados[i].descricao);
            conteudo += linha;
        }

        conteudo += "\n\nvar carga_questoes = [];\n\n";
        for (let i = 0; i < questoes.length; i++)
        {
            const _questaoId = await getNextId();
            let linha = (i == 0) ? "" : "\n";
            linha += "carga_questoes.push( {\"cod_questao\": \"{0}\", \"cod_tipo_simulado\": \"{1}\", \"dsc_gabarito\": \"{2}\", \"dsc_enunciado\": \"{3}\"} );"; 
            linha = linha.replace("{0}", _questaoId);
            linha = linha.replace("{1}", questoes[i].tipoSimuladoId);
            linha = linha.replace("{2}", questoes[i].gabarito);
            linha = linha.replace("{3}", questoes[i].enunciado);
            conteudo += linha;
            for (let j = 0; j < questoes[i].opcoesRespostas.length; j++)
            {
                questoes[i].opcoesRespostas[j].questaoId = _questaoId;
                opcoesRespostas.push(questoes[i].opcoesRespostas[j]);
            }
        }

        // Adiciona conteúdo a um arquivo existente
        fs.appendFile(filePathQuestoes, conteudo, (err) =>
        {
            if (err) { mensagem = "Erro ao adicionar conteúdo ao arquivo:" + err; }
        });


        // Gravação das opções de resposta das questões
        const filePathAnswers = path.join(dirPath, "opcoes_resposta_teste.js");

        conteudo = "var carga_opcoes_resposta = [];\n\n";
        for (let i = 0; i < opcoesRespostas.length; i++)
        {
            let linha = (i == 0) ? "" : "\n";
            linha += "carga_opcoes_resposta.push( {\"cod_questao\": \"{0}\", \"cod_resposta\": \"{1}\", \"dsc_opcao_resposta\": \"{2}\"} );";
            linha = linha.replace("{0}", opcoesRespostas[i].questaoId);
            linha = linha.replace("{1}", opcoesRespostas[i].codigo);
            linha = linha.replace("{2}", opcoesRespostas[i].descricao);
            conteudo += linha;
        }

        // Adiciona conteúdo a um arquivo existente
        fs.appendFile(filePathAnswers, conteudo, (err) =>
        {
            if (err) { mensagem = "Erro ao adicionar conteúdo ao arquivo:" + err; }
        });

        res.json({ sucesso: true, mensagem, qtd_registros: questoes.length, qtd_cadastros: 0, qtd_atualizacoes: 0 });
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
        let registro = new Questao();
        let mensagem = mensagemSucess;
        if ((await Questao.find({ enunciado: req.body.enunciado })).length > 0)
            mensagem = "Questão já existente.";
        else
        {
            const tipoSimuladoExistente = await TipoSimulado.find({ id: parseInt(req.body.tipoSimuladoId) });
            if (tipoSimuladoExistente.length == 0)
                mensagem = "Tipo de simulado não existente.";
            else
            {
                registro.enunciado = req.body.enunciado;
                registro.tipoSimulado = tipoSimuladoExistente;
                if (req.body.gabarito != null)     { registro.gabarito = req.body.gabarito; }
                registro.id = await getNextId(); //new mongoose.Types.ObjectId();
                registro.opcoesRespostas = [];
                for (let i = 0; i < req.body.opcoesRespostas.length; i++)
                {
                    let resposta = new Resposta();
                    //resposta.idQuestao = registro._id;
                    resposta.opcao = String.fromCharCode(chr + i);
                    resposta.descricao = req.body.opcoesRespostas[i];
                    registro.opcoesRespostas.push(resposta);
                }
                const resultado = await registro.save();
                doImport(registro);
                /*doImport({ id: 0,
                           enunciado: registro.enunciado,
                           gabarito: registro.gabarito,
                           tipoSimulado: registro.tipoSimulado,
                           opcoesRespostas: registro.opcoesRespostas});*/
            }
        }
        res.status(201).json({ message: mensagem, registro });
    }
    catch (err)
    {
        console.log(err);
        res.status(400).json({ message: err.message });
    }
});

// PATCH (PUT)
router.patch('/', async (req, res) =>
{
    try
    {
        let registro = new Questao();
        let mensagem = "";
        let statusNumber = 500;
        if ((await Questao.find({ $and: [{ enunciado: req.body.enunciado }, { id: { $ne: parseInt(req.body.id) } }]})).length > 0)
            mensagem = "Questão já existente.";
        else
        {
            const tipoSimuladoExistente = await TipoSimulado.find({ id: parseInt(req.body.tipoSimuladoId) });
            if (tipoSimuladoExistente.length == 0)
                mensagem = "Tipo de simulado não existente.";
            else
            {
                if ((await Questao.find({ id: parseInt(req.body.id) })).length == 0)
                    return res.status(404).json({ message: mensagemNotFound });
                mensagem = mensagemSucess;
                statusNumber = 201;
                let opcoesRespostas = [];
                for (let i = 0; i < req.body.opcoesRespostas.length; i++)
                {
                    let resposta = new Resposta();
                    resposta.opcao = String.fromCharCode(chr + i);
                    resposta.descricao = req.body.opcoesRespostas[i];
                    opcoesRespostas.push(resposta);
                }
                registro = await Questao.findOneAndUpdate({ id: parseInt(req.body.id) },
                                                          { $set: { enunciado: req.body.enunciado,
                                                                    gabarito: req.body.gabarito,
                                                                    tipoSimulado: tipoSimuladoExistente[0],
                                                                    respostas: opcoesRespostas } },
                                                          { new: true });
                doImport(registro);
                /*doImport({ id: registro.id,
                           enunciado: registro.enunciado,
                           gabarito: registro.gabarito,
                           tipoSimulado: registro.tipoSimulado,
                           opcoesRespostas: registro.opcoesRespostas});*/
            }
        }
        res.status(statusNumber).json({ message: mensagem, registro });
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
        const registro = await Questao.findOneAndDelete({ id: parseInt(req.params.id) });
        if (registro == null) { return res.status(404).json({ message: mensagemNotFound }); }
        res.json({ message: "Dados excluídos com sucesso.", resultado });
    }
    catch (err)
    {
        res.status(500).json({ message: err.message });
    }
});
    
// PATCH (PUT)/:id
router.post('/excel', async (req, res) =>
{
    try
    {
        const registro = new Questao();
        const extensaoArquivo = "xlsx";
        const nomeArquivo = "carga_teste." + extensaoArquivo;
        const XLSX = require(extensaoArquivo);

        // Lê o arquivo Excel existente
        const workbook = XLSX.readFile(nomeArquivo);
        const worksheetQuestions = "Questões de Concursos";
        const worksheetQuestionAnswers = "Opções de Resposta de Questões";
        //["cod_questao", "cod_resposta", "dsc_opcao_resposta"]

        if (req.body.id != null)           { registro.id = req.body.id; }
        if (req.body.gabarito != null)     { registro.gabarito = req.body.gabarito; }
        if (req.body.enunciado != null)    { registro.enunciado = req.body.enunciado; }
        if (req.body.tipoSimulado != null)
            registro.tipoSimulado = new TipoSimulado({ id: req.body.tipoSimulado, rgbFonte: null, rgbFundo: null, 
                                                        iniciais: null, descricao: null });
        registro.respostas = (req.body.respostas != null) ? req.body.respostas : [];

        for (let i = 0; i < workbook.SheetNames.length; i++)
        {
            const worksheet = workbook.Sheets[worksheetQuestions];
            if (workbook.SheetNames[i] == worksheetQuestions && worksheet)
            {
                const rows = XLSX.utils.sheet_to_row_object_array(worksheet);
                let data_in_json = XLSX.utils.sheet_to_json(worksheet);
                data_in_json = rows;
                data_in_json.push({ cod_questao: registro.id, cod_tipo_simulado: registro.tipoSimulado.id,
                                    dsc_gabarito: registro.gabarito, dsc_enunciado: registro.enunciado });

                // Atualiza a planilha com os novos dados
                workbook.Sheets[workbook.SheetNames[i]] = XLSX.utils.json_to_sheet(data_in_json);              
            }
        }

        //const data2 = [
        //    ['Nome', 'Idade', 'Cidade'],
        //    ['João Silva', 28, 'São Paulo'],
        //    ['Maria Oliveira', 32, 'Rio de Janeiro'],
        //    ['Carlos Pereira', 45, 'Belo Horizonte']
        //  ];
        // XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(data2), "Minha Planilha 4");

        // Salva o arquivo Excel com as alterações
        XLSX.writeFile(workbook, nomeArquivo);
        console.log('Dados inseridos e arquivo atualizado com sucesso!');

        res.json({ message: mensagemSucess, resultado });
    }
    catch (err)
    {
        res.status(400).json({ message: err.message });
    }
});

async function getNextId()
{
  const lastId = await Questao.findOne().sort({ id: -1 });
  return lastId ? lastId.id + 1 : 1;
}

async function doImport(questao)
{
    const fs   = require('fs');
    const path = require('path');

    // Diretório específico onde o arquivo será salvo
    const dirPath = path.join(__dirname, "..", "..", "..", "..", "Minha Estante (HTML 5)", "carga");
    //const dirPath = path.join(__dirname, "..", "..", "..", "Teste", "Minha Estante (HTML 5)", "carga");

    const caminhoArquivo = path.join(dirPath, "questoes_teste.js");

    let itensConteudo = " ".repeat(44) + "{ \"opcao\": \"{8}\", \"descricao\": \"{9}\" }";
    let conteudo = "\n";
    conteudo += "carga_questoes.push( { \"id\": {0}, \"enunciado\": \"{1}\", ";
    conteudo += "\"tipoSimulado\": { \"id\": {2}, \"descricao\": \"{3}\", \"rgbFonte\": \"{4}\", \"rgbFundo\": \"{5}\", \"iniciais\": \"{6}\" }, ";
    conteudo += "\"gabarito\": \"{7}\",\n";
    conteudo += " ".repeat(23) + "\"opcoesRespostas\": [\n";

    // Verifica se o diretório existe, se não, cria-o
    if (!fs.existsSync(dirPath)) { fs.mkdirSync(dirPath, { recursive: true }); }

    if (questao.id == 0)
    {
        conteudo = conteudo.replace("{0}", await getNextId());
        conteudo = conteudo.replace("{1}", questao.enunciado);
        conteudo = conteudo.replace("{2}", questao.tipoSimulado.id);
        conteudo = conteudo.replace("{3}", questao.tipoSimulado.descricao);
        conteudo = conteudo.replace("{4}", questao.tipoSimulado.rgbFonte);
        conteudo = conteudo.replace("{5}", questao.tipoSimulado.rgbFundo);
        conteudo = conteudo.replace("{6}", questao.tipoSimulado.iniciais);
        conteudo = conteudo.replace("{7}", questao.gabarito);
        for (let j = 0; j < questao.opcoesRespostas.length; j++)
        {
            conteudo += itensConteudo + ((j == questao.opcoesRespostas.length - 1) ? "" : ",") + "\n";
            conteudo = conteudo.replace("{8}", questao.opcoesRespostas[j].opcao);
            conteudo = conteudo.replace("{9}", questao.opcoesRespostas[j].descricao);
        }
    }
    else
    {
        // Limpando o conteúdo do arquivo
        await fs.promises.writeFile(caminhoArquivo, '', 'utf8');

        const tiposSimulados = await TipoSimulado.find();

        inicioConteudo = "var tipos_simulado = [];\n";
        for (let i = 0; i < tiposSimulados.length; i++)
        {
            let linha = "\ntipos_simulado.push( {\"id\": \"{0}\", \"rgbFonte\": \"{1}\", \"rgbFundo\": \"{2}\", \"iniciais\": \"{3}\", \"descricao\": \"{4}\"} );";
            linha = linha.replace("{0}", tiposSimulados[i].id);
            linha = linha.replace("{1}", tiposSimulados[i].rgbFonte);
            linha = linha.replace("{2}", tiposSimulados[i].rgbFundo);
            linha = linha.replace("{3}", tiposSimulados[i].iniciais);
            linha = linha.replace("{4}", tiposSimulados[i].descricao);
            inicioConteudo += linha;
        }

        inicioConteudo += "\n\nvar carga_questoes = [];\n";

        // Ler do banco de dados os registros
        const registros = await Questao.find();
        for (let i = 0; i < registros.length; i++)
        {
            // Atualizar a linha específica
            if (registros[i].id == questao.id)
            {
                registros[i].enunciado    = questao.enunciado;
                registros[i].gabarito     = questao.gabarito;
                registros[i].tipoSimulado = questao.tipoSimulado;
                registros[i].respostas    = questao.opcoesRespostas;
            }
            conteudo = conteudo.replace("{0}", registros[i].id);
            conteudo = conteudo.replace("{1}", registros[i].enunciado);
            conteudo = conteudo.replace("{2}", registros[i].tipoSimulado.id);
            conteudo = conteudo.replace("{3}", registros[i].tipoSimulado.descricao);
            conteudo = conteudo.replace("{4}", registros[i].tipoSimulado.rgbFonte);
            conteudo = conteudo.replace("{5}", registros[i].tipoSimulado.rgbFundo);
            conteudo = conteudo.replace("{6}", registros[i].tipoSimulado.iniciais);
            conteudo = conteudo.replace("{7}", registros[i].gabarito);
            for (let j = 0; j < registros[i].opcoesRespostas.length; j++)
            {
                conteudo += itensConteudo + ((j == registros[i].opcoesRespostas.length - 1) ? "" : ",") + "\n";
                conteudo = conteudo.replace("{8}", registros[i].opcoesRespostas[j].opcao);
                conteudo = conteudo.replace("{9}", registros[i].opcoesRespostas[j].descricao);
            }
        }
        conteudo = inicioConteudo + conteudo;
    }
    conteudo += " ".repeat(42) + "] } );";

    // Adiciona conteúdo a um arquivo existente com caminho completo
    fs.appendFile(caminhoArquivo, conteudo, (err) =>
    {
        //if (err) { mensagem = "Erro ao adicionar conteúdo ao arquivo:" + err; }
    });
}

module.exports = router;