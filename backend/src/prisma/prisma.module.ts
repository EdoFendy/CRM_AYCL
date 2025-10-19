import { Global, Module } from '@nestjs/common';

import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService]
})
export class PrismaModule {}
// CRITIC PASS: Modulo globale espone solo Prisma; TODO includere seeders/migrations automation e gestione multi datasource.
