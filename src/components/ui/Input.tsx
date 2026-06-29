import { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-slate-300">{label}</label>}
      <input
        {...props}
        className={`w-full px-4 py-2.5 bg-slate-900/50 border ${error ? 'border-red-500' : 'border-slate-600'} rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${className}`}
      />
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  )
}
