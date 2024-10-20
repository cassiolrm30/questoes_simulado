import { Router } from 'express'
import { getAll, getOneById, store, update, remove } from './book.controller'
import { bookSchemaPOST, bookSchemaPUT } from '../books/book.schema'
import { validateSchema } from '../../middleware/validateSchema'

const router = Router()

router.get('/', async (req, res) => 
{
    try
    {
        const result = await getAll();
        return res.json(result);
    }
    catch (error: any)
    {
        return res.status(401).json({ error: error.message });
    }
})

router.get('/:id', async (req, res) => 
{
    try
    {
        const result = await getOneById({ _id: req.params.id });
        return res.json(result);
    }
    catch (error: any)
    {
        return res.status(401).json({ error: error.message });
    }
})

router.post('/', validateSchema(bookSchemaPOST), async (req, res) => 
{
    try
    {
        const result = await store({ title: req.body.title, category: req.body.category });
        return res.json(result);
    }
    catch (error: any)
    {
        return res.status(401).json({ error: error.message });
    }
})

router.put('/:id', validateSchema(bookSchemaPUT), async (req, res) => 
{
    try
    {
        const result = await update({ _id: req.params.id, ...res.locals.validated });
        return res.json(result);
    }
    catch (error: any)
    {
        return res.status(401).json({ error: error.message });
    }
})

router.delete('/:id', async (req, res) => 
{
    try
    {
        const result = await remove({ _id: req.params.id });
        return res.json(result);
    }
    catch (error: any)
    {
        return res.status(401).json({ error: error.message });
    }
})

export default router