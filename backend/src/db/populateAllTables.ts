#!/usr/bin/env tsx
/**
 * Script per popolare TUTTE le tabelle del database con dati realistici
 */

import { pool } from './pool.js';

async function main() {
  console.log('🚀 Popolamento completo di tutte le tabelle...\n');

  try {
    // Get opportunities and companies for foreign keys
    const { rows: opportunities } = await pool.query('SELECT id, company_id, owner_id, title FROM opportunities LIMIT 10');
    const { rows: companies } = await pool.query('SELECT id FROM companies LIMIT 10');
    const { rows: users } = await pool.query('SELECT id FROM users WHERE role = $1 LIMIT 5', ['admin']);
    const { rows: tickets } = await pool.query('SELECT id FROM tickets LIMIT 5');
    const adminId = users[0]?.id || '00000000-0000-0000-0000-000000000001';

    // 1. OFFERS
    console.log('📝 Popolamento offers...');
    if (opportunities.length > 0) {
      for (let i = 0; i < Math.min(5, opportunities.length); i++) {
        const opp = opportunities[i];
        await pool.query(`
          INSERT INTO offers (opportunity_id, version, items, total, currency, status, created_at, updated_at)
          VALUES ($1, 1, $2, $3, 'EUR', $4, NOW() - INTERVAL '${10 + i * 5} days', NOW() - INTERVAL '${5 + i * 2} days')
          ON CONFLICT DO NOTHING
        `, [
          opp.id,
          JSON.stringify([{
            name: `Lead Package - ${opp.title?.substring(0, 30) || 'Custom'}`,
            quantity: 1,
            unit_price: 10000 + i * 5000,
            description: 'Qualified leads database with verified contacts'
          }]),
          10000 + i * 5000,
          i % 3 === 0 ? 'sent' : i % 3 === 1 ? 'accepted' : 'declined'
        ]);
      }
      console.log(`✅ ${Math.min(5, opportunities.length)} offers inserite`);
    }

    // 2. CONTRACTS
    console.log('\n📝 Popolamento contracts...');
    const { rows: acceptedOffers } = await pool.query(`
      SELECT id, opportunity_id FROM offers WHERE status = 'accepted' LIMIT 3
    `);
    for (const offer of acceptedOffers) {
      const { rows: oppData } = await pool.query('SELECT company_id FROM opportunities WHERE id = $1', [offer.opportunity_id]);
      if (oppData.length > 0) {
        await pool.query(`
          INSERT INTO contracts (company_id, opportunity_id, offer_id, status, signed_at, external_reference, created_at, updated_at)
          VALUES ($1, $2, $3, 'signed', NOW() - INTERVAL '30 days', $4, NOW() - INTERVAL '35 days', NOW() - INTERVAL '30 days')
          ON CONFLICT DO NOTHING
          RETURNING id
        `, [oppData[0].company_id, offer.opportunity_id, offer.id, `AYCL-2025-${Math.floor(Math.random() * 1000)}`]);
      }
    }
    console.log(`✅ ${acceptedOffers.length} contracts inseriti`);

    // 3. CONTRACT_VERSIONS
    console.log('\n📝 Popolamento contract_versions...');
    const { rows: contracts } = await pool.query('SELECT id FROM contracts LIMIT 5');
    for (let i = 0; i < contracts.length; i++) {
      await pool.query(`
        INSERT INTO contract_versions (contract_id, data, pdf_url, checksum, created_at)
        VALUES ($1, $2, $3, $4, NOW() - INTERVAL '${35 - i * 5} days')
        ON CONFLICT DO NOTHING
      `, [
        contracts[i].id,
        JSON.stringify({ version: 1, terms: 'Standard contract terms', amount: 15000 + i * 5000 }),
        `/contracts/${contracts[i].id}/v1.pdf`,
        `sha256_${Math.random().toString(36).substring(2)}`
      ]);
      
      // Some contracts have v2
      if (i % 2 === 0) {
        await pool.query(`
          INSERT INTO contract_versions (contract_id, data, pdf_url, checksum, created_at)
          VALUES ($1, $2, $3, $4, NOW() - INTERVAL '${30 - i * 5} days')
          ON CONFLICT DO NOTHING
        `, [
          contracts[i].id,
          JSON.stringify({ version: 2, terms: 'Updated terms with discount', amount: 14000 + i * 5000 }),
          `/contracts/${contracts[i].id}/v2.pdf`,
          `sha256_${Math.random().toString(36).substring(2)}`
        ]);
      }
    }
    console.log('✅ Contract versions inserite');

    // 4. SIGNATURES
    console.log('\n📝 Popolamento signatures...');
    for (const contract of contracts) {
      await pool.query(`
        INSERT INTO signatures (contract_id, signer_name, signer_email, method, status, signed_at, ip, created_at, updated_at)
        VALUES ($1, $2, $3, $4, 'completed', NOW() - INTERVAL '30 days', '185.25.113.45', NOW() - INTERVAL '35 days', NOW() - INTERVAL '30 days')
        ON CONFLICT DO NOTHING
      `, [contract.id, 'Decision Maker', 'signer@company.com', Math.random() > 0.5 ? 'otp' : 'sms']);
    }
    console.log(`✅ ${contracts.length} signatures inserite`);

    // 5. INVOICES
    console.log('\n📝 Popolamento invoices...');
    for (let i = 0; i < contracts.length; i++) {
      await pool.query(`
        INSERT INTO invoices (contract_id, number, status, provider, amount, currency, issued_at, due_date, pdf_url, created_at, updated_at)
        VALUES ($1, $2, $3, 'internal', $4, 'EUR', NOW() - INTERVAL '28 days', NOW() + INTERVAL '32 days', $5, NOW() - INTERVAL '30 days', NOW() - INTERVAL '28 days')
        ON CONFLICT DO NOTHING
      `, [
        contracts[i].id,
        `FT-2025-${1000 + i}`,
        i % 3 === 0 ? 'paid' : i % 3 === 1 ? 'sent' : 'draft',
        15000 + i * 5000,
        `/invoices/FT-2025-${1000 + i}.pdf`
      ]);
    }
    console.log(`✅ ${contracts.length} invoices inserite`);

    // 6. PAYMENTS
    console.log('\n📝 Popolamento payments...');
    const { rows: paidInvoices } = await pool.query(`
      SELECT id, contract_id, amount FROM invoices WHERE status = 'paid' LIMIT 5
    `);
    for (const invoice of paidInvoices) {
      await pool.query(`
        INSERT INTO payments (invoice_id, contract_id, status, provider, amount, currency, external_id, received_at, created_at)
        VALUES ($1, $2, 'succeeded', 'bank_transfer', $3, 'EUR', $4, NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days')
        ON CONFLICT DO NOTHING
      `, [invoice.id, invoice.contract_id, invoice.amount, `BT-2025-${Math.floor(Math.random() * 10000)}`]);
    }
    console.log(`✅ ${paidInvoices.length} payments inseriti`);

    // 7. RECEIPTS
    console.log('\n📝 Popolamento receipts...');
    for (const invoice of paidInvoices) {
      await pool.query(`
        INSERT INTO receipts (invoice_id, status, provider, amount, currency, issued_at, pdf_url, created_at)
        VALUES ($1, 'issued', 'internal', $2, 'EUR', NOW() - INTERVAL '25 days', $3, NOW() - INTERVAL '25 days')
        ON CONFLICT DO NOTHING
      `, [invoice.id, invoice.amount, `/receipts/RC-${invoice.id}.pdf`]);
    }
    console.log(`✅ ${paidInvoices.length} receipts inserite`);

    // 8. CHECKOUTS
    console.log('\n📝 Popolamento checkouts...');
    for (let i = 0; i < Math.min(3, opportunities.length); i++) {
      await pool.query(`
        INSERT INTO checkouts (session, opportunity_id, status, metadata, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW() - INTERVAL '${40 + i * 10} days', NOW() - INTERVAL '${35 + i * 10} days')
        ON CONFLICT DO NOTHING
      `, [
        `cs_session_${Math.random().toString(36).substring(7)}`,
        opportunities[i].id,
        i % 2 === 0 ? 'completed' : 'pending',
        JSON.stringify({ payment_method: 'bank_transfer', amount: 15000 + i * 5000 })
      ]);
    }
    console.log('✅ Checkouts inseriti');

    // 9. FILES
    console.log('\n📝 Popolamento files...');
    for (let i = 0; i < Math.min(8, opportunities.length); i++) {
      const opp = opportunities[i];
      const fileTypes = [
        { name: `Proposal-${opp.title?.substring(0, 20) || 'Doc'}.pdf`, mime: 'application/pdf', size: 524288, tags: ['proposal'] },
        { name: `Contract-Draft.pdf`, mime: 'application/pdf', size: 786432, tags: ['contract', 'draft'] },
        { name: `Leads-Sample.xlsx`, mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 102400, tags: ['sample', 'leads'] },
      ];
      
      const file = fileTypes[i % fileTypes.length];
      await pool.query(`
        INSERT INTO files (name, mime, size, storage_url, tags, company_id, opportunity_id, created_by, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() - INTERVAL '${20 + i * 5} days')
        ON CONFLICT DO NOTHING
      `, [
        file.name,
        file.mime,
        file.size,
        `/files/${opp.id}/${file.name}`,
        file.tags,
        opp.company_id,
        opp.id,
        opp.owner_id
      ]);
    }
    console.log('✅ Files inseriti');

    // 10. REPORTS
    console.log('\n📝 Popolamento reports...');
    const reportScopes = [
      { scope: 'sales', filters: { period: 'Q4-2024', team: 'all' } },
      { scope: 'pipeline', filters: { stage: 'all', owner: 'all' } },
      { scope: 'revenue', filters: { period: 'last_30_days' } },
      { scope: 'activities', filters: { type: 'all', period: 'last_week' } },
    ];
    for (let i = 0; i < reportScopes.length; i++) {
      await pool.query(`
        INSERT INTO reports (scope, filters, status, file_url, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '${30 + i * 10} days', NOW() - INTERVAL '${30 + i * 10} days')
        ON CONFLICT DO NOTHING
      `, [
        reportScopes[i].scope,
        JSON.stringify(reportScopes[i].filters),
        i % 2 === 0 ? 'completed' : 'pending',
        `/reports/${reportScopes[i].scope}-${Date.now()}.pdf`,
        adminId
      ]);
    }
    console.log('✅ Reports inseriti');

    // 11. NOTIFICATIONS
    console.log('\n📝 Popolamento notifications...');
    const notifTypes = [
      { type: 'opportunity_won', payload: { value: 15000, company: 'TechFlow SaaS' } },
      { type: 'contract_signed', payload: { contract_id: contracts[0]?.id } },
      { type: 'task_overdue', payload: { task_id: 'task-123' } },
      { type: 'payment_received', payload: { amount: 15000 } },
      { type: 'ticket_created', payload: { ticket_id: tickets[0]?.id } },
    ];
    
    for (let i = 0; i < notifTypes.length; i++) {
      await pool.query(`
        INSERT INTO notifications (user_id, type, payload, read_at, created_at)
        VALUES ($1, $2, $3, $4, NOW() - INTERVAL '${i * 2} days')
        ON CONFLICT DO NOTHING
      `, [adminId, notifTypes[i].type, JSON.stringify(notifTypes[i].payload), i % 2 === 0 ? new Date(Date.now() - i * 24 * 60 * 60 * 1000) : null]);
    }
    console.log('✅ Notifications inserite');

    // 12. TICKET_MESSAGES
    console.log('\n📝 Popolamento ticket_messages...');
    for (const ticket of tickets) {
      // Initial message
      await pool.query(`
        INSERT INTO ticket_messages (ticket_id, sender_id, body, created_at)
        VALUES ($1, $2, $3, NOW() - INTERVAL '5 days')
        ON CONFLICT DO NOTHING
      `, [ticket.id, adminId, 'Grazie per la segnalazione. Stiamo verificando il problema.']);
      
      // Follow-up
      await pool.query(`
        INSERT INTO ticket_messages (ticket_id, sender_id, body, created_at)
        VALUES ($1, $2, $3, NOW() - INTERVAL '3 days')
        ON CONFLICT DO NOTHING
      `, [ticket.id, adminId, 'Abbiamo risolto il problema. Puoi confermare che tutto funziona correttamente?']);
    }
    console.log(`✅ ${tickets.length * 2} ticket messages inseriti`);

    // 13. WEBHOOKS
    console.log('\n📝 Popolamento webhooks...');
    const webhookConfigs = [
      { name: 'CRM Integration', url: 'https://app.example.com/webhooks/crm', event: 'opportunity.won' },
      { name: 'Lead Automation', url: 'https://automation.example.com/api/webhooks/leads', event: 'contract.signed' },
      { name: 'Analytics Events', url: 'https://analytics.example.com/webhooks/events', event: 'payment.received' },
    ];
    
    for (let i = 0; i < webhookConfigs.length; i++) {
      await pool.query(`
        INSERT INTO webhooks (name, url, event, status, secret, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, 'active', $4, $5, NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days')
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [
        webhookConfigs[i].name,
        webhookConfigs[i].url,
        webhookConfigs[i].event,
        `whsec_${Math.random().toString(36).substring(2, 15)}`,
        adminId
      ]);
    }
    console.log('✅ Webhooks inseriti');

    // 14. WEBHOOK_EVENTS
    console.log('\n📝 Popolamento webhook_events...');
    const { rows: webhooks } = await pool.query('SELECT id FROM webhooks LIMIT 5');
    for (const webhook of webhooks) {
      for (let i = 0; i < 3; i++) {
        await pool.query(`
          INSERT INTO webhook_events (webhook_id, event, payload, delivery_status, response_status, attempts, last_attempt_at, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '${i * 2} days', NOW() - INTERVAL '${i * 2} days')
          ON CONFLICT DO NOTHING
        `, [
          webhook.id,
          ['opportunity.won', 'contract.signed', 'payment.received'][i % 3],
          JSON.stringify({ id: `evt_${i}`, data: { value: 15000 } }),
          i % 3 === 0 ? 'delivered' : i % 3 === 1 ? 'pending' : 'failed',
          i % 3 === 0 ? 200 : null,
          i % 3 === 2 ? 3 : 1
        ]);
      }
    }
    console.log('✅ Webhook events inseriti');

    // 15. WEBHOOK_INBOUND_LOGS
    console.log('\n📝 Popolamento webhook_inbound_logs...');
    const providers = ['stripe', 'zapier', 'linkedin', 'google_ads', 'facebook'];
    const events = ['payment.received', 'lead.created', 'form.submitted', 'ad.clicked', 'campaign.completed'];
    for (let i = 0; i < 5; i++) {
      await pool.query(`
        INSERT INTO webhook_inbound_logs (provider, event, payload, received_at)
        VALUES ($1, $2, $3, NOW() - INTERVAL '${i * 3} days')
        ON CONFLICT DO NOTHING
      `, [
        providers[i],
        events[i],
        JSON.stringify({ source: providers[i], event: events[i], data: { id: `item_${i}`, value: 1000 + i * 500 } })
      ]);
    }
    console.log('✅ Webhook inbound logs inseriti');

    // 16. DOCS_RENDER_HISTORY
    console.log('\n📝 Popolamento docs_render_history...');
    const { rows: docTemplates } = await pool.query('SELECT id FROM doc_templates LIMIT 5');
    for (const template of docTemplates) {
      for (let i = 0; i < 2; i++) {
        await pool.query(`
          INSERT INTO docs_render_history (template_id, data, pdf_url, created_by, created_at)
          VALUES ($1, $2, $3, $4, NOW() - INTERVAL '${10 + i * 5} days')
          ON CONFLICT DO NOTHING
        `, [
          template.id,
          JSON.stringify({ company: 'Example Corp', value: 15000, rendered_at: new Date().toISOString() }),
          `/docs/rendered/${template.id}_${Date.now()}.pdf`,
          adminId
        ]);
      }
    }
    console.log('✅ Docs render history inserito');

    // 17. AUDIT_LOG
    console.log('\n📝 Popolamento audit_log...');
    const auditActions = [
      { entity: 'opportunity', action: 'update', entity_id: opportunities[0]?.id, before_state: { stage: 'proposal' }, after_state: { stage: 'negotiation' } },
      { entity: 'contract', action: 'create', entity_id: contracts[0]?.id, before_state: null, after_state: { status: 'draft' } },
      { entity: 'user', action: 'update', entity_id: adminId, before_state: { role: 'seller' }, after_state: { role: 'admin' } },
      { entity: 'company', action: 'create', entity_id: companies[0]?.id, before_state: null, after_state: { name: 'Example Corp' } },
      { entity: 'payment', action: 'create', entity_id: paidInvoices[0]?.id, before_state: null, after_state: { status: 'succeeded' } },
    ];
    
    for (let i = 0; i < auditActions.length; i++) {
      const action = auditActions[i];
      await pool.query(`
        INSERT INTO audit_log (actor_id, entity, entity_id, action, before_state, after_state, metadata, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() - INTERVAL '${i * 10} days')
        ON CONFLICT DO NOTHING
      `, [
        adminId,
        action.entity,
        action.entity_id,
        action.action,
        action.before_state ? JSON.stringify(action.before_state) : null,
        JSON.stringify(action.after_state),
        JSON.stringify({ ip: '185.25.113.45', user_agent: 'Mozilla/5.0' })
      ]);
    }
    console.log('✅ Audit log inserito');

    // Final count
    console.log('\n📊 Conteggio finale tabelle:');
    const { rows: finalCounts } = await pool.query(`
      SELECT 'offers' as table_name, COUNT(*)::text as rows FROM offers
      UNION ALL SELECT 'contracts', COUNT(*)::text FROM contracts
      UNION ALL SELECT 'contract_versions', COUNT(*)::text FROM contract_versions
      UNION ALL SELECT 'signatures', COUNT(*)::text FROM signatures
      UNION ALL SELECT 'invoices', COUNT(*)::text FROM invoices
      UNION ALL SELECT 'payments', COUNT(*)::text FROM payments
      UNION ALL SELECT 'receipts', COUNT(*)::text FROM receipts
      UNION ALL SELECT 'checkouts', COUNT(*)::text FROM checkouts
      UNION ALL SELECT 'files', COUNT(*)::text FROM files
      UNION ALL SELECT 'reports', COUNT(*)::text FROM reports
      UNION ALL SELECT 'notifications', COUNT(*)::text FROM notifications
      UNION ALL SELECT 'ticket_messages', COUNT(*)::text FROM ticket_messages
      UNION ALL SELECT 'webhooks', COUNT(*)::text FROM webhooks
      UNION ALL SELECT 'webhook_events', COUNT(*)::text FROM webhook_events
      UNION ALL SELECT 'webhook_inbound_logs', COUNT(*)::text FROM webhook_inbound_logs
      UNION ALL SELECT 'docs_render_history', COUNT(*)::text FROM docs_render_history
      UNION ALL SELECT 'audit_log', COUNT(*)::text FROM audit_log
      ORDER BY table_name
    `);
    
    finalCounts.forEach(row => {
      console.log(`  ${row.table_name.padEnd(25)} → ${row.rows} rows`);
    });

    console.log('\n✅ POPOLAMENTO COMPLETATO!\n');

  } catch (error) {
    console.error('❌ Errore:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

