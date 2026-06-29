# Master Pagamentos

Gateway de pagamentos premium para e-commerces e infoprodutores.

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Prisma ORM + PostgreSQL (Neon)
- NextAuth v4 (autenticação JWT)
- bcryptjs (hash de senhas)

---

## Configuração do banco — Neon PostgreSQL

### 1. Criar banco no Neon

1. Acesse [neon.tech](https://neon.tech) e crie uma conta gratuita
2. Crie um novo projeto (ex: `master-pagamentos`)
3. Na tela do projeto, copie a **Connection string** no formato:
   ```
   postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
   ```

### 2. Criar `.env` local

Crie um arquivo `.env` na raiz (não é versionado):

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
NEXTAUTH_SECRET="string-longa-e-aleatoria-minimo-32-caracteres"
NEXTAUTH_URL="http://localhost:3000"
```

Para gerar um `NEXTAUTH_SECRET` seguro:
```bash
openssl rand -base64 32
```

---

## Setup local

### Pré-requisitos

- Node.js 18+
- npm 9+
- Conta Neon com banco criado

### Instalar, migrar e seedar

```bash
npm run setup
```

Esse comando executa: `npm install` → `prisma generate` → `prisma migrate deploy` → seed com dados de teste.

### Rodar em desenvolvimento

```bash
npm run dev
```

Acesse: **http://localhost:3000**

---

## Deploy na Vercel

### 1. Configurar variáveis de ambiente

No painel da Vercel: **Project → Settings → Environment Variables**, adicione:

| Variável | Valor |
|----------|-------|
| `DATABASE_URL` | Connection string do Neon (com `?sslmode=require`) |
| `NEXTAUTH_SECRET` | String aleatória segura (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | `https://master-msa5422.vercel.app` |

### 2. Build automático

O script de build já inclui migrations:

```
prisma generate && prisma migrate deploy && next build
```

Toda vez que você fizer push para a branch configurada na Vercel, o deploy roda migrations automaticamente antes do build.

### 3. Seedar o banco de produção (primeira vez)

Após o primeiro deploy, rode localmente apontando para o banco de produção:

```bash
DATABASE_URL="postgresql://..." npm run seed
```

---

## Comandos disponíveis

```bash
npm run dev            # Servidor de desenvolvimento
npm run build          # Build de produção (com migrations)
npm run start          # Servir o build de produção
npm run setup          # Setup completo (install + banco + seed)
npm run db:reset       # Resetar banco completamente e re-seedar
npm run seed           # Apenas seedar dados de teste
npm run prisma:studio  # Abrir Prisma Studio (interface visual do banco)
```

---

## Usuários de Teste

| Perfil | Email | Senha |
|--------|-------|-------|
| Admin | admin@masterpagamentos.com | admin123 |
| Cliente | cliente@teste.com | cliente123 |

---

## Rotas

| Rota | Acesso | Descrição |
|------|--------|-----------|
| `/` | Público | Redireciona para `/login` |
| `/login` | Público | Tela de login com redirecionamento por perfil |
| `/admin/dashboard` | Somente Admin | Dashboard administrativo |
| `/admin/clientes` | Somente Admin | Listagem de merchants com busca e filtros |
| `/admin/clientes/novo` | Somente Admin | Formulário de criação de novo merchant |
| `/admin/clientes/[id]` | Somente Admin | Detalhes do merchant |
| `/admin/clientes/[id]/editar` | Somente Admin | Formulário de edição do merchant |
| `/cliente/dashboard` | Somente Cliente | Dashboard do cliente |

Rotas protegidas: Admin que tentar acessar `/cliente/*` é redirecionado para `/admin/dashboard` e vice-versa.

---

## Estrutura do Projeto

```
src/
├── app/
│   ├── layout.tsx                    # Layout raiz com AuthProvider
│   ├── page.tsx                      # Redirect para /login
│   ├── globals.css                   # Tailwind base
│   ├── login/page.tsx                # Tela de login
│   ├── admin/
│   │   ├── layout.tsx                # Proteção de rota (role=ADMIN)
│   │   └── dashboard/page.tsx        # Dashboard administrativo
│   ├── cliente/
│   │   ├── layout.tsx                # Proteção de rota (role=CLIENT)
│   │   └── dashboard/page.tsx        # Dashboard do cliente
│   └── api/auth/[...nextauth]/       # Handler NextAuth
├── components/
│   ├── AuthProvider.tsx              # SessionProvider client-side
│   ├── layout/
│   │   ├── Sidebar.tsx               # Navegação lateral
│   │   └── Topbar.tsx                # Barra superior
│   ├── dashboard/
│   │   └── StatCard.tsx              # Card de métrica
│   └── ui/
│       ├── Badge.tsx                 # Badge de status
│       ├── Button.tsx                # Botão reutilizável
│       ├── Card.tsx                  # Card container
│       ├── Input.tsx                 # Input com label/erro
│       ├── Select.tsx                # Select com label
│       └── Table.tsx                 # Tabela genérica
├── lib/
│   ├── auth.ts                       # Configuração NextAuth
│   └── prisma.ts                     # Singleton Prisma Client
└── types/
    └── next-auth.d.ts                # Tipagem da sessão (role, id)

prisma/
├── schema.prisma                     # Modelos: User, Merchant, FeePlan, AuditLog
├── seed.ts                           # Dados de teste
└── migrations/                       # Migrations PostgreSQL
```

---

## Banco de Dados

### Modelos

- **User** — usuários da plataforma (Admin ou Cliente)
- **Merchant** — empresas/infoprodutores cadastrados
- **FeePlan** — planos de taxas (básico, premium)
- **AuditLog** — log de auditoria de ações

### Como rodar migrations manualmente

```bash
# Aplica migrations pendentes (sem interação — ideal para CI/CD)
npx prisma migrate deploy

# Cria nova migration durante desenvolvimento (requer DB acessível)
npx prisma migrate dev --name nome-da-migration
```

---

## O que está implementado

### Etapa 1 — Base
- [x] Estrutura Next.js 14 App Router + TypeScript
- [x] Tailwind CSS com design fintech dark premium
- [x] Prisma ORM com PostgreSQL (Neon) + migrations
- [x] Autenticação JWT com NextAuth v4
- [x] Login com redirecionamento por perfil
- [x] Proteção de rotas por role (ADMIN / CLIENT)
- [x] Layout: Sidebar + Topbar reutilizáveis
- [x] Dashboard Admin — cards de volume, receita, margem e clientes
- [x] Dashboard Cliente — cards de saldo, volume, rendimento e plano
- [x] Componentes UI: Button, Input, Select, Card, Badge, Table, StatCard
- [x] Scripts npm configurados

### Etapa 2 — Listagem de Clientes
- [x] Rota `/admin/clientes` com listagem de merchants do banco
- [x] Busca por nome, e-mail ou documento (server-side via URL params)
- [x] Filtro por status (ACTIVE / REVIEW / BLOCKED)
- [x] Filtro por tipo (ECOMMERCE / INFOPRODUTOR)
- [x] Badges coloridos de status (Ativo / Em análise / Bloqueado)
- [x] Item "Clientes" adicionado na Sidebar do Admin
- [x] Seed atualizado com 5 merchants de teste

### Etapa 3 — Criação de Cliente
- [x] Rota `/admin/clientes/novo` com formulário completo
- [x] Validação client-side (campos obrigatórios com feedback visual)
- [x] Server Action para criação no banco de dados
- [x] Verificação de e-mail duplicado
- [x] Registro de auditoria (`CREATE_MERCHANT`) no `AuditLog`
- [x] Redirecionamento para listagem após criação bem-sucedida

### Etapa 4 — Detalhes do Cliente
- [x] Rota `/admin/clientes/[id]` com dados reais do banco
- [x] Página "Cliente não encontrado" para IDs inválidos
- [x] Informações cadastrais completas
- [x] Cards placeholder de resumo financeiro
- [x] Seção "Próximos módulos"
- [x] Breadcrumb de navegação

### Etapa 5 — Edição de Cliente
- [x] Rota `/admin/clientes/[id]/editar` com formulário pré-preenchido
- [x] Server Action `updateMerchant` — valida, atualiza, grava AuditLog
- [x] Validação client-side campo a campo
- [x] Verificação de e-mail duplicado respeitando o próprio e-mail

### Etapa 6 — Bloquear / Ativar Cliente
- [x] Server Action `toggleMerchantStatus`: alterna ACTIVE ↔ BLOCKED
- [x] AuditLog `BLOCK_MERCHANT` / `ACTIVATE_MERCHANT`
- [x] Botão vermelho "Bloquear" / verde "Ativar"
- [x] Spinner de loading via `useTransition`

### Etapa 7 — Segurança de Dependências
- [x] `next` atualizado para 14.2.35 (corrige CVEs críticos)
- [x] Vulnerabilidades restantes documentadas (requerem breaking changes)

### Etapa 8 — CI/Build/Deploy
- [x] `postinstall: prisma generate` para Vercel/CI
- [x] `build: prisma generate && prisma migrate deploy && next build`
- [x] `export const dynamic = 'force-dynamic'` em todas as páginas com DB
- [x] `.env.example` documentado
- [x] Migração de SQLite para PostgreSQL (Neon)
- [x] Migration SQL reescrita para PostgreSQL

## O que será implementado nas próximas etapas

- [ ] CRUD de Planos de Taxas
- [ ] Módulo de Transações (simulação — sem Pix real)
- [ ] Gestão de usuários
- [ ] Log de auditoria visível
- [ ] Relatórios e exportação CSV
