# Master Pagamentos

Gateway de pagamentos premium para e-commerces e infoprodutores.

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Prisma ORM + SQLite (local) / PostgreSQL (produção)
- NextAuth v4 (autenticação JWT)
- bcryptjs (hash de senhas)

---

## Instalação e Setup

### Pré-requisitos

- Node.js 18+
- npm 9+

### 1. Clonar e instalar

```bash
git clone <repo>
cd master-msa5422
```

### 2. Criar o arquivo `.env`

Crie um arquivo `.env` na raiz com o conteúdo abaixo. O arquivo não é versionado por segurança.

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="master-pagamentos-secret-key-2024"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Instalar dependências, aplicar migrations e seedar banco

```bash
npm run setup
```

Esse comando executa: `npm install` → `prisma generate` → `prisma migrate deploy` → seed com usuários de teste.

### 4. Rodar em desenvolvimento

```bash
npm run dev
```

Acesse: **http://localhost:3000**

---

## Comandos disponíveis

```bash
npm run dev            # Servidor de desenvolvimento
npm run build          # Build de produção
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
| `/admin/dashboard` | Somente Admin | Dashboard administrativo com cards e tabela de clientes |
| `/admin/clientes` | Somente Admin | Listagem de merchants com busca e filtros |
| `/admin/clientes/novo` | Somente Admin | Formulário de criação de novo merchant |
| `/admin/clientes/[id]` | Somente Admin | Detalhes do merchant com dados, placeholders financeiros e módulos futuros |
| `/admin/clientes/[id]/editar` | Somente Admin | Formulário de edição de dados do merchant |
| `/cliente/dashboard` | Somente Cliente | Dashboard do cliente com cards e tabela de transações |

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
└── migrations/                       # Migrations SQLite
```

---

## Banco de Dados

### Modelos

- **User** — usuários da plataforma (Admin ou Cliente)
- **Merchant** — empresas/infoprodutores cadastrados
- **FeePlan** — planos de taxas (básico, premium)
- **AuditLog** — log de auditoria de ações

### Migrar para PostgreSQL

Altere `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Atualize `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/master_pagamentos"
```

---

## O que está implementado

### Etapa 1 — Base
- [x] Estrutura Next.js 14 App Router + TypeScript
- [x] Tailwind CSS com design fintech dark premium
- [x] Prisma ORM com SQLite + migrations
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
- [x] Botão "Novo cliente" em `/admin/clientes` agora funcional

### Etapa 4 — Detalhes do Cliente
- [x] Rota `/admin/clientes/[id]` com dados reais do banco
- [x] Página "Cliente não encontrado" para IDs inválidos
- [x] Informações cadastrais completas (nome, e-mail, documento, tipo, status, plano, datas, ID)
- [x] Badge de status na página de detalhes
- [x] Cards placeholder de resumo financeiro (Saldo, Volume, Rendimento, Lucro)
- [x] Seção "Próximos módulos" (Transações, Taxas, Saldo Turbo Master, Cofres, Saques, Logs)
- [x] Botões Editar e Bloquear/Ativar presentes mas desabilitados (funcionalidade futura)
- [x] Breadcrumb de navegação
- [x] Coluna "Ações" com link "Ver detalhes" adicionada à tabela de listagem

### Etapa 5 — Edição de Cliente
- [x] Rota `/admin/clientes/[id]/editar` com formulário pré-preenchido
- [x] Server Action `updateMerchant` — valida, atualiza no banco, grava AuditLog `UPDATE_MERCHANT`
- [x] Validação client-side campo a campo (erros inline que somem ao corrigir)
- [x] Verificação de e-mail duplicado respeitando o próprio e-mail do merchant
- [x] Redirecionamento para `/admin/clientes/[id]` após salvar
- [x] Página "Cliente não encontrado" para IDs inválidos
- [x] Breadcrumb de três níveis: Clientes / Nome / Editar
- [x] Botão Cancelar retorna para `/admin/clientes/[id]`
- [x] Botão "Editar" na página de detalhes agora funcional
- [x] Breadcrumb de navegação no formulário
- [x] Botão "Cancelar" que volta para `/admin/clientes`
- [x] Estado de loading no botão durante envio

## O que será implementado nas próximas etapas

- [ ] CRUD de Merchants (Admin)
- [ ] CRUD de Planos de Taxas
- [ ] Módulo de Transações (simulação — sem Pix real)
- [ ] Gestão de usuários
- [ ] Log de auditoria visível
- [ ] Relatórios e exportação CSV
- [ ] Migração para PostgreSQL
- [ ] Deploy
