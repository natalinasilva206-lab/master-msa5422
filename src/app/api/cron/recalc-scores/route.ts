export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { recalcAllScoresInternal } from '@/lib/scoreEventHook'

// GET /api/cron/recalc-scores
// Recalcula o Master Score de todos os sellers.
// Chamado pelo Vercel Cron diariamente às 03:00 UTC (vercel.json).
// Também pode ser chamado manualmente pelo ADM via botão na tela de configurações.
// Authorization: Bearer $CRON_SECRET
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth   = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const startedAt = Date.now()
  const result    = await recalcAllScoresInternal()
  const ms        = Date.now() - startedAt

  return NextResponse.json({
    ok:      true,
    updated: result.updated,
    errors:  result.errors,
    ms,
  })
}
