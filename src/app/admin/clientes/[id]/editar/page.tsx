export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { prisma } from '@/lib/prisma'
import { EditForm } from './EditForm'

interface PageProps {
  params: { id: string }
  searchParams: { error?: string }
}

export default async function EditarClientePage({ params, searchParams }: PageProps) {
  const merchant = await prisma.merchant.findUnique({
    where: { id: params.id },
  })

  if (!merchant) {
    return (
      <div>
        <Topbar title="Cliente não encontrado" />
        <div className="p-6 flex flex-col items-center justify-center min-h-64 gap-4">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-white font-semibold text-lg">Cliente não encontrado</p>
            <p className="text-slate-400 text-sm mt-1">
              O ID informado não corresponde a nenhum cliente cadastrado.
            </p>
          </div>
          <Link
            href="/admin/clientes"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Voltar para clientes
          </Link>
        </div>
      </div>
    )
  }

  const snapshot = {
    id: merchant.id,
    name: merchant.name,
    email: merchant.email,
    document: merchant.document,
    type: merchant.type,
    status: merchant.status,
    plan: merchant.plan,
  }

  return (
    <div>
      <Topbar title={`Editar — ${merchant.name}`} subtitle="Alterar dados cadastrais do cliente" />

      <div className="p-6 max-w-2xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-400 mb-6">
          <Link href="/admin/clientes" className="hover:text-white transition-colors">
            Clientes
          </Link>
          <span>/</span>
          <Link href={`/admin/clientes/${merchant.id}`} className="hover:text-white transition-colors">
            {merchant.name}
          </Link>
          <span>/</span>
          <span className="text-white">Editar</span>
        </nav>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50">
            <h2 className="text-white font-semibold">Dados do cliente</h2>
          </div>

          <EditForm
            merchant={snapshot}
            errorKey={searchParams.error ?? null}
          />
        </div>
      </div>
    </div>
  )
}
