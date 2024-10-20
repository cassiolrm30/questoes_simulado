// importação do mongoose já configurado para acessar nosso banco local
import mongoose from '../../config/database'

const BookSchema = new mongoose.Schema
({
    _id: mongoose.Types.ObjectId,
    title: String,
    category: String
},
{
    timestamps: true,
    versionKey: false
})

// exportação sem o DEFAULT para que possamos importar o modelo com o nome exato que foi criado
export const bookModel = mongoose.model('livros', BookSchema)