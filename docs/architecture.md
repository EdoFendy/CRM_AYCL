# Architettura CRM AYCL

La soluzione CRM AYCL adotta una struttura modulare basata su un monorepo con backend NestJS/Prisma e frontend React/Vite. Le componenti principali includono:

- **Backend**: API REST con autenticazione JWT, code BullMQ per job asincroni, integrazione Stripe, storage S3-compatibile e provider e-signature.
- **Frontend**: applicazione SPA con React Query, Tailwind, shadcn/ui per la UI e React Hook Form + Zod per la validazione.
- **Database**: PostgreSQL con schema unico multi-tenant logico e auditing globale.
- **Integrazioni**: Stripe per pagamenti, adattatori email/calendario, webhook interni/esterni.

Ulteriori dettagli verranno documentati nelle ADR dedicate e nella specifica OpenAPI.

// CRITIC PASS: Architettura high-level priva di diagrammi e flussi dettagliati; TODO aggiungere sequence diagram per workflow contratti e pipeline opportunità.
