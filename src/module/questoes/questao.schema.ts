import { boolean, z } from 'zod'

export const bookSchemaPOST = z.object
({
    title: z.string({ required_error: 'O título é obrigatório' })
           .min(5, {  message: 'O mínimo para o campo título são 5 caracteres' }),
    category: z.string({ required_error: 'A categoria é obrigatória' })
           .min(5, {  message: 'O mínimo para o campo categoria são 5 caracteres' })
})

export const bookSchemaPUT = z.object
({
    title: z.string({ required_error: 'O título é obrigatório' })
           .min(5, {  message: 'O mínimo para o campo título são 5 caracteres' }).optional(),
    category: z.string({ required_error: 'A categoria é obrigatória' })
           .min(5, {  message: 'O mínimo para o campo categoria são 5 caracteres' }).optional()
})