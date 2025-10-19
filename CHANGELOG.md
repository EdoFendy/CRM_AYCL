# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2024-01-02
### Added
- Workspace backend NestJS con configurazione ConfigModule + Zod e provider globali (RBAC, audit, correlationId, error filter, Zod pipe).
- Logger centralizzato basato su Pino con propagazione correlationId e servizio Audit stub.
- Modulo Prisma condiviso e bootstrap `main.ts` con avvio dinamico porta da configurazione.
- `.env.example`, aggiornamento README, architettura e ADR-0001 per documentare le scelte.

## [0.1.0] - 2024-01-01
### Added
- Bootstrap iniziale del repository con configurazioni di base, documenti principali e pianificazione roadmap.
- Specifica OpenAPI preliminare con endpoint core, sicurezza JWT e esempi webhook.
- Schema Prisma e migrazione SQL iniziale per entità CRM principali con indici.

// CRITIC PASS: Versioni ancora in bozza con date placeholder e senza riferimenti commit; TODO aggiornare link confronto e validare versioning con pipeline CI.
