const express       = require('express');
const router        = express.Router();
const TipoSimulado  = require('../models/TipoSimulado');
const Questao       = require('../models/Questao');
const Simulacao     = require('../models/Simulacao');
const ItemSimulacao = require('../models/ItemSimulacao');

// GET
router.get('/', async (req, res) =>
{
    try
    {
        const simulacoesPorMesAno = await Simulacao.aggregate
        ([
            {
                $group:
                {
                    _id: { ano: { $year: "$data" }, mes: { $month: "$data" } },
                    quantidade: { $count: {} }
                }
            }
        ]);

        const qtdSimulacoesValidas = await Simulacao.aggregate
        ([
            { $match: { itensSimulacoes: { $exists: true, $ne: null } } },
            { $group: { _id: "$id", quantidade: { $sum: 1 } } },
            { $sort:  { _id: 1 } }
        ]);

        const questoesPorTipoSimulado = await Questao.aggregate
        ([
            { $match: { tipoSimulado: { $exists: true, $ne: null } } },
            { $group: { _id: "$tipoSimulado.descricao", quantidade: { $sum: 1 } } },
            { $sort:  { _id: 1 } }
        ]);

        const simulacoesPorTipoSimulado = await doSimulacaoPorTipoSimulacao();

        /*
        const resultado = await Questao.aggregate
                                ([
                                    {
                                        $lookup:
                                        {
                                            from: "tipos_simulados",
                                            localField: "TipoSimulado",
                                            foreignField: "_id",
                                            as: "tipoSimuladoDetalhes"
                                        }
                                    },
                                    { $unwind: "$tipoSimuladoDetalhes" }, // Garante que apenas valores válidos sejam usados
                                    { $group: { _id: "$tipoSimuladoDetalhes.descricao", quantidade: { $sum: 1 } } }
                                ]);

        const resultado1 = await TipoSimulado.aggregate
                                 ([
                                        {
                                            $group:
                                            {
                                                _id: null,
                                                qtd: { $sum: 1 },
                                                concatenacao: { $push: "$descricao" },
                                                maior: { $max: "$id" },
                                                menor: { $min: "$id" }
                                            }
                                        }
                                 ]);
        */

        res.json({ simulacoesPorMesAno, qtdSimulacoesValidas, questoesPorTipoSimulado, simulacoesPorTipoSimulado });
    }
    catch (err)
    {
        res.status(500).json({ message: err.message });
    }
});

async function doSimulacaoPorTipoSimulacao()
{
    let resultado = null;

    try
    {
        //const questoesBD = await ItemSimulacao.find(null, { id: 1 }).sort({ id: 1 });
        resultado = await ItemSimulacao.aggregate
        ([
            { $group: { _id: "$idQuestao", quantidade: { $sum: 1 } } },
            { $sort:  { _id: 1 } }
        ]);
    }
    catch (err)
    {

    }

    return (resultado);
}
    
module.exports = router;