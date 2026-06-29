# Master Pagamentos

Gateway de pagamentos premium para e-commerces e infoprodutores.

## Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Prisma ORM + SQLite (local) / PostgreSQL (produção)
- NextAuth v4
- bcryptjs

## Instalação e Setup

### 1. Instalar dependências e configurar banco

```bash
npm run setup
```

Esse comando instala dependências, gera o Prisma client, roda as migrations e popula o banco com dados de teste.

### 2. Rodar em desenvolvimento

```bash
npm run dev
```

Acesse: http://localhost:3000

### Outros comandos

```bash
npm run build          # Build de produção
npm run db:reset       # Resetar banco e re-seedar
npm run seed           # Apenas seedar dados de teste
npm run prisma:studio  # Abrir Prisma Studio (interface visual do banco)
```

## Usuários de Teste

| Perfil | Email | Senha |
|--------|-------|-------|
| Admin | admin@masterpagamentos.com | admin123 |
| Cliente | cliente@teste.com | cliente123 |

## Rotas

| Rota | Acesso | Descrição |
|------|--------|-----------|
| `/` | Público | Redireciona para /login |
| `/login` | Público | Tela de login |
| `/admin/dashboard` | Admin | Dashboard administrativo |
| `/cliente/dashboard` | Cliente | Dashboard do cliente |
