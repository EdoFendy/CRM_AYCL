import { Application, Router } from 'express';
import { authRouter } from '../modules/auth/auth.router.js';
import { usersRouter } from '../modules/users/users.router.js';
import { teamsRouter } from '../modules/teams/teams.router.js';
import { companiesRouter } from '../modules/companies/companies.router.js';
import { contactsRouter } from '../modules/contacts/contacts.router.js';
import { opportunitiesRouter } from '../modules/opportunities/opportunities.router.js';
import { activitiesRouter } from '../modules/activities/activities.router.js';
import { tasksRouter } from '../modules/tasks/tasks.router.js';
import { offersRouter } from '../modules/offers/offers.router.js';
import { contractsRouter } from '../modules/contracts/contracts.router.js';
import { signaturesRouter } from '../modules/signatures/signatures.router.js';
import { docTemplatesRouter } from '../modules/docTemplates/docTemplates.router.js';
import { docsRouter } from '../modules/docs/docs.router.js';
import { filesRouter } from '../modules/files/files.router.js';
import { paymentsRouter } from '../modules/payments/payments.router.js';
import { invoicesRouter } from '../modules/invoices/invoices.router.js';
import { receiptsRouter } from '../modules/receipts/receipts.router.js';
import { referralsRouter } from '../modules/referrals/referrals.router.js';
import { checkoutsRouter } from '../modules/checkouts/checkouts.router.js';
import { ticketsRouter } from '../modules/tickets/tickets.router.js';
import { reportsRouter } from '../modules/reports/reports.router.js';
import { notificationsRouter } from '../modules/notifications/notifications.router.js';
import { webhooksRouter } from '../modules/webhooks/webhooks.router.js';
import { publicContractsRouter } from '../modules/publicContracts/publicContracts.router.js';
import { publicPaymentsRouter } from '../modules/publicPayments/publicPayments.router.js';
import { docPackFilesRouter } from '../modules/docPackFiles/docPackFiles.router.js';
import { woocommerceRouter } from '../modules/woocommerce/woocommerce.router.js';
import { quotesRouter } from '../modules/quotes/quotes.router.js';
import { vatValidationRouter } from '../modules/vatValidation/vatValidation.router.js';

export function registerRoutes(app: Application) {
  const router = Router();

  router.get('/healthz', (_req, res) => {
    res.json({ status: 'ok' });
  });

  router.use('/auth', authRouter);
  router.use('/users', usersRouter);
  router.use('/teams', teamsRouter);
  router.use('/companies', companiesRouter);
  router.use('/contacts', contactsRouter);
  router.use('/opportunities', opportunitiesRouter);
  router.use('/activities', activitiesRouter);
  router.use('/tasks', tasksRouter);
  router.use('/offers', offersRouter);
  router.use('/contracts', contractsRouter);
  router.use('/signatures', signaturesRouter);
  router.use('/doc-templates', docTemplatesRouter);
  router.use('/docs', docsRouter);
  router.use('/doc-files', docPackFilesRouter);
  router.use('/files', filesRouter);
  router.use('/payments', paymentsRouter);
  router.use('/quotes', quotesRouter);
  router.use('/invoices', invoicesRouter);
  router.use('/receipts', receiptsRouter);
  router.use('/referrals', referralsRouter);
  router.use('/checkouts', checkoutsRouter);
  router.use('/tickets', ticketsRouter);
  router.use('/reports', reportsRouter);
  router.use('/notifications', notificationsRouter);
  router.use('/webhooks', webhooksRouter);
  router.use('/woocommerce', woocommerceRouter);
  router.use('/vat-validation', vatValidationRouter);
  router.use('/public/contracts', publicContractsRouter);
  router.use('/public/payments', publicPaymentsRouter);
  router.use('/public/sign', signaturesRouter);

  app.use('/', router);
}
