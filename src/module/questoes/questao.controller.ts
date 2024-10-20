// importação do modelo de usuário
import { bookModel } from './book.model'

// a linha abaixo traz apenas Types de mongoose para este arquivo pois precisamos apenas do Types.ObjectId
import { Types } from 'mongoose'

interface UserGetOneByIdParams { _id: string }

interface UserStoreParams 
{
    title: string
    category: string
}

interface UserRemoveParams { _id: string }

interface UserUpdateParams
{
    _id: string
    title: string
    category: string
}

// método para trazer todos os registros
export const getAll = async () => 
{
    return await bookModel.find().exec()
}

// método para trazer apenas um registro filtrado por ID
export const getOneById = async ({ _id }: UserGetOneByIdParams) =>
{
    return await bookModel.findOne({ _id }).exec()
}

export const store = async ({ title, category }: UserStoreParams) =>
{
    return await bookModel.create ({ _id: new Types.ObjectId, title, category })
}

export const remove = async ({ _id }: UserRemoveParams) => 
{
    return await bookModel.deleteOne({ _id })
}

export const update = async ({ _id, title, category }: UserUpdateParams) => 
{
     return await bookModel.updateOne({ _id }, { title, category })
}

export default { getAll, getOneById, store, remove, update }