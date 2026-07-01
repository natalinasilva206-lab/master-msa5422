'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  merchantId: string
}

export default function SellerTabs({ merchantId }: Props) {
  const pathname = usePathname()
  const base = `/admin/clientes/${merchantId}`

  const tabs = [
    { label: 'Visão Geral',        href: base },
    { label: 'Transações',         href: `${base}/transacoes` },
    { label: 'Saques',             href: `${base}/saques` },
    { label: 'KYC',                href: `${base}/kyc` },
    { label: 'Histórico de Risco', href: `${base}/historico` },
    { label: 'Histórico do Score', href: `${base}/score-historico` },
    { label: 'Master Score',       href: `/admin/master-score/${merchantId}` },
    { label: 'Webhooks',           href: `${base}/webhooks` },
  ]

  return (
    <div className="flex gap-1 border-b border-slate-700/40 mb-6">
      {tabs.map((tab) => {
        const active = tab.href === base ? pathname === base : pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2.5 text-[12.5px] font-semibold border-b-2 -mb-px transition-colors ${
              active
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
