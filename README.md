# Master Pagamentos

Gateway financeiro premium — Next.js 14 + TypeScript + Tailwind + Supabase.

---

## Status do projeto

| Etapa | Status |
|---|---|
| Base Next.js + TypeScript + Tailwind | ✅ Concluído |
| Supabase Auth + Postgres (schema, RLS, seed) | ✅ Concluído |
| Dashboards com dados reais | ✅ Concluído |
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

### O que é criado

**Usuários:**

| Tipo | Email | Senha |
|---|---|---|
| Admin | admin@masterpagamentos.com | admin123 |
| Cliente | cliente@teste.com | cliente123 |

**Planos de taxa:** Start, Growth, Prime, Black

**Merchants:** Loja Alpha, Digital Pro, Market Fit Store, Curso Elite, Oferta Max

---

## 6. Rodar em desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

---

## 7. Testar login e dashboards

### Admin
1. Acesse `/login`
2. Email: `admin@masterpagamentos.com` / Senha: `admin123`
3. Redireciona para `/admin/dashboard`
4. Vê cards com dados reais: total de merchants, ativos, em análise, bloqueados, planos de taxa
5. Vê tabela com os últimos merchants cadastrados

### Cliente
1. Acesse `/login`
2. Email: `cliente@teste.com` / Senha: `cliente123`
3. Redireciona para `/cliente/dashboard`
4. Vê card com nome, e-mail, role e status da conta (dados reais do Supabase)
5. Vê placeholders de saldo, volume e rendimento

### Proteção de rotas

| Rota | Comportamento |
|---|---|
| `/admin/*` sem login | Redireciona para `/login` |
| `/cliente/*` sem login | Redireciona para `/login` |
| Admin em `/cliente/*` | Redireciona para `/admin/dashboard` |
| Cliente em `/admin/*` | Redireciona para `/cliente/dashboard` |
| Logado em `/login` | Redireciona para o dashboard correto |

---

## 8. Build de produção

```bash
npm run build
npm start
```

---

## Estrutura relevante

```
supabase/
  schema.sql              # tabelas + RLS + índices
scripts/
  seed.ts                 # popula banco com dados iniciais
src/
  middleware.ts           # proteção de rotas por role
  types/
    ui.ts                 # tipos compartilhados (BadgeVariant, etc.)
  lib/
    supabase/
      client.ts           # createBrowserClient (componentes client)
      server.ts           # createServerClient  (Server Components)
      admin.ts            # service_role client (seed / API routes)
  app/
    login/page.tsx        # login via Supabase Auth
    admin/
      layout.tsx          # proteção: apenas role=admin
      dashboard/page.tsx  # dados reais: merchants + fee_plans
    cliente/
      layout.tsx          # proteção: apenas role=client
      dashboard/page.tsx  # dados reais: perfil do usuário
```

---

## Implantação (Vercel)

1. Conecte o repositório em [vercel.com](https://vercel.com).
2. Em **Settings → Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. O build valida as variáveis obrigatórias automaticamente.

---

© 2024 Master Pagamentos
