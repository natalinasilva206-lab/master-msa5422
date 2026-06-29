// next-auth removido — autenticação via Supabase Auth
// Mantido para compatibilidade com o layout.tsx sem precisar alterar imports.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
