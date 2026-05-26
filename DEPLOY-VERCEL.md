# Deploy na Vercel

Passo a passo para subir o **Bolão da Copa** em produção na Vercel.

---

## 1. Banco de dados Postgres hospedado

Vercel não roda Docker em produção. Precisa de um Postgres externo. Opções gratuitas:

| Provedor | Pooled? | Free tier |
|----------|---------|-----------|
| **Neon** (recomendado) | sim | 0.5GB + branching |
| **Supabase** | sim (pgBouncer) | 500MB |
| **Vercel Postgres** | sim (built-in pooling) | 256MB |
| **Railway / Render** | não nativo | varia |

### Recomendado: Neon
1. Crie conta em https://neon.tech
2. Crie um projeto "bolao-copa"
3. Copie as duas URLs do dashboard:
   - **Pooled** → `DATABASE_URL`
   - **Direct** → `DIRECT_URL`

---

## 2. Vercel Blob (upload de imagens)

Vercel é serverless → o filesystem não persiste. Os uploads precisam ir pra storage externo.

1. Em https://vercel.com/dashboard → seu projeto → aba **Storage** → **Create Database** → **Blob**
2. Nome: `bolao-uploads`
3. Conecte ao projeto Vercel → vai criar a env `BLOB_READ_WRITE_TOKEN` automaticamente

Em **dev local** (sem o token setado), os uploads continuam indo pra `public/uploads/` no disco. Sem mudança no código.

---

## 3. Variáveis de ambiente na Vercel

Vá em **Project Settings → Environment Variables** e adicione:

| Nome | Valor | Ambiente |
|------|-------|----------|
| `DATABASE_URL` | URL **pooled** do Neon | Production |
| `DIRECT_URL` | URL **direct** do Neon | Production |
| `JWT_SECRET` | gere com `openssl rand -base64 48` | Production |
| `BLOB_READ_WRITE_TOKEN` | (gerado automaticamente quando você cria o Blob) | Production |
| `LIVE_PROVIDER` | `demo` (ou `api-football` se tiver chave) | Production |

**⚠️ Atenção crítica**: `JWT_SECRET` é OBRIGATÓRIO. O app **não inicia em produção** sem essa variável (proteção contra deploy com secret default).

---

## 4. Aplicar schema no banco

Antes do primeiro deploy, abra um terminal local e rode contra o Neon:

```powershell
# Adicione temporariamente o DATABASE_URL do Neon no seu .env
npx prisma db push     # aplica o schema
npx prisma db seed     # popula com dados de teste (opcional)
```

Pra produção real (sem dados de teste), só faça o `db push` e crie o super admin manualmente.

---

## 5. Deploy

### Pela CLI
```powershell
npm i -g vercel
vercel login
vercel             # cria o projeto na primeira vez
vercel --prod      # deploy de produção
```

### Pelo dashboard
1. https://vercel.com/new
2. Import do repositório `p2a-tech/Bolao-copa`
3. Framework: Next.js (detecta sozinho)
4. **Não** mude o build command (o `vercel.json` já cuida)
5. Configure as variáveis de ambiente (passo 3)
6. Deploy

---

## 6. Pós-deploy

### Criar o super admin (se não existir)
Como o seed cria contas com senhas conhecidas, em produção **não rode o seed completo**. Crie o super admin direto no banco via SQL ou `prisma studio`:

```sql
INSERT INTO "User" (
  id, "fullName", phone, email, cpf, "birthDate",
  "passwordHash", "isSuperAdmin", "createdAt"
) VALUES (
  gen_random_uuid()::text,
  'Seu Nome',
  '11999999999',
  'seu@email.com',
  '00000000000',
  '1990-01-01',
  '<bcrypt-hash-da-sua-senha>',  -- gere com bcrypt.hash('senha', 10)
  true,
  NOW()
);
```

### Imagens hero dos jogadores
Os 47 PNGs em `public/teams/` **são commitados** no repo (não estão no Blob). Funcionam direto. Se quiser gerar a Argentina (faltante) ou regenerar:

```powershell
# Localmente, com OPENAI_API_KEY no .env:
npm run images:hero
# Commit os novos arquivos:
git add public/teams/
git commit -m "feat: add ar.png hero image"
git push
```

### Domínio customizado
**Project Settings → Domains** → adicione seu domínio. SSL é automático.

---

## 7. Limitações / atenções

- **Memória das functions de upload**: 1GB (configurado em `vercel.json`). Suficiente pra processar imagens até 4MB.
- **Tempo máximo das functions**: 30s (uploads).
- **Free tier limites**: 100GB-h de execução, 100GB de bandwidth, Blob 500MB.
- **Cold starts**: a primeira request após inatividade pode levar 1-3s.
- **Rate limiter em memória** (upload-photo): é "best-effort" em serverless porque cada instância tem seu próprio Map. Pra rate-limit confiável precisa Redis/Upstash.

---

## 8. Resumo do checklist

- [ ] Postgres hospedado (Neon/Supabase/etc.) → `DATABASE_URL` + `DIRECT_URL`
- [ ] Vercel Blob criado → `BLOB_READ_WRITE_TOKEN` (auto)
- [ ] `JWT_SECRET` gerado e configurado
- [ ] `prisma db push` aplicado no banco de produção
- [ ] Super admin criado manualmente
- [ ] Deploy via `vercel --prod` ou pelo dashboard
- [ ] (Opcional) Domínio customizado + SSL

Qualquer dúvida, abra issue no repositório.
