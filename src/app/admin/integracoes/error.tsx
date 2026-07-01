'use client'

export default function IntegracoesError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Erro ao carregar Integrações</h2>
          <p className="text-sm text-slate-500 mt-1">
            Ocorreu um erro ao buscar os dados. Pode ser uma migration pendente ou indisponibilidade temporária.
          </p>
          {error.digest && (
            <p className="text-[11px] text-slate-700 mt-2 font-mono">Digest: {error.digest}</p>
          )}
        </div>
        <button
          onClick={reset}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  )
}
