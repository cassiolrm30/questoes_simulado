const express          = require('express');
const router           = express.Router();
const TipoSimulado     = require('../models/TipoSimulado');
const Questao          = require('../models/Questao');
const Resposta         = require('../models/Resposta');
const mensagemNotFound = "Registro não encontrado.";
const mensagemSuccess  = "Dados salvos com sucesso.";
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
   
// GET/byTipoSimulado/:tipoSimuladoId
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
router.post('/', async (req, res) =>
{
    try
    {
        let registro = new Questao();
        let mensagem = mensagemSuccess;
        if ((await Questao.findOne({ enunciado: req.body.enunciado.trim() })).length > 0)
            mensagem = "Questão já existente.";
        else
        {
            const tipoSimuladoExistente = await TipoSimulado.findOne({ id: parseInt(req.body.tipoSimuladoId) });
            if (tipoSimuladoExistente == null)
                mensagem = "Tipo de simulado não existente.";
            else
            {
                registro.enunciado = req.body.enunciado;
                registro.tipoSimulado = tipoSimuladoExistente;
                if (req.body.gabarito != null) { registro.gabarito = req.body.gabarito; }
                registro.id = await getNextId();
                registro.opcoesRespostas = [];
                for (let i = 0; i < req.body.opcoesRespostas.length; i++)
                {
                    let resposta = new Resposta();
                    resposta.opcao = String.fromCharCode(chr + i);
                    resposta.descricao = req.body.opcoesRespostas[i];
                    registro.opcoesRespostas.push(resposta);
                }
                const resultado = await registro.save();
                const registros = await Questao.find();
                const dadosImportacao = await doImport(registros, 1);
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
        if ((await Questao.find({ $and: [{ enunciado: req.body.enunciado.trim() }, { id: { $ne: parseInt(req.body.id) } }]})).length > 0)
            mensagem = "Questão já existente.";
        else
        {
            const tipoSimuladoExistente = await TipoSimulado.findOne({ id: parseInt(req.body.tipoSimuladoId) });
            if (tipoSimuladoExistente == null)
                mensagem = "Tipo de simulado não existente.";
            else
            {
                if (await Questao.findOne({ id: parseInt(req.body.id) }) == null)
                    return res.status(404).json({ message: mensagemNotFound });
                mensagem = mensagemSuccess;
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
                                                                    tipoSimulado: tipoSimuladoExistente,
                                                                    respostas: opcoesRespostas } },
                                                          { new: true });
                const registros = await Questao.find();
                const dadosImportacao = await doImport(registros, 1);
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
        const registros = await Questao.find();
        const dadosImportacao = await doImport(registros, 1);
        res.json({ message: "Dados excluídos com sucesso.", registro });
    }
    catch (err)
    {
        res.status(500).json({ message: err.message });
    }
});

async function getNextId()
{
  const lastId = await Questao.findOne().sort({ id: -1 });
  return lastId ? lastId.id + 1 : 1;
}

// POST
router.post('/import', async (req, res) =>
{
    const resultado = await doImport(req.body.dadosImportacao, 0);
    res.json(resultado);
});

async function doImport(questoes, opcao)
{
    try
    {
        const path             = require('path');
        const dirPath          = path.join(__dirname, "..", "..", "..", "..", "Minha Estante (HTML 5)", "carga");
        const caminhoArquivo   = "questoes_teste.js";                // "questoes.js"
        const filePathQuestoes = path.join(dirPath, caminhoArquivo); // Caminho completo do arquivo
        const fs               = require('fs');
        const mensagem         = "Importação realizada com sucesso.";
        const identacao1       = " ".repeat(23);
        const identacao2       = " ".repeat(42);
        const identacao3       = " ".repeat(44);
        const tiposSimulados   = await TipoSimulado.find();
        const questoesIDs      = await Questao.find(null, { id: 1 }).sort({ id: 1 });
        const tiposSimuladosIDs= [];
        const questoesNovas    = [];
        const formatoTxtQuestao       = "\ncarga_questoes.push( { \"id\": {0}, \"enunciado\": \"{1}\", \"tipoSimulado\": {2}, \"gabarito\": \"{3}\",\n{4}\"opcoesRespostas\": [{5}] } );";
        const formatoTxtTipoSimulado  = "{ \"id\": {0}, \"descricao\": \"{1}\", \"rgbFonte\": \"{2}\", \"rgbFundo\": \"{3}\", \"iniciais\": \"{4}\" }";
        const formatoTxtOpcaoResposta = "\n{0}{ \"opcao\": \"{1}\", \"descricao\": \"{2}\" },";

        let qtdCadastros       = 0;
        let qtdAtualizacoes    = 0;
        let qtdInvalidos       = 0;
        let TAM_tipoSimuladoId = 0;
        let TAM_rgbFonte       = 0;
        let TAM_rgbFundo       = 0;
        let TAM_iniciais       = 0;
        let TAM_descricao      = 0;
        let conteudo           = "";

        for (let i = 0; i < tiposSimulados.length; i++)
        {
            if (tiposSimulados[i].id.toString().length > TAM_tipoSimuladoId) { TAM_tipoSimuladoId = tiposSimulados[i].id.toString().length; }
            if (tiposSimulados[i].rgbFonte.length > TAM_rgbFonte)            { TAM_rgbFonte       = tiposSimulados[i].rgbFonte.length;      }
            if (tiposSimulados[i].rgbFundo.length > TAM_rgbFundo)            { TAM_rgbFundo       = tiposSimulados[i].rgbFundo.length;      }
            if (tiposSimulados[i].iniciais.length > TAM_iniciais)            { TAM_iniciais       = tiposSimulados[i].iniciais.length;      }
            if (tiposSimulados[i].descricao.length > TAM_descricao)          { TAM_descricao      = tiposSimulados[i].descricao.length;     }
            tiposSimuladosIDs.push(tiposSimulados[i].id);
        }
   
        conteudo = "var tipos_simulado = [];\n";
        for (let i = 0; i < tiposSimulados.length; i++)
        {
            let formato = "\ntipos_simulado.push( {\"id\": {0}, \"rgbFonte\": \"{1}\", \"rgbFundo\": \"{2}\", \"iniciais\": \"{3}\", \"descricao\": \"{4}\"} );";
            formato = formato.replace("{0}", " ".repeat(TAM_tipoSimuladoId - tiposSimulados[i].id.toString().length) + tiposSimulados[i].id.toString());
            formato = formato.replace("{1}", tiposSimulados[i].rgbFonte + " ".repeat(TAM_rgbFonte - tiposSimulados[i].rgbFonte.length));
            formato = formato.replace("{2}", tiposSimulados[i].rgbFundo + " ".repeat(TAM_rgbFundo - tiposSimulados[i].rgbFundo.length));
            formato = formato.replace("{3}", tiposSimulados[i].iniciais + " ".repeat(TAM_iniciais - tiposSimulados[i].iniciais.length));
            formato = formato.replace("{4}", tiposSimulados[i].descricao.trim() + " ".repeat(TAM_descricao - tiposSimulados[i].descricao.trim().length));
            conteudo += formato;
        }

        let TAM_questaoId = 0;
        let TAM_enunciado = 0;
        for (let i = 0; i < questoes.length; i++)
        {
            if (questoes[i].id.toString().length > TAM_questaoId) { TAM_questaoId = questoes[i].id.toString().length; }
            if (questoes[i].enunciado.length > TAM_enunciado)     { TAM_enunciado = questoes[i].enunciado.length;     }
        }
   
        console.log(questoesIDs);
        //console.log(tiposSimuladosIDs);

        //let _id = 0;
        //let _questaoId = await getNextId();
        conteudo += "\n\nvar carga_questoes = [];\n";

        for (let i = 0; i < questoes.length; i++)
        {
            if (!tiposSimuladosIDs.includes(parseInt(questoes[i].tipoSimuladoId)))
            {
                qtdInvalidos++;
            }
            else
            {
                if (questoes[i].opcoesRespostas.length < 2 || questoes[i].opcoesRespostas.length > 5)
                {
                    qtdInvalidos++;
                }
                else
                {
                    questoesNovas.push(questoes[i]);
                    if (questoesIDs.includes(parseInt(questoes[i].id)))
                    {
                        //_id = parseInt(questoes[i].id);
                        qtdAtualizacoes++;
                    }
                    else
                    {
                        //_id = _questaoId;
                        //questoes[i].id = _questaoId;
                        //_questaoId++;
                        qtdCadastros++;
                    }
                    /*let formatoTS = formatoTxtTipoSimulado.replace("{0}", " ".repeat(TAM_tipoSimuladoId - _tipoSimulado.id.toString().length) + _tipoSimulado.id.toString())
                                                        .replace("{1}", _tipoSimulado.descricao.trim() + " ".repeat(TAM_descricao - _tipoSimulado.descricao.trim().length))
                                                        .replace("{2}", _tipoSimulado.rgbFonte + " ".repeat(TAM_rgbFonte - _tipoSimulado.rgbFonte.length))
                                                        .replace("{3}", _tipoSimulado.rgbFundo + " ".repeat(TAM_rgbFundo - _tipoSimulado.rgbFundo.length))
                                                        .replace("{4}", _tipoSimulado.iniciais + " ".repeat(TAM_iniciais - _tipoSimulado.iniciais.length));

                    let formatoOR = "";
                    for (let j = 0; j < questoes[i].opcoesRespostas.length; j++)
                    {
                        formatoOR += formatoTxtOpcaoResposta.replace("{0}", identacao3)
                                                            .replace("{1}", questoes[i].opcoesRespostas[j].opcao)
                                                            .replace("{2}", questoes[i].opcoesRespostas[j].descricao);
                    }
                    formatoOR += "\n" + identacao2;

                    let formato = formatoTxtQuestao.replace("{0}", _id)
                                                .replace("{1}", questoes[i].enunciado.trim() + " ".repeat(TAM_enunciado - questoes[i].enunciado.trim().length))
                                                .replace("{2}", formatoTS)
                                                .replace("{3}", questoes[i].gabarito)
                                                .replace("{4}", identacao1)
                                                .replace("{5}", formatoOR);
                    //_id++;
                    conteudo += formato;*/
                }
            }
        }

        /*if (opcao == 0)
        {
            const resultado = await Questao.bulkWrite(
                                questoesNovas.map(questao =>
                                ({
                                    updateOne:
                                    {
                                        filter: { enunciado: questao.enunciado.trim() },
                                        update: { $set: questao },
                                        upsert: true
                                    }
                                }))
            );
            //console.log(resultado);
        }*/
   
        // Limpando o conteúdo do arquivo
        await fs.promises.writeFile(filePathQuestoes, "", "utf8");

        // Adiciona conteúdo a um arquivo existente
        fs.appendFile(filePathQuestoes, conteudo, (err) =>
        {
            if (err) { mensagem = "Erro ao adicionar conteúdo ao arquivo:" + err; }
        });

        return ({ sucesso: true, mensagem, qtd_registros: questoes.length, qtd_cadastros: qtdCadastros, qtd_atualizacoes: qtdAtualizacoes, qtd_invalidos: qtdInvalidos });
    }
    catch (err)
    {
        return ({ sucesso: false, mensagem: err.message, qtd_registros: 0, qtd_cadastros: 0, qtd_atualizacoes: 0, qtd_invalidos: 0 });
    }
}

// POST
router.post('/excel', async (req, res) =>
{
    try
    {
        const mensagem = "Importação realizada com sucesso.";
        /*const registro = new Questao();
        const extensaoArquivo = "xlsx";
        const nomeArquivo2 = "carga_teste." + extensaoArquivo;
        const XLSX = require(extensaoArquivo);

        // Lê o arquivo Excel existente
        const workbook = XLSX.readFile(nomeArquivo2);
        const worksheetQuestions = "Questões de Concursos";
        const worksheetQuestionAnswers = "Opções de Resposta de Questões";
        //["cod_questao", "cod_resposta", "dsc_opcao_resposta"]

        if (req.body.id != null)           { registro.id = req.body.id; }
        if (req.body.gabarito != null)     { registro.gabarito = req.body.gabarito; }
        if (req.body.enunciado != null)    { registro.enunciado = req.body.enunciado; }
        if (req.body.tipoSimulado != null)
            registro.tipoSimulado = new TipoSimulado({ id: req.body.tipoSimulado, rgbFonte: null, rgbFundo: null,
                                                        iniciais: null, descricao: null });
        registro.opcoesRespostas = (req.body.opcoesRespostas != null) ? req.body.opcoesRespostas : [];

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
        XLSX.writeFile(workbook, nomeArquivo2);
        console.log('Dados inseridos e arquivo atualizado com sucesso!');*/

        res.json({ message: mensagem, resultado });
    }
    catch (err)
    {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;