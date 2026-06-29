# Master Pagamentos

Gateway financeiro premium — Next.js 14 + TypeScript + Tailwind + Supabase.

---

## Pré-requisitos

- Node.js 18+
- Conta no [Supabase](https://supabase.com) (gratuita)
- `npm` ou `pnpm`

---

## 1. Criar projeto no Supabase

1. Acesse [app.supabase.com](https://app.supabase.com) e crie um novo projeto.
2. Anote a **URL** e as chaves em **Project Settings → API**:
   - `URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

---

## 2. Rodar o SQL (criar tabelas)

1. No Supabase Dashboard, vá em **SQL Editor → New query**.
2. Cole o conteúdo de `supabase/schema.sql`.
3. Clique em **Run**.

Isso cria as tabelas `profiles`, `merchants`, `fee_plans` e `audit_logs` com RLS habilitado.

---

## 3. Configurar `.env.local`

```bash
cp .env.example .env.local
```

Edite `.env.local` e preencha com as chaves do seu projeto Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL="https://xxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
```

> `SUPABASE_SERVICE_ROLE_KEY` nunca deve ser exposta no frontend. Ela só é usada no seed e em API routes server-side.

---

## 4. Instalar dependências

```bash
npm install
```

---

## 5. Rodar o seed

O seed cria usuários, merchants e planos de taxa:

```bash
npm run seed
```

O que será criado:

| Tipo      | Email                          | Senha      |
|-----------|-------------------------------|------------|
| Admin     | admin@masterpagamentos.com    | admin123   |
| Cliente   | cliente@teste.com             | cliente123 |

Planos criados: **Start**, **Growth**, **Prime**, **Black**

Merchants criados: Loja Alpha, Digital Pro, Market Fit Store, Curso Elite, Oferta Max

---

## 6. Rodar em desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

---

## 7. Testar login

1. Acesse `/login`
2. **Admin**: `admin@masterpagamentos.com` / `admin123` → redireciona para `/admin/dashboard`
3. **Cliente**: `cliente@teste.com` / `cliente123` → redireciona para `/cliente/dashboard`

### Proteção de rotas

| Rota              | Comportamento sem autenticação |
|-------------------|--------------------------------|
| `/admin/*`        | Redireciona para `/login`      |
| `/cliente/*`      | Redireciona para `/login`      |
| Admin em `/cliente/*` | Redireciona para `/admin/dashboard` |
| Cliente em `/admin/*`  | Redireciona para `/cliente/dashboard` |

---

## 8. Build de produção

```bash
npm run build
npm start
```

---

## Estrutura de arquivos relevantes

```
src/
  lib/
    supabase/
      client.ts    # createBrowserClient (uso em componentes client)
      server.ts    # createServerClient  (uso em Server Components)
      admin.ts     # service_role client (seed / API routes)
  middleware.ts    # proteção de rotas por role
  app/
    login/page.tsx
    admin/layout.tsx
    cliente/layout.tsx
supabase/
  schema.sql       # tabelas + RLS
scripts/
  seed.ts          # popula banco com dados iniciais
```

---

## Implantação (Vercel)

1. Conecte o repositório no [vercel.com](https://vercel.com).
2. Em **Settings → Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Faça deploy normalmente. O build valida as variáveis obrigatórias automaticamente.

---

© 2024 Master Pagamentos
