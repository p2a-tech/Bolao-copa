# Deploy no Netlify

Guia passo a passo pra subir o **Bolão da Copa** no Netlify.
Time/projeto de destino: https://app.netlify.com/teams/adersonvitoria/projects

---

## 1. Banco de dados Postgres hospedado

Netlify também é serverless — não roda Docker. Use um Postgres externo.
Recomendado: **Neon** (https://neon.tech), gratuito.

1. Crie um projeto "bolao-copa" no Neon
2. Copie as duas URLs:
   - **Pooled** → `DATABASE_URL` (usada nas queries normais)
   - **Direct** → `DIRECT_URL` (usada pra migrations)

Outras opções: Supabase, Railway, Render Postgres, Neon, ElephantSQL.

---

## 2. Netlify Blobs (upload de imagens)

O Netlify tem storage de blobs **nativo** que vem ativado automaticamente
em qualquer site. Não precisa criar/configurar nada extra:
- Quando o código estiver rodando no Netlify (env `NETLIFY=true`), o
  `saveImage()` usa `@netlify/blobs` automaticamente.
- A leitura dos arquivos passa pela rota proxy `/api/blob/<folder>/<filename>`.

Em dev local **fora** do `netlify dev`, os uploads voltam pra `public/uploads/`.

---

## 3. Variáveis de ambiente

No dashboard do site (Site settings → **Environment variables**):

| Nome | Valor | Notas |
|------|-------|-------|
| `DATABASE_URL` | URL **pooled** do Neon | obrigatório |
| `DIRECT_URL` | URL **direct** do Neon | obrigatório |
| `JWT_SECRET` | `openssl rand -base64 48` | obrigatório — app não inicia sem |
| `LIVE_PROVIDER` | `api-football` ou `demo` | opcional (default `demo`) |
| `API_FOOTBALL_KEY` | chave do api-football.com | obrigatório se `LIVE_PROVIDER=api-football` |

**⚠️ Crítico**: sem `JWT_SECRET` o build falha em runtime (fail-fast intencional).

### Sincronizar fixtures da Copa 2026 (dados reais)

Depois que o schema estiver aplicado, rode localmente apontando pro Neon pra puxar os jogos reais da Copa 2026:

```bash
npm run live:check    # diagnostico (cota da API, mapeamentos, proximos jogos)
npm run live:map      # mapeia cada Match -> fixture id real + atualiza kickoff/venue da API
npm run live:sync     # puxa placares dos jogos finalizados e recalcula pontos dos palpites
```

Pra automatizar o `live:sync` durante a Copa, use [Netlify Scheduled Functions](https://docs.netlify.com/functions/scheduled-functions/) (cada 5 min é razoável).

---

## 4. Aplicar schema no banco

Antes do primeiro deploy, abra terminal local e rode contra o Neon:

```powershell
# Aponte o DATABASE_URL local pro Neon e:
npx prisma db push     # aplica o schema
```

---

## 5. Deploy

### Opção A — Conectar repositório (recomendado)

1. https://app.netlify.com/teams/adersonvitoria/projects → **Add new project** → **Import an existing project**
2. Conecte ao GitHub e selecione `p2a-tech/Bolao-copa`
3. Build settings (deve detectar do `netlify.toml`):
   - Build command: `prisma generate && next build`
   - Publish directory: `.next`
4. Adicione as **environment variables** (passo 3)
5. **Deploy**

O plugin `@netlify/plugin-nextjs` (já listado no `netlify.toml`) converte
cada rota Next em Netlify Function automaticamente.

### Opção B — Netlify CLI

```powershell
npm i -g netlify-cli
netlify login
netlify init        # vincula ao site
netlify env:import .env   # opcional, importa env vars do .env
netlify deploy --prod
```

---

## 6. Pós-deploy

### Criar o super admin
Não rode o `db:seed` em produção (cria usuários com senhas conhecidas).
Crie via SQL no Neon Console:

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
  '<bcrypt-hash-da-sua-senha>',
  true,
  NOW()
);
```

Gere o hash bcrypt assim (no terminal local com Node):
```js
node -e "console.log(require('bcryptjs').hashSync('sua-senha', 10))"
```

### Domínio customizado
Site settings → Domain management → Add custom domain. SSL é automático.

### Como saber qual storage está ativo
A constante `STORAGE_BACKEND` exportada por `src/lib/storage.ts` informa:
- `"netlify-blobs"` em prod Netlify
- `"vercel-blob"` se você setar `BLOB_READ_WRITE_TOKEN`
- `"local-fs"` em dev local

---

## 7. Diferenças Vercel × Netlify

| Aspecto | Vercel | Netlify |
|---------|--------|---------|
| Blob storage | Vercel Blob (criar manual) | Netlify Blobs (nativo, sem setup) |
| URL do blob | absoluta (CDN da Vercel) | passa por `/api/blob/<f>/<file>` |
| Plugin Next | nativo (sem plugin) | `@netlify/plugin-nextjs` (auto) |
| Limite de body | 4.5MB free | 6MB free |
| Region default | varia | varia |
| Custo | hobby grátis | starter grátis |

O código suporta **as duas plataformas** sem mudanças — basta configurar
as env vars e o `saveImage()` escolhe o backend correto na hora.

---

## 8. Checklist final

- [ ] Postgres hospedado (Neon) → `DATABASE_URL` + `DIRECT_URL`
- [ ] `JWT_SECRET` configurado
- [ ] `prisma db push` aplicado contra o banco de produção
- [ ] Super admin criado manualmente (SQL)
- [ ] Build no Netlify rodando sem erro
- [ ] Login e upload funcionando em `https://<seu-site>.netlify.app`
- [ ] (Opcional) Domínio customizado

Se algo falhar no build, abra os logs em Deploys → último deploy → "Building" — geralmente é falta de env var ou problema de Postgres connection pool.
