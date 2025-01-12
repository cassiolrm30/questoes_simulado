const mongoose   = require("mongoose");

const SCHEMA = new mongoose.Schema
({
  id:             { type: Number, required: true, unique: true },
  idQuestao:      { type: Number, required: true, unique: true },
  opcaoCorreta:   { type: String, required: true },
  opcaoEscolhida: { type: String, required: true }
},

{ timestamps: true, versionKey: false });

module.exports = mongoose.model("itens_simulacoes", SCHEMA);