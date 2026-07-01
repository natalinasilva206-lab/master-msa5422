/**
 * POST /api/admin/recalc-all
 * Recalcula o Master Score de todos os sellers via HTTP.
 * Requer auth ADM.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { recalcAllScores } from '@/app/admin/master-score/actions'

export async function POST() {
  const session = await getServerSession(authOptions)
  if ((session?.user as any)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  const result = await recalcAllScores()
  return NextResponse.json(result)
}
