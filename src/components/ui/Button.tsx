import { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

const variantClasses = {
  primary: 'bg-blue-600 hover:bg-blue-500 text-white shadow shadow-blue-500/20',
  secondary: 'bg-slate-700 hover:bg-slate-600 text-white',
  ghost: 'text-slate-400 hover:text-white hover:bg-slate-700',
  danger: 'bg-red-600 hover:bg-red-500 text-white',
}

const sizeClasses = {
  sm: 'px-3 py-1.5 text-[12px]',
  md: 'px-4 py-2.5 text-[13px]',
  lg: 'px-6 py-3 text-[14px]',
}

export function Button({ variant = 'primary', size = 'md', className = '', ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    />
  )
}
