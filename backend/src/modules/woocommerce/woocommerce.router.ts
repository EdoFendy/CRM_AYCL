import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/auth.js';
import axios from 'axios';

export const woocommerceRouter = Router();

woocommerceRouter.use(requireAuth);

// Configurazione WooCommerce da variabili ambiente
const WC_URL = process.env.WC_URL || 'https://checkout.allyoucanleads.com';
const WC_KEY = process.env.WC_KEY || '';
const WC_SECRET = process.env.WC_SECRET || '';

// Client axios configurato per WooCommerce
const wooClient = axios.create({
  baseURL: `${WC_URL}/wp-json/wc/v3`,
  auth: {
    username: WC_KEY,
    password: WC_SECRET
  },
  timeout: 30000
});

// GET /woocommerce/products - Lista prodotti con ricerca
woocommerceRouter.get('/products', async (req, res) => {
  try {
    const search = req.query.search as string || '';
    const page = parseInt(req.query.page as string || '1');
    const perPage = parseInt(req.query.per_page as string || '50');
    
    const params: any = {
      page,
      per_page: perPage,
      orderby: 'date',
      order: 'desc'
    };
    
    if (search && search.length > 1) {
      params.search = search;
    }
    
    const response = await wooClient.get('/products', { params });
    
    res.json({ 
      data: response.data,
      total: parseInt(response.headers['x-wp-total'] || '0'),
      totalPages: parseInt(response.headers['x-wp-totalpages'] || '0')
    });
  } catch (error: any) {
    console.error('Errore WooCommerce products:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Errore recupero prodotti WooCommerce',
      details: error.response?.data || error.message
    });
  }
});

// GET /woocommerce/products/:id - Dettaglio prodotto
woocommerceRouter.get('/products/:id', async (req, res) => {
  try {
    const response = await wooClient.get(`/products/${req.params.id}`);
    res.json(response.data);
  } catch (error: any) {
    console.error('Errore WooCommerce product detail:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Errore recupero dettaglio prodotto',
      details: error.response?.data || error.message
    });
  }
});

// POST /woocommerce/products - Crea nuovo prodotto
woocommerceRouter.post('/products', async (req, res) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      price: z.string(),
      currency: z.string().optional(),
      sku: z.string().optional(),
      description: z.string().optional(),
      shortDescription: z.string().optional(),
      type: z.enum(['simple', 'variable', 'grouped', 'external']).default('simple'),
      status: z.enum(['draft', 'pending', 'private', 'publish']).default('publish'),
      virtual: z.boolean().default(true),
      downloadable: z.boolean().default(false)
    });
    
    const data = schema.parse(req.body);
    
    const productData: any = {
      name: data.name,
      type: data.type,
      regular_price: data.price,
      status: data.status,
      virtual: data.virtual,
      downloadable: data.downloadable
    };
    
    if (data.sku) productData.sku = data.sku;
    if (data.description) productData.description = data.description;
    if (data.shortDescription) productData.short_description = data.shortDescription;
    
    const response = await wooClient.post('/products', productData);
    
    res.status(201).json({ 
      success: true, 
      product: response.data 
    });
  } catch (error: any) {
    console.error('Errore creazione prodotto WooCommerce:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Errore creazione prodotto',
      details: error.response?.data || error.message
    });
  }
});

// PUT /woocommerce/products/:id - Aggiorna prodotto
woocommerceRouter.put('/products/:id', async (req, res) => {
  try {
    const response = await wooClient.put(`/products/${req.params.id}`, req.body);
    res.json({ success: true, product: response.data });
  } catch (error: any) {
    console.error('Errore aggiornamento prodotto WooCommerce:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Errore aggiornamento prodotto',
      details: error.response?.data || error.message
    });
  }
});

// DELETE /woocommerce/products/:id - Elimina prodotto
woocommerceRouter.delete('/products/:id', async (req, res) => {
  try {
    const response = await wooClient.delete(`/products/${req.params.id}`, {
      params: { force: true }
    });
    res.json({ success: true, product: response.data });
  } catch (error: any) {
    console.error('Errore eliminazione prodotto WooCommerce:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Errore eliminazione prodotto',
      details: error.response?.data || error.message
    });
  }
});

// GET /woocommerce/orders - Lista ordini
woocommerceRouter.get('/orders', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string || '1');
    const perPage = parseInt(req.query.per_page as string || '50');
    const status = req.query.status as string;
    
    const params: any = {
      page,
      per_page: perPage,
      orderby: 'date',
      order: 'desc'
    };
    
    if (status) params.status = status;
    
    const response = await wooClient.get('/orders', { params });
    
    res.json({ 
      data: response.data,
      total: parseInt(response.headers['x-wp-total'] || '0'),
      totalPages: parseInt(response.headers['x-wp-totalpages'] || '0')
    });
  } catch (error: any) {
    console.error('Errore WooCommerce orders:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Errore recupero ordini',
      details: error.response?.data || error.message
    });
  }
});

