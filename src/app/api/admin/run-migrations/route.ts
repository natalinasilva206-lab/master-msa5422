/**
 * POST /api/admin/run-migrations
 * Aplica as migrations SQL pendentes do Master Score via Prisma $executeRawUnsafe.
 * Requer auth ADM.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const MIGRATIONS: { name: string; sql: string[] }[] = [
  {
    name: '20260701120000_add_master_score_controls',
    sql: [
      `ALTER TABLE "MasterScore"
        ADD COLUMN IF NOT EXISTS "monitorado"         BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "estrategico"        BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "beneficioCongelado" BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "nivelManual"        TEXT,
        ADD COLUMN IF NOT EXISTS "sugestaoStatus"     TEXT NOT NULL DEFAULT 'pendente'`,

      `CREATE TABLE IF NOT EXISTS "MasterScoreAudit" (
        "id"          TEXT NOT NULL,
        "merchantId"  TEXT NOT NULL,
        "adminEmail"  TEXT NOT NULL,
        "adminName"   TEXT NOT NULL,
        "acao"        TEXT NOT NULL,
        "valorAntes"  TEXT,
        "valorDepois" TEXT,
        "motivo"      TEXT NOT NULL,
        "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MasterScoreAudit_pkey" PRIMARY KEY ("id")
      )`,

      `CREATE INDEX IF NOT EXISTS "MasterScoreAudit_merchantId_idx" ON "MasterScoreAudit"("merchantId")`,
      `CREATE INDEX IF NOT EXISTS "MasterScoreAudit_createdAt_idx"  ON "MasterScoreAudit"("createdAt")`,
    ],
  },
  {
    name: '20260701130000_fix_master_score_audit_fk',
    sql: [
      // Drop old FK se existir (pode não existir se a tabela foi criada do zero)
      `DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'MasterScoreAudit_merchantId_fkey'
            AND table_name = 'MasterScoreAudit'
        ) THEN
          ALTER TABLE "MasterScoreAudit" DROP CONSTRAINT "MasterScoreAudit_merchantId_fkey";
        END IF;
      END $$`,

      `ALTER TABLE "MasterScoreAudit"
        ADD CONSTRAINT "MasterScoreAudit_merchantId_fkey"
        FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE`,
    ],
  },
]

export async function POST() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const results: { migration: string; status: string; error?: string }[] = []

  for (const m of MIGRATIONS) {
    for (const sql of m.sql) {
      try {
        await prisma.$executeRawUnsafe(sql)
        results.push({ migration: m.name, status: 'ok' })
      } catch (err: any) {
        results.push({ migration: m.name, status: 'error', error: err?.message })
      }
    }
  }

  return NextResponse.json({ ok: true, results })
}
