import mongoose from 'mongoose'

// configuração da nossa conexão com o mongoDB instalado em nossa máquina
mongoose.connect('mongodb://127.0.0.1:27017/local')

// exportação do mongoose já configurado para acessar nosso banco local
export default mongoose