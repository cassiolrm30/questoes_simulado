const mongoose = require("mongoose");

const SCHEMA = new mongoose.Schema
({
  idQuestao: { type: mongoose.Schema.Types.ObjectId, ref: 'Questao' },
  opcao: String,
  descricao: String
},
{ timestamps: true, versionKey: false });

module.exports = mongoose.model("opcoes_respostas", SCHEMA);