const express          = require('express');
const router           = express.Router();
const TipoSimulado     = require('../models/TipoSimulado');
const Questao          = require('../models/Questao');
const Resposta         = require('../models/Resposta');
const mensagemNotFound = "Registro não encontrado.";
const mensagemSuccess  = "Dados salvos com sucesso.";
const chr              = 65;
const path             = require('path');
const dirPath          = path.join(__dirname, "..", "..", "..", "..", "Minha Estante (HTML 5)", "carga");

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

async function doImport(cargaImportacao, opcao)
{
    let resultado = null;
    let sucesso   = true;
    let mensagem  = "";
    let qtdCadastros = 0, qtdAtualizacoes = 0, qtdInvalidos = [0, 0];
    if (cargaImportacao.length == 0)
    {
        sucesso = false; mensagem = "Carga de importação vazia!";
    }
    else
    {
        try
        {
            const caminhoArquivo    = path.join(dirPath, "questoes_teste.js"); // Caminho completo do arquivo "questoes.js"
            const fs                = require('fs');
            const identacao1        = " ".repeat(23);
            const identacao2        = " ".repeat(42);
            const identacao3        = " ".repeat(44);
            const tiposSimulados    = await TipoSimulado.find();
            const questoesBD        = await Questao.find(null, { id: 1 }).sort({ id: 1 });
            //const questoesBD      = await Questao.countDocuments();
            const questoesIDs       = [];
            const tiposSimuladosIDs = [];
            const questoesValidas   = [];
            const formatoTxtQuestao       = "\ncarga_questoes.push( { \"id\": {0}, \"enunciado\": \"{1}\", \"tipoSimulado\": {2}, \"gabarito\": \"{3}\",\n{4}\"opcoesRespostas\": [{5}] } );";
            const formatoTxtTipoSimulado  = "{ \"id\": {0}, \"descricao\": \"{1}\", \"rgbFonte\": \"{2}\", \"rgbFundo\": \"{3}\", \"iniciais\": \"{4}\" }";
            const formatoTxtOpcaoResposta = "\n{0}{ \"opcao\": \"{1}\", \"descricao\": \"{2}\" },";

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
            for (let i = 0; i < cargaImportacao.length; i++)
            {
                if (cargaImportacao[i].id.toString().length > TAM_questaoId) { TAM_questaoId = cargaImportacao[i].id.toString().length; }
                if (cargaImportacao[i].enunciado.length > TAM_enunciado)     { TAM_enunciado = cargaImportacao[i].enunciado.length;     }
            }

            for (let i = 0; i < questoesBD.length; i++) { questoesIDs.push(questoesBD[i].id); }
            let _id = 0;
            let _questaoId = await getNextId();
            conteudo += "\n\nvar carga_questoes = [];\n";

            for (let i = 0; i < cargaImportacao.length; i++)
            {
                if (!tiposSimuladosIDs.includes(parseInt(cargaImportacao[i].tipoSimuladoId)))
                    qtdInvalidos[0]++;
                else
                {
                    if (cargaImportacao[i].opcoesRespostas.length < 2 || cargaImportacao[i].opcoesRespostas.length > 5)
                        qtdInvalidos[1]++;
                    else
                    {
                        let questaoValida = new Questao();
                        questaoValida.id = cargaImportacao[i].id;
                        questaoValida.enunciado = cargaImportacao[i].enunciado;
                        questaoValida.gabarito  = cargaImportacao[i].gabarito;
                        questaoValida.tipoSimulado = await TipoSimulado.findOne({ id: parseInt(cargaImportacao[i].tipoSimuladoId) });
                        questaoValida.opcoesRespostas = cargaImportacao[i].opcoesRespostas;
                        questoesValidas.push(questaoValida);
                        if (questoesIDs.includes(parseInt(cargaImportacao[i].id)))
                        {
                            _id = parseInt(cargaImportacao[i].id);
                            qtdAtualizacoes++;
                        }
                        else
                        {
                            _id = _questaoId;
                            cargaImportacao[i].id = _questaoId;
                            _questaoId++;
                            qtdCadastros++;
                        }
                        const _tipoSimulado = questaoValida.tipoSimulado;
                        let formatoTS = formatoTxtTipoSimulado.replace("{0}", " ".repeat(TAM_tipoSimuladoId - _tipoSimulado.id.toString().length) + _tipoSimulado.id.toString())
                                                              .replace("{1}", _tipoSimulado.descricao.trim() + " ".repeat(TAM_descricao - _tipoSimulado.descricao.trim().length))
                                                              .replace("{2}", _tipoSimulado.rgbFonte + " ".repeat(TAM_rgbFonte - _tipoSimulado.rgbFonte.length))
                                                              .replace("{3}", _tipoSimulado.rgbFundo + " ".repeat(TAM_rgbFundo - _tipoSimulado.rgbFundo.length))
                                                              .replace("{4}", _tipoSimulado.iniciais + " ".repeat(TAM_iniciais - _tipoSimulado.iniciais.length));

                        let formatoOR = "";
                        for (let j = 0; j < cargaImportacao[i].opcoesRespostas.length; j++)
                        {
                            formatoOR += formatoTxtOpcaoResposta.replace("{0}", identacao3)
                                                                .replace("{1}", cargaImportacao[i].opcoesRespostas[j].opcao)
                                                                .replace("{2}", cargaImportacao[i].opcoesRespostas[j].descricao);
                        }
                        formatoOR += "\n" + identacao2;

                        let formato = formatoTxtQuestao.replace("{0}", _id)
                                                       .replace("{1}", cargaImportacao[i].enunciado.trim() + " ".repeat(TAM_enunciado - cargaImportacao[i].enunciado.trim().length))
                                                       .replace("{2}", formatoTS)
                                                       .replace("{3}", cargaImportacao[i].gabarito)
                                                       .replace("{4}", identacao1)
                                                       .replace("{5}", formatoOR);
                        //_id++;
                        conteudo += formato;
                    }
                }
            }

            let resultadoBulkWrite = 0;
            if (opcao == 0)
            {
                const _bulkWrite = await Questao.bulkWrite(
                                    questoesValidas.map(questao =>
                                    ({
                                        updateOne:
                                        {
                                            filter: { id: questao.id },
                                            update: { $set: { enunciado: questao.enunciado,
                                                              gabarito: questao.gabarito,
                                                              tipoSimulado: questao.tipoSimulado,
                                                              opcoesRespostas: questao.opcoesRespostas }
                                                    },
                                            upsert: true
                                        }
                                    })));
                //console.log(_bulkWrite);
                resultadoBulkWrite += _bulkWrite.insertedCount;
                resultadoBulkWrite += _bulkWrite.matchedCount;
                resultadoBulkWrite += _bulkWrite.modifiedCount;
                resultadoBulkWrite += _bulkWrite.deletedCount;
                resultadoBulkWrite += _bulkWrite.upsertedCount;
            }

            if (resultadoBulkWrite == 0)
                mensagem = "Não houve inclusão/atualização de dados.";
            else
            {
                mensagem = "Importação realizada com sucesso.";

                // Limpando o conteúdo do arquivo
                await fs.promises.writeFile(caminhoArquivo, "", "utf8");

                // Adiciona conteúdo a um arquivo existente
                fs.appendFile(caminhoArquivo, conteudo, (err) =>
                {
                    if (err) { mensagem = "Erro ao adicionar conteúdo ao arquivo:" + err; }
                });
            }

            sucesso = true; 
        }
        catch (err)
        {
            sucesso = false; mensagem = err.message;
        }
    }
    resultado = {
                  sucesso, mensagem, 
                  qtd_registros: cargaImportacao.length, 
                  qtd_cadastros: qtdCadastros,
                  qtd_atualizacoes: qtdAtualizacoes,
                  qtd_invalidos: (qtdInvalidos[0] + " com tipo de simulado inválido / " + qtdInvalidos[1] + " com quantidade de opções de resposta menor que 2 ou maior que 5.")
                };
    return (resultado);
}

// POST
router.post('/excel', async (req, res) =>
{
    try
    {
        const ExcelJS = require('exceljs');

        // Cria um novo workbook
        const workbook = new ExcelJS.Workbook();

        // Estilos de fonte
        const fonteSheet1 = { name: "Arial", size: 10 };

        // Criando a aba de Categorias
        const abaCategorias = workbook.addWorksheet("Categorias");
        abaCategorias.columns =
        [
            { width: 20, key: "coluna1", header: "num_categoria"   },
            { width: 15, key: "coluna2", header: "cod_categoria"   },
            { width: 25, key: "coluna3", header: "dsc_largura_aba" },
            { width: 15, key: "coluna4", header: "dsc_cor_borda"   },
            { width: 15, key: "coluna5", header: "dsc_cor_fundo"   },
            { width: 25, key: "coluna6", header: "dsc_categoria"   }
        ];
        abaCategorias.getRow(1).height = 13; abaCategorias.getRow(1).font = fonteSheet1;

        for (let i = 0; i < 10; i++)
        {
            const j = i + 2;
            abaCategorias.addRow({ coluna1: i, coluna2: 25, coluna3: "",
                                   coluna4: "AAAAAA", coluna5: "BBBBBB", coluna6: "Bbcxvcxvxcvxcvxv" });
            abaCategorias.getRow(j).height = 13; abaCategorias.getRow(j).font = fonteSheet1;
        }

        // Cria a segunda aba com fonte personalizada
        const abaProdutos = workbook.addWorksheet("Produtos");
        abaProdutos.columns = 
        [
            { width: 25, key: "produto",    header: "Produto"    },
            { width: 15, key: "quantidade", header: "Quantidade" },
            { width: 10, key: "preco",      header: "Preço"      }
        ];
        abaProdutos.addRow({ produto: 'Caderno', quantidade: 10, preco: 5.50 });
        abaProdutos.addRow({ produto: 'Caneta', quantidade: 20, preco: 2.00 });
        abaProdutos.getRow(1).font = fonteSheet1;

        const abaQuestoes = workbook.addWorksheet("Questões de Concursos");
        abaQuestoes.columns = 
        [
            { width: 10, key: "cod_questao",       header: "cod_questao"       },
            { width: 10, key: "cod_tipo_simulado", header: "cod_tipo_simulado" },
            { width: 50, key: "enunciado",         header: "enunciado"         },
            { width: 10, key: "gabarito",          header: "gabarito"          }
        ];

        const abaOpcoesRespostas = workbook.addWorksheet("Opçoes de Resposta de Questões");
        abaOpcoesRespostas.columns = 
        [
            { width: 10, key: "cod_questao", header: "cod_questao" },
            { width: 10, key: "cod_opcao",   header: "cod_opcao"   },
            { width: 50, key: "descricao",   header: "descricao"   }
        ];

        const questoes = await Questao.find();
        for (let i = 0; i < questoes.length; i++)
        {
            const registro = questoes[i];
            if (registro.tipoSimulado != null)
            {
                abaQuestoes.addRow({ cod_questao: registro.id.toString(),
                                     cod_tipo_simulado: registro.tipoSimulado.id.toString(),
                                     enunciado: registro.enunciado,
                                     gabarito: registro.gabarito });
    
                for (let j = 0; j < registro.opcoesRespostas.length; j++)
                {
                    abaOpcoesRespostas.addRow({ cod_questao: registro.id,
                                                cod_opcao: registro.opcoesRespostas[j].opcao,
                                                descricao: registro.opcoesRespostas[j].descricao });
                }
            }
        }
 
        // Salva o arquivo
        workbook.xlsx.writeFile(dirPath + "\\nova_carga.xlsx");

        /*
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
        */

        res.status(201).json({ sucesso: true, message: "Importação realizada com sucesso." });
    }
    catch (err)
    {
        res.status(400).json({ sucesso: false, message: err.message });
    }
});

// POST
router.post('/excelAndImport', async (req, res) =>
{
    const caminhoArquivo = path.join(dirPath, "carga.xlsx"); // Caminho completo do arquivo
    const ExcelJS        = require('exceljs');
    const workbook       = new ExcelJS.Workbook();
    let questoes         = [];
    try
    {
        // Carrega a planilha
        await workbook.xlsx.readFile(caminhoArquivo);
        
        const abaQuestoes = workbook.getWorksheet("Questões de Concursos");
        const abaOpcoesRespostaLinhas = workbook.getWorksheet("Opçoes de Resposta de Questões");
        let resultado = { sucesso: false, message: "Abas 'Questões de Concursos' e 'Opçoes de Resposta de Questões' não encontradas." };

        if (abaQuestoes && abaOpcoesRespostaLinhas) // ambas as abas devem ser existentes
        {
            // Itera pelas abas de questões e opções de respostas
            const abaQuestoes = workbook.getWorksheet("Questões de Concursos");
            abaQuestoes.eachRow((row, rowIndex) =>
            {
                if (rowIndex > 1)
                {
                    let questao             = new Questao();
                    questao.id              = row.values[1];
                    questao.tipoSimuladoId  = row.values[2];
                    questao.gabarito        = row.values[3];
                    questao.enunciado       = row.values[4];
                    questao.opcoesRespostas = [];
                    questoes.push(questao);
                }
            });
            for (let i = 0; i < questoes.length; i++)
            {
                abaOpcoesRespostaLinhas.eachRow((row, rowIndex) =>
                {
                    if (rowIndex > 1 && parseInt(row.values[1]) == parseInt(questoes[i].id))
                    {
                        let opcaoResposta       = new Resposta();
                        opcaoResposta.opcao     = row.values[2];
                        opcaoResposta.descricao = row.values[3];
                        questoes[i].opcoesRespostas.push(opcaoResposta);
                    }
                });
            }
            resultado = await doImport(questoes, 0);
        }
        res.json(resultado);
    }
    catch (err)
    {
        res.status(400).json({ sucesso: false, message: err.message });
    }
});

module.exports = router;