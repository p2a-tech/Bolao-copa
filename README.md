# 🏆 Bolão da Copa 2026

SaaS de bolão para a Copa do Mundo: cadastro de usuários, palpites em todos os
jogos com as bandeiras dos países, ranking ao vivo, bloqueio automático dos
palpites 30 minutos antes de cada jogo (com contador) e espaços para
patrocinadores — inclusive um patrocinador por jogo.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Prisma** + **SQLite** (sem serviços externos)
- **Tailwind CSS**
- Autenticação por **JWT** em cookie httpOnly (`jose` + `bcryptjs`)

## Regras de pontuação

| Acerto | Pontos |
| ------ | ------ |
| Placar exato | **3** |
| Vencedor **ou** empate (sem o placar exato) | **1** |
| Errou | 0 |

Os palpites de cada jogo **travam 30 minutos antes do início** (regra aplicada
no servidor). Um contador regressivo na tela avisa quanto falta para o
fechamento e fica em destaque na última hora.

## Funcionalidades

- **Cadastro** com nome completo, telefone, e-mail, data de nascimento e CPF
  (CPF validado com dígito verificador; máscaras de CPF/telefone).
- **Login/logout** com sessão protegida por middleware.
- **Tela de palpites** com todos os jogos da fase de grupos, bandeiras
  (emoji Unicode, funciona offline), agrupados por dia, com controles
  +/- fáceis para mobile.
- **Ranking** geral com posição, placares exatos, acertos e pontuação,
  destacando o usuário logado.
- **Patrocinadores**: banner do patrocinador master em todas as telas e um
  patrocinador opcional por jogo.
- **Painel admin** para lançar resultados (recalcula o ranking
  automaticamente) e atribuir patrocinador a cada jogo.

## Como rodar

```bash
npm install
npm run setup     # gera o Prisma client, cria o banco e popula os dados
npm run dev       # http://localhost:3000
```

### Contas de teste (criadas pelo seed)

| Perfil | E-mail | Senha |
| ------ | ------ | ----- |
| Admin  | admin@bolao.com | admin123 |
| Usuário | maria@exemplo.com | demo123 |

## Variáveis de ambiente (`.env`)

```
DATABASE_URL="file:./dev.db"
JWT_SECRET="defina-um-segredo-forte-em-producao"
```

## Estrutura

```
prisma/
  schema.prisma        modelos User, Team, Match, Prediction, Sponsor
  seed.ts              48 seleções, 12 grupos, jogos, patrocinadores, admin
src/
  app/                 páginas (landing, login, register, palpites, ranking, admin)
    api/               rotas de auth, predictions e admin
  components/           Nav, MatchCard, Countdown, SponsorBanner, formulários
  lib/                 auth, scoring, validação (CPF), flags, prisma
  middleware.ts        proteção das rotas autenticadas
```
