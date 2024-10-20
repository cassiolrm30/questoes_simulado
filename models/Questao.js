const mongoose   = require("mongoose");

const SCHEMA = new mongoose.Schema
({
  //_id:          { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
  id:           { type: Number, required: true, unique: true },
  enunciado:    { type: String, required: true },
  tipoSimulado: { type: Object, required: true },
  gabarito:     { type: String, required: true },
  opcoesRespostas:    [{ type: Object, ref: 'Resposta' }]
},
{ timestamps: true, versionKey: false });

module.exports = mongoose.model("questoes", SCHEMA);