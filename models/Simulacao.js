const mongoose   = require("mongoose");

const SCHEMA = new mongoose.Schema
({
  id:              { type: Number, required: true, unique: true },
  data:            { type: Date, required: true },
  itensSimulacoes: [{ type: Object, ref: 'ItemSimulacao' }]
},
{ timestamps: true, versionKey: false });

module.exports = mongoose.model("simulacoes", SCHEMA);