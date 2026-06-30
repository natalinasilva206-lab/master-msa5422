'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[AdminError]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#080c12] p-6">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="w-16 h-16 mx-auto bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <div>
          <h1 className="text-white text-xl font-bold">Erro ao carregar a página</h1>
          <p className="text-slate-400 text-sm mt-2">
            Ocorreu um erro no servidor. Se o problema persistir, verifique os logs do Vercel.
          </p>
          {error.digest && (
            <p className="text-slate-600 text-xs mt-2 font-mono">Digest: {error.digest}</p>
          )}
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            Tentar novamente
          </button>
          <Link
            href="/admin/dashboard"
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
          >
            Ir ao painel
          </Link>
        </div>
      </div>
    </div>
  )
}
