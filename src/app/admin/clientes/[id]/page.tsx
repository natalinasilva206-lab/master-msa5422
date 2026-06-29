import Link from 'next/link'
import { Topbar } from '@/components/layout/Topbar'
import { Badge } from '@/components/ui/Badge'
import { prisma } from '@/lib/prisma'
import { ToggleStatusButton } from './ToggleStatusButton'

const statusLabel: Record<string, string> = {
  ACTIVE: 'Ativo',
  BLOCKED: 'Bloqueado',
  REVIEW: 'Em análise',
}

const statusVariant: Record<string, 'success' | 'danger' | 'warning'> = {
  ACTIVE: 'success',
  BLOCKED: 'danger',
  REVIEW: 'warning',
}

const typeLabel: Record<string, string> = {
  ECOMMERCE: 'E-commerce',
  INFOPRODUTOR: 'Infoprodutor',
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 py-3 border-b border-slate-700/40 last:border-0">
      <span className="text-slate-400 text-sm w-48 shrink-0">{label}</span>
      <span className="text-white text-sm font-medium">{value}</span>
    </div>
  )
}

function PlaceholderCard({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 flex flex-col gap-3">
      <div className="w-9 h-9 rounded-xl bg-slate-700/60 flex items-center justify-center text-slate-400">
        {icon}
      </div>
      <p className="text-slate-400 text-sm">{title}</p>
      <p className="text-slate-500 text-xl font-bold">Em breve</p>
      <p className="text-slate-600 text-xs">Disponível nas próximas etapas</p>
    </div>
  )
}

function ModuleChip({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl">
      <span className="w-2 h-2 rounded-full bg-slate-600" />
      <span className="text-slate-400 text-sm">{label}</span>
      <span className="ml-auto text-xs text-slate-600 font-medium">Em breve</span>
    </div>
  )
}

interface PageProps {
  params: { id: string }
}

export default async function ClienteDetalhesPage({ params }: PageProps) {
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
            <p className="text-slate-400 text-sm mt-1">O ID informado não corresponde a nenhum cliente cadastrado.</p>
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

  return (
    <div>
      <Topbar title={merchant.name} subtitle="Detalhes do cliente" />

      <div className="p-6 space-y-6 max-w-4xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-400">
          <Link href="/admin/clientes" className="hover:text-white transition-colors">
            Clientes
          </Link>
          <span>/</span>
          <span className="text-white">{merchant.name}</span>
        </nav>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/clientes"
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Voltar
          </Link>
          <Link
            href={`/admin/clientes/${merchant.id}/editar`}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editar
          </Link>
          <ToggleStatusButton id={merchant.id} status={merchant.status} />
        </div>

        {/* Main info card */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
            <h2 className="text-white font-semibold">Informações cadastrais</h2>
            <Badge variant={statusVariant[merchant.status] ?? 'neutral'}>
              {statusLabel[merchant.status] ?? merchant.status}
            </Badge>
          </div>
          <div className="px-6 py-2">
            <InfoRow label="Nome" value={merchant.name} />
            <InfoRow label="E-mail" value={merchant.email} />
            <InfoRow
              label="Documento"
              value={<span className="font-mono">{merchant.document}</span>}
            />
            <InfoRow label="Tipo" value={typeLabel[merchant.type] ?? merchant.type} />
            <InfoRow
              label="Status"
              value={
                <Badge variant={statusVariant[merchant.status] ?? 'neutral'}>
                  {statusLabel[merchant.status] ?? merchant.status}
                </Badge>
              }
            />
            <InfoRow
              label="Plano"
              value={
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-300">
                  {merchant.plan}
                </span>
              }
            />
            <InfoRow
              label="Criado em"
              value={new Date(merchant.createdAt).toLocaleString('pt-BR')}
            />
            <InfoRow
              label="Atualizado em"
              value={new Date(merchant.updatedAt).toLocaleString('pt-BR')}
            />
            <InfoRow
              label="ID"
              value={<span className="font-mono text-slate-500 text-xs">{merchant.id}</span>}
            />
          </div>
        </div>

        {/* Placeholder financial cards */}
        <div>
          <h3 className="text-white font-semibold mb-3">Resumo financeiro</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <PlaceholderCard
              title="Saldo disponível"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              }
            />
            <PlaceholderCard
              title="Volume transacionado"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              }
            />
            <PlaceholderCard
              title="Rendimento previsto"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              }
            />
            <PlaceholderCard
              title="Lucro estimado"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          </div>
        </div>

        {/* Future modules */}
        <div>
          <h3 className="text-white font-semibold mb-3">Próximos módulos</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {['Transações', 'Taxas', 'Saldo Turbo Master', 'Cofres inteligentes', 'Saques', 'Logs'].map(
              (label) => (
                <ModuleChip key={label} label={label} />
              )
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
