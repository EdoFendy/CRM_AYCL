#!/usr/bin/env tsx
/**
 * Script per popolare il database con dati realistici
 * per un'azienda di lead generation (AYCL)
 * 
 * Esegui con: npx tsx src/db/populateData.ts
 */

import { pool } from './pool.js';

async function main() {
  console.log('🚀 Inizio popolamento database con dati realistici...\n');

  try {
    // Recupera le companies già inserite
    const { rows: allCompanies } = await pool.query('SELECT id, ragione_sociale FROM companies ORDER BY created_at');
    const { rows: contacts } = await pool.query('SELECT id, company_id, first_name, last_name FROM contacts');
    const { rows: users } = await pool.query('SELECT id, email FROM users WHERE role = $1', ['seller']);
    const sellerId = users[0]?.id || '00000000-0000-0000-0000-000000000002';

    // Mappa companies per nome
    const companyMap: Record<string, string> = {};
    allCompanies.forEach(c => {
      companyMap[c.ragione_sociale] = c.id;
    });

    const companies = [
      companyMap['TechFlow SaaS srl'],
      companyMap['Digital Boost Agency'],
      companyMap['Prime Properties Group'],
      companyMap['ShopItaly Commerce srl'],
      companyMap['Business Growth Consultants'],
      companyMap['FinTech Innovations SpA'],
      companyMap['HealthCare Solutions'],
      companyMap['EduTech Academy'],
    ].filter(Boolean);

    console.log(`✅ Trovate ${allCompanies.length} companies totali, ${companies.length} per demo`);
    console.log(`✅ Trovati ${contacts.length} contacts`);
    console.log(`✅ Seller ID: ${sellerId}\n`);

    // 1. REFERRALS
    console.log('📝 Inserimento referrals...');
    const referrals = await pool.query(`
      INSERT INTO referrals (code, owner_user_id, created_at, updated_at)
      VALUES 
        ('PARTNER-TECHFLOW', $1, NOW() - INTERVAL '100 days', NOW() - INTERVAL '100 days'),
        ('LINKEDIN-ADS-Q4', $1, NOW() - INTERVAL '50 days', NOW() - INTERVAL '50 days'),
        ('WEBINAR-LEADS', $1, NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days')
      ON CONFLICT DO NOTHING
      RETURNING id, code
    `, [sellerId]);
    console.log(`✅ ${referrals.rows.length} referrals inseriti`);

    // 2. OPPORTUNITIES
    console.log('\n📝 Inserimento opportunities...');
    const opportunities = [];
    
    if (companies.length >= 8) {
      // Closed Won
      const opp1 = await pool.query(`
        INSERT INTO opportunities (company_id, title, value, currency, stage, probability, owner_id, expected_close_date, source, referral_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW() - INTERVAL '90 days', NOW() - INTERVAL '60 days')
        RETURNING id
      `, [companies[0], 'TechFlow - Pacchetto Enterprise 500 Leads B2B Tech', 15000, 'EUR', 'closed_won', 100, sellerId, (new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0], 'partner', referrals.rows[0]?.id]);
      opportunities.push(opp1.rows[0]);

      const opp2 = await pool.query(`
        INSERT INTO opportunities (company_id, title, value, currency, stage, probability, owner_id, expected_close_date, source, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() - INTERVAL '120 days', NOW() - INTERVAL '45 days')
        RETURNING id
      `, [companies[1], 'Digital Boost - Leads Marketing Agencies Qualified', 8500, 'EUR', 'closed_won', 100, sellerId, (new Date(Date.now() - 45 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0], 'organic']);
      opportunities.push(opp2.rows[0]);

      const opp3 = await pool.query(`
        INSERT INTO opportunities (company_id, title, value, currency, stage, probability, owner_id, expected_close_date, source, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() - INTERVAL '200 days', NOW() - INTERVAL '180 days')
        RETURNING id
      `, [companies[4], 'BGConsultants - Database PMI Manufacturing 300 Leads', 5500, 'EUR', 'closed_won', 100, sellerId, (new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0], 'cold_outreach']);
      opportunities.push(opp3.rows[0]);

      // Negotiation
      const opp4 = await pool.query(`
        INSERT INTO opportunities (company_id, title, value, currency, stage, probability, owner_id, expected_close_date, source, referral_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW() - INTERVAL '150 days', NOW() - INTERVAL '5 days')
        RETURNING id
      `, [companies[2], 'Prime Properties - Leads Acquirenti Immobili Luxury 1000 Contatti', 25000, 'EUR', 'negotiation', 75, sellerId, (new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0], 'ads', referrals.rows[1]?.id]);
      opportunities.push(opp4.rows[0]);

      const opp5 = await pool.query(`
        INSERT INTO opportunities (company_id, title, value, currency, stage, probability, owner_id, expected_close_date, source, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() - INTERVAL '45 days', NOW() - INTERVAL '3 days')
        RETURNING id
      `, [companies[3], 'ShopItaly - E-commerce Leads + Retargeting Data 5000 Leads', 18000, 'EUR', 'negotiation', 80, sellerId, (new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0], 'referral']);
      opportunities.push(opp5.rows[0]);

      // Proposal
      if (companies.length >= 6) {
        const opp6 = await pool.query(`
          INSERT INTO opportunities (company_id, title, value, currency, stage, probability, owner_id, expected_close_date, source, referral_id, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW() - INTERVAL '15 days', NOW() - INTERVAL '2 days')
          RETURNING id
        `, [companies[5], 'FinTech Innovations - Qualified Leads Fintech Startups 800 Leads', 22000, 'EUR', 'proposal', 60, sellerId, (new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0], 'event', referrals.rows[2]?.id]);
        opportunities.push(opp6.rows[0]);
      }

      // Discovery
      if (companies.length >= 7) {
        const opp7 = await pool.query(`
          INSERT INTO opportunities (company_id, title, value, currency, stage, probability, owner_id, expected_close_date, source, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() - INTERVAL '8 days', NOW() - INTERVAL '1 day')
          RETURNING id
        `, [companies[6], 'HealthCare Solutions - Medical Facilities Decision Makers 600 Leads', 16000, 'EUR', 'discovery', 40, sellerId, (new Date(Date.now() + 45 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0], 'organic']);
        opportunities.push(opp7.rows[0]);
      }

      // Qualifying
      if (companies.length >= 8) {
        const opp8 = await pool.query(`
          INSERT INTO opportunities (company_id, title, value, currency, stage, probability, owner_id, expected_close_date, source, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() - INTERVAL '3 days', NOW() - INTERVAL '6 hours')
          RETURNING id
        `, [companies[7], 'EduTech Academy - Students & Parents Database 2000 Leads', 9500, 'EUR', 'qualifying', 30, sellerId, (new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0], 'ads']);
        opportunities.push(opp8.rows[0]);
      }

      // New
      const opp9 = await pool.query(`
        INSERT INTO opportunities (company_id, title, value, currency, stage, probability, owner_id, expected_close_date, source, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days')
        RETURNING id
      `, [companies[1], 'Digital Boost - Expansion: LinkedIn Leads Campaign 1500 Leads', 12000, 'EUR', 'new', 20, sellerId, (new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0], 'organic']);
      opportunities.push(opp9.rows[0]);

      // Closed Lost
      const opp10 = await pool.query(`
        INSERT INTO opportunities (company_id, title, value, currency, stage, probability, owner_id, expected_close_date, source, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() - INTERVAL '80 days', NOW() - INTERVAL '50 days')
        RETURNING id
      `, [companies[3], 'ShopItaly - Previous Proposal: Basic Package 200 Leads', 3500, 'EUR', 'closed_lost', 0, sellerId, (new Date(Date.now() - 50 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0], 'cold_outreach']);
      opportunities.push(opp10.rows[0]);
    }
    
    console.log(`✅ ${opportunities.length} opportunities inserite`);

    // 3. TASKS
    console.log('\n📝 Inserimento tasks...');
    const tasksToInsert = [
      { title: 'Follow-up proposta FinTech Innovations', description: 'Chiamata per discutere proposta, rispondere a domande tecniche', due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), status: 'open', priority: 'medium', company_id: companies[5]?.id, opportunity_id: opportunities[5]?.id },
      { title: 'Negoziare sconto Prime Properties', description: 'Rivedere offerta, proporre sconto 10% + supporto post-vendita', due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), status: 'in_progress', priority: 'urgent', company_id: companies[2]?.id, opportunity_id: opportunities[3]?.id },
      { title: 'Demo piattaforma leads ShopItaly', description: 'Mostrare dashboard e sistema di integrazione API', due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), status: 'in_progress', priority: 'high', company_id: companies[3]?.id, opportunity_id: opportunities[4]?.id },
      { title: 'Discovery call HealthCare Solutions', description: 'Prima chiamata per capire esigenze e budget', due_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000), status: 'open', priority: 'medium', company_id: companies[6]?.id, opportunity_id: opportunities[6]?.id },
      { title: 'Inviare sample data a FinTech', description: 'Preparare sample del database leads fintech (50 record)', due_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), status: 'open', priority: 'high', company_id: companies[5]?.id, opportunity_id: opportunities[5]?.id },
      { title: 'Aggiornare database leads settore Tech', description: 'Refresh contatti aziende tech, verificare email e LinkedIn', due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), status: 'open', priority: 'medium', company_id: null, opportunity_id: null },
    ];

    for (const task of tasksToInsert) {
      await pool.query(`
        INSERT INTO tasks (title, description, due_date, owner_id, company_id, opportunity_id, status, priority, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day')
      `, [task.title, task.description, task.due_date.toISOString().split('T')[0], sellerId, task.company_id, task.opportunity_id, task.status, task.priority]);
    }
    console.log(`✅ ${tasksToInsert.length} tasks inseriti`);

    // 4. ACTIVITIES
    console.log('\n📝 Inserimento activities...');
    if (opportunities.length > 0 && contacts.length > 0) {
      await pool.query(`
        INSERT INTO activities (type, actor_id, company_id, contact_id, opportunity_id, content, occurred_at, created_at)
        VALUES 
          ('email', $1, $2, $3, $4, 'Inviata proposta commerciale per pacchetto Enterprise 500 Leads B2B Tech', NOW() - INTERVAL '85 days', NOW() - INTERVAL '85 days'),
          ('call', $1, $2, $3, $4, 'Call con Marco Rossi. Discussi termini contratto, confermato budget 15K. Outcome: Positivo', NOW() - INTERVAL '62 days', NOW() - INTERVAL '62 days'),
          ('meeting', $1, $5, $6, $7, 'Meeting Google Meet. Demo piattaforma leads + integrazione API. Molto interessati', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'),
          ('note', $1, $8, $9, $10, 'Cliente molto soddisfatto. Database ha generato 23 nuovi contatti qualificati in 2 settimane', NOW() - INTERVAL '170 days', NOW() - INTERVAL '170 days')
      `, [
        sellerId,
        companies[0]?.id, contacts[0]?.id, opportunities[0]?.id,
        companies[3]?.id, contacts[9]?.id, opportunities[4]?.id,
        companies[4]?.id, contacts[10]?.id, opportunities[2]?.id
      ]);
      console.log('✅ Activities inserite');
    }

    // 5. TICKETS
    console.log('\n📝 Inserimento tickets...');
    await pool.query(`
      INSERT INTO tickets (requester_id, subject, body, status, priority, assignee_id, created_at, updated_at)
      VALUES 
        ($1, 'Richiesta aggiornamento database leads Tech', 'Alcuni contatti hanno email non più valide. Possibile avere un refresh parziale?', 'open', 'normal', $1, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
        ($1, 'Domanda su prossimo acquisto leads', 'Vorremmo acquistare un altro pacchetto per campagna LinkedIn. Disponibilità per call?', 'solved', 'normal', $1, NOW() - INTERVAL '5 days', NOW() - INTERVAL '3 days'),
        (NULL, 'Impossibile accedere alla piattaforma', 'Ho dimenticato la password e il reset non funziona. Codice: SEL00000001', 'pending', 'high', $1, NOW() - INTERVAL '1 day', NOW() - INTERVAL '12 hours')
    `, [sellerId]);
    console.log('✅ 3 tickets inseriti');

    console.log('\n✅ POPOLAMENTO COMPLETATO!\n');
    console.log('📊 Riepilogo:');
    console.log(`  - ${companies.length} Companies`);
    console.log(`  - ${contacts.length} Contacts`);
    console.log(`  - ${referrals.rows.length} Referrals`);
    console.log(`  - ${opportunities.length} Opportunities`);
    console.log(`  - ${tasksToInsert.length} Tasks`);
    console.log(`  - Activities inserite`);
    console.log(`  - 3 Tickets`);
    console.log('\n💰 Metriche Pipeline:');
    const wonValue = [15000, 8500, 5500].reduce((a, b) => a + b, 0);
    const pipelineValue = [25000, 18000, 22000, 16000, 9500, 12000].reduce((a, b) => a + b, 0);
    console.log(`  - Won Deals: €${wonValue.toLocaleString()}`);
    console.log(`  - Active Pipeline: €${pipelineValue.toLocaleString()}`);
    console.log(`  - Total Value: €${(wonValue + pipelineValue).toLocaleString()}`);
    console.log('\n🎯 La dashboard ora mostrerà dati realistici!\n');

  } catch (error) {
    console.error('❌ Errore:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

