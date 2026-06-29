# Master Pagamentos

Gateway financeiro premium — Next.js 14 + TypeScript + Tailwind + Supabase.

---

## Status do projeto

| Etapa | Status |
|---|---|
| Base Next.js + TypeScript + Tailwind | ✅ Concluído |
| Supabase Auth + Postgres (schema, RLS, seed) | ✅ Concluído |
| Dashboards com dados reais | ✅ Concluído |
| Listagem de Clientes (`/admin/clientes`) | ✅ Concluído |
| CRUD de clientes, transações, taxas, cofres | 🔜 Próxima etapa |

---

## Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com) (gratuita)
- `npm`

---

## 1. Criar projeto no Supabase

1. Acesse [app.supabase.com](https://app.supabase.com) e crie um novo projeto.
2. Anote as chaves em **Project Settings → API**:
   - `URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

---

## 2. Rodar o SQL (criar tabelas)

1. No Supabase Dashboard → **SQL Editor → New query**.
2. Cole o conteúdo de `supabase/schema.sql`.
3. Clique em **Run**.

Cria as tabelas `profiles`, `merchants`, `fee_plans` e `audit_logs` com RLS habilitado.

---

## 3. Configurar `.env.local`

```bash
cp .env.example .env.local
```

Preencha com os valores do seu projeto:

```env
NEXT_PUBLIC_SUPABASE_URL="https://xxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
```

> `SUPABASE_SERVICE_ROLE_KEY` nunca deve ser exposta no frontend. Usada apenas no seed e em API routes server-side.

---

## 4. Instalar dependências

```bash
npm install
```

---

## 5. Rodar o seed

```bash
npm run seed
```

**Usuários criados:**

| Tipo | Email | Senha |
|---|---|---|
| Admin | admin@masterpagamentos.com | admin123 |
| Cliente | cliente@teste.com | cliente123 |

**Planos criados:** Start, Growth, Prime, Black

**Merchants criados:** Loja Alpha, Digital Pro, Market Fit Store, Curso Elite, Oferta Max

---

## 6. Rodar em desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

---

## 7. Testar login e dashboards

### Admin
1. `/login` → `admin@masterpagamentos.com` / `admin123`
2. Redireciona para `/admin/dashboard` — cards com dados reais do Supabase
3. Sidebar: Dashboard | Clientes

### Cliente
1. `/login` → `cliente@teste.com` / `cliente123`
2. Redireciona para `/cliente/dashboard` — perfil real + placeholders financeiros
3. Tentativa de acessar `/admin/*` → redirecionado para `/cliente/dashboard`

---

## 8. Testar `/admin/clientes`

1. Faça login como admin
2. Clique em **Clientes** na sidebar ou acesse `/admin/clientes`
3. Veja a tabela com todos os merchants do Supabase

### Filtros disponíveis

| Filtro | Exemplo |
|---|---|
| Busca por nome/email/documento | digitar "alpha" no campo de busca |
| Filtro por status | selecionar "Ativo", "Em análise" ou "Bloqueado" |
| Filtro por tipo | selecionar "E-commerce" ou "Infoprodutor" |

Os filtros atualizam a URL com query params (`?q=alpha&status=active&type=ecommerce`) e a página recarrega com dados filtrados do Supabase.

### Exemplos de URL com filtros

```
/admin/clientes?q=alpha
/admin/clientes?status=active
/admin/clientes?type=infoprodutor
/admin/clientes?status=active&type=ecommerce
```

---

## 9. Proteção de rotas

| Rota | Comportamento |
|---|---|
| `/admin/*` sem login | Redireciona para `/login` |
| `/cliente/*` sem login | Redireciona para `/login` |
| Admin em `/cliente/*` | Redireciona para `/admin/dashboard` |
| Cliente em `/admin/*` | Redireciona para `/cliente/dashboard` |
| Logado em `/login` | Redireciona para o dashboard correto |

---

## 10. Build de produção

```bash
npm run build
npm start
```

---

## Estrutura relevante

```
supabase/
  schema.sql                        # tabelas + RLS + índices
scripts/
  seed.ts                           # popula banco com dados iniciais
src/
  middleware.ts                     # proteção de rotas por role
  types/
    ui.ts                           # BadgeVariant compartilhado
  lib/
    supabase/
      client.ts                     # createBrowserClient
      server.ts                     # createServerClient com cookies
      admin.ts                      # service_role (seed / server)
  app/
    login/page.tsx
    admin/
      layout.tsx                    # proteção: role=admin
      dashboard/page.tsx            # dados reais: merchants + fee_plans
      clientes/
        page.tsx                    # listagem de merchants com filtros
        _components/
          MerchantsFilters.tsx      # busca + selects (client component)
    cliente/
      layout.tsx                    # proteção: role=client
      dashboard/page.tsx            # perfil real + placeholders
```

---

## Implantação (Vercel)

1. Conecte o repositório em [vercel.com](https://vercel.com).
2. Em **Settings → Environment Variables**, adicione as 3 variáveis do `.env.example`.
3. O build valida as variáveis obrigatórias automaticamente.

---

© 2024 Master Pagamentos
