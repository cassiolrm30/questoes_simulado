const mongoose = require('mongoose');

const SCHEMA = new mongoose.Schema
({
  nome: String,
  idade: Number,
  dataNascimento: Date,
  email: String
},
{ timestamps: true, versionKey: false });

module.exports = mongoose.model('usuarios', SCHEMA);