import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../middlewares/auth.js';
import {
  createProposal,
  getProposal,
  listProposals,
  updateProposalStatus,
  updateProposalPDF,
  incrementProposalViews,
  type ProposalInput
} from './proposals.service.js';

export const proposalsRouter = Router();

// Tutte le route richiedono autenticazione
proposalsRouter.use(requireAuth);

// GET /proposals - Lista proposte
proposalsRouter.get('/', async (req, res) => {
  try {
    const filters: any = {};

    // Se non admin, mostra solo le proprie proposte
    if (req.user!.role !== 'admin') {
      filters.created_by = req.user!.id;
    }

    if (req.query.status) filters.status = req.query.status;
    if (req.query.customer_type) filters.customer_type = req.query.customer_type;
    if (req.query.customer_id) filters.customer_id = req.query.customer_id;
    if (req.query.limit) filters.limit = parseInt(req.query.limit as string);
    if (req.query.offset) filters.offset = parseInt(req.query.offset as string);

    const proposals = await listProposals(filters);
    res.json({ data: proposals });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /proposals/:id - Dettaglio proposta
proposalsRouter.get('/:id', async (req, res) => {
  try {
    const proposal = await getProposal(req.params.id);

    // Verifica permessi
    if (req.user!.role !== 'admin' && proposal.created_by !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json(proposal);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

// POST /proposals/generate - Genera proposta con PDF
proposalsRouter.post('/generate', async (req, res) => {
  try {
    const schema = z.object({
      customer_type: z.enum(['contact', 'company']),
      customer_id: z.string().uuid(),
      services: z.array(z.object({
        name: z.string().min(1),
        description: z.string().min(1),
        price: z.number().min(0)
      })).min(1),
      title: z.string().optional(),
      introduction: z.string().optional(),
      notes: z.string().optional(),
      terms: z.string().optional(),
      valid_until: z.string().optional(),
      template_id: z.string().uuid().optional(),
      send_email: z.boolean().optional()
    });

    const data = schema.parse(req.body);

    // Crea proposta
    const proposal = await createProposal(data as ProposalInput, req.user!.id);

    // Genera PDF se template specificato
    if (data.template_id) {
      try {
        const pdfService = new PDFTemplatesService();
        
        // Prepara dati per PDF
        const pdfData: any = {
          proposal_number: proposal.number,
          proposal_date: proposal.date,
          customer_name: proposal.customer_data.name,
          customer_email: proposal.customer_data.email,
          customer_phone: proposal.customer_data.phone,
          customer_address: proposal.customer_data.address,
          customer_vat: proposal.customer_data.vat,
          title: proposal.title,
          introduction: proposal.introduction,
          notes: proposal.notes,
          terms: proposal.terms,
          valid_until: proposal.valid_until,
          total: proposal.total,
          currency: proposal.currency
        };

        // Aggiungi servizi
        proposal.services.forEach((service: any, index: number) => {
          pdfData[`service_${index + 1}_name`] = service.name;
          pdfData[`service_${index + 1}_description`] = service.description;
          pdfData[`service_${index + 1}_price`] = service.price;
        });

        // Genera PDF
        const pdfBuffer = await pdfService.generatePDF(data.template_id, pdfData);
        
        // In produzione, salvare su storage (S3, etc.)
        // Per ora, generiamo URL placeholder
        const pdfUrl = `/api/proposals/${proposal.id}/pdf`;
        
        // Aggiorna proposta con URL PDF
        await updateProposalPDF(proposal.id, pdfUrl);
        proposal.pdf_url = pdfUrl;

        // Invia email se richiesto
        if (data.send_email && proposal.customer_data.email) {
          await sendEmail({
            to: proposal.customer_data.email,
            subject: `Proposta Commerciale ${proposal.number}`,
            html: `
              <h2>Gentile ${proposal.customer_data.name},</h2>
              <p>Le inviamo la nostra proposta commerciale in allegato.</p>
              ${proposal.introduction ? `<p>${proposal.introduction}</p>` : ''}
              <p>La proposta è valida fino al ${new Date(proposal.valid_until).toLocaleDateString('it-IT')}.</p>
              <p>Restiamo a disposizione per qualsiasi chiarimento.</p>
              <p>Cordiali saluti,<br>${req.user!.first_name} ${req.user!.last_name}</p>
            `,
            attachments: [
              {
                filename: `Proposta_${proposal.number}.pdf`,
                content: pdfBuffer
              }
            ]
          });

          // Aggiorna status a "sent"
          await updateProposalStatus(proposal.id, 'sent', req.user!.id);
          proposal.status = 'sent';
        }
      } catch (pdfError: any) {
        console.error('PDF generation error:', pdfError);
        // Continua comunque, proposta creata
      }
    }

    res.status(201).json(proposal);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// PATCH /proposals/:id/status - Aggiorna status
proposalsRouter.patch('/:id/status', async (req, res) => {
  try {
    const schema = z.object({
      status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired'])
    });

    const data = schema.parse(req.body);
    const proposal = await getProposal(req.params.id);

    // Verifica permessi
    if (req.user!.role !== 'admin' && proposal.created_by !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updated = await updateProposalStatus(req.params.id, data.status, req.user!.id);
    res.json(updated);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /proposals/:id/send - Invia proposta via email
proposalsRouter.post('/:id/send', async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email().optional(),
      message: z.string().optional()
    });

    const data = schema.parse(req.body);
    const proposal = await getProposal(req.params.id);

    // Verifica permessi
    if (req.user!.role !== 'admin' && proposal.created_by !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const recipientEmail = data.email || proposal.customer_data.email;
    if (!recipientEmail) {
      return res.status(400).json({ error: 'No email address available' });
    }

    // Invia email
    await sendEmail({
      to: recipientEmail,
      subject: `Proposta Commerciale ${proposal.number}`,
      html: `
        <h2>Gentile ${proposal.customer_data.name},</h2>
        <p>Le inviamo la nostra proposta commerciale.</p>
        ${data.message ? `<p>${data.message}</p>` : ''}
        ${proposal.introduction ? `<p>${proposal.introduction}</p>` : ''}
        <p>La proposta è valida fino al ${new Date(proposal.valid_until).toLocaleDateString('it-IT')}.</p>
        <p>Cordiali saluti,<br>${req.user!.first_name} ${req.user!.last_name}</p>
      `
    });

    // Aggiorna status
    if (proposal.status === 'draft') {
      await updateProposalStatus(proposal.id, 'sent', req.user!.id);
    }

    res.json({ success: true, message: 'Email sent successfully' });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// GET /proposals/:id/view - Traccia visualizzazione (pubblico)
proposalsRouter.get('/:id/view', async (req, res) => {
  try {
    await incrementProposalViews(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /proposals/:id/pdf - Download PDF
proposalsRouter.get('/:id/pdf', async (req, res) => {
  try {
    const proposal = await getProposal(req.params.id);

    // Verifica permessi
    if (req.user!.role !== 'admin' && proposal.created_by !== req.user!.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!proposal.pdf_url) {
      return res.status(404).json({ error: 'PDF not generated' });
    }

    // In produzione, redirect a storage URL o stream file
    res.json({ pdf_url: proposal.pdf_url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


