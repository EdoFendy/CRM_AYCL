# ADR-0001: Backend bootstrap con NestJS modulare

## Contesto
La roadmap richiede un backend NestJS modulare con validazioni Zod, RBAC, audit trail e integrazione Prisma. Era necessario definire la struttura iniziale dell'applicazione per proseguire con i moduli dominio.

## Decisione
- Creazione di un workspace `backend` separato con NestJS 10, TypeScript e Prisma come ORM.
- Configurazione globale di `ConfigModule` con validazione environment tramite Zod.
- Registrazione di servizi condivisi (`AppLogger`, `CorrelationIdService`, `AuditService`) e interceptor globali per correlationId e audit.
- Definizione di guard RBAC, filtro errori con `correlationId` e pipe Zod come provider globali.
- Esposizione di `PrismaService` tramite modulo globale per uso futuro nei repository.

## Conseguenze
- Il bootstrap offre fondamenta comuni per moduli futuri, facilitando logging strutturato e audit.
- Le funzionalità dominio sono ancora assenti: sarà necessario implementare moduli feature e collegare `AuditService` al database.
- L'approccio globale richiede attenzione per evitare eccessivo accoppiamento; si prevedono refactor per suddividere responsabilità in moduli dedicati.

// CRITIC PASS: ADR preliminare che non copre alternative valutate né impatti DevOps; TODO integrare ulteriori ADR per scelte su logging distribuito e gestione job queue.
