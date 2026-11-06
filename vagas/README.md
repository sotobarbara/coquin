# Coquin — Vagas & Candidaturas (mini pipeline de hiring)

App **independente** (link próprio na Vercel), no mesmo padrão do checklist e da escala:
páginas únicas, sem build, Supabase com o **mesmo login da equipe**.

```
Instagram (post / story / bio)
        │  link  …/?v=atendente-de-gelato-imprensa
        ▼
index.html  ── candidato preenche dados + perguntas + envia o CV
        │      (sem login; só consegue ENVIAR, nunca ler nada)
        ▼
Supabase: tabela candidaturas + bucket privado "cvs"
        │
        ▼
admin.html  ── equipe loga, vê todos já ranqueados por score,
               abre o CV, chama no WhatsApp, muda o status
```

## Páginas

| Arquivo | Link | Quem usa |
|---|---|---|
| `index.html` | `/?v=<id-da-vaga>` (sem `?v` lista as vagas abertas) | candidato (público) |
| `admin.html` | `/admin` | equipe (login) |

## Formulário do candidato (`index.html`): rápido, 1 minuto

O candidato toca no link da bio ou na figurinha do story, e a página abre direto no navegador
do Instagram (sem login nem app). Ele preenche **nome**, **e-mail** e **currículo** (PDF, Word ou
foto, até 5 MB), marca o aceite da LGPD e envia. Os detalhes da vaga ficam num "Sobre a vaga"
recolhido, logo abaixo.

Perguntas extras são **opcionais por vaga** (no editor). Se a vaga tiver perguntas, elas
aparecem no mesmo formulário.

## Painel (`admin.html`)

**Pipeline (quadro estilo Trello, pensado para o computador)**
- Barra lateral com as vagas (e quantos inscritos cada uma tem). Em cima, os números da vaga:
  inscritos, nível A, score médio e quantos chegaram nas últimas 24h.
- **Colunas**: Aplicações → Em validação → Entrevista → Aprovados → **Não qualificados**.
  Quem chega com **nível C ou eliminado** já cai sozinho em *Não qualificados* (marcado como
  "auto"); quem chega com A/B entra em *Aplicações*. **Arraste os cards** entre as colunas.
- Card: iniciais, nome, bairro, **score + nível**, barra de aderência, pontos fortes ou
  motivo da eliminação, há quanto tempo se inscreveu, estrelas, CV e anotação.
- Filtro por nível (A/B/C/Eliminados), busca e ordenação (score, data, sua nota).
- **Painel lateral do candidato**: score com o porquê de cada ponto, **ver currículo** (link
  temporário de 10 min), **WhatsApp** com mensagem pronta (chamar pra conversa / agradecer),
  etapa, **nota em estrelas**, contato, texto com as palavras-chave destacadas e **anotações**.
- **Exportar CSV** (Excel/Sheets) e **excluir candidatura + CV** (pedido LGPD).
- Candidatura nova aparece na hora (realtime).
- Em tela pequena vira uma coluna por vez, com rolagem para o lado.

**Vagas & regras**
- Criar / editar vaga: título, loja, tipo, salário, descrição, benefícios.
- Chave liga/desliga: vaga desligada mostra "vaga encerrada" no link.
- **Divulgar no Instagram**: gera a **arte do feed (4:5)** e do **story (9:16)** com a marca,
  a **legenda pronta** e o **link** pra bio / figurinha de link.

## Criar vagas a partir dos banners

Em **Vagas & regras → Criar a partir de banners**, suba as artes das vagas (uma ou várias).
O painel **lê o texto da imagem** (OCR com Tesseract.js, no próprio navegador) e preenche:
cargo, local, salário, vale-alimentação/transporte, escala, horário, atividades e diferencial.

- Você **confere e corrige** cada campo antes de criar (a leitura pode errar).
- **Banner repetido** (mesma vaga) vira **+1 posição** na mesma vaga, em vez de duplicar.
- As **palavras-chave do currículo** são escolhidas pela função (atendimento, operacional,
  preparo/cozinha) e dá pra ajustar depois em **Regras**.
- Em **Divulgar**, a arte do feed (4:5) e do story (9:16) é feita **com o seu banner**. Uma opção
  (ligada por padrão) troca o rodapé "envie seu currículo para o e-mail" por **"Inscreva-se pelo
  link na bio"**, na mesma cor do rodapé. O story ganha espaço para a figurinha de link.
- O banner também aparece no formulário do candidato, em "Sobre a vaga".

## ✨ Melhorar com IA (anúncio de vaga profissional)

Na conferência dos banners (por vaga, ou **Melhorar todas com IA**) e no editor da vaga, o botão
**✨ Melhorar com IA** manda o **banner + os campos** para o Claude, que devolve um anúncio
completo: resumo, responsabilidades, requisitos, diferenciais, benefícios, jornada e as
**palavras-chave do currículo** dessa função. A IA não inventa salário, benefício nem horário, e
não usa critérios discriminatórios. Você revisa antes de salvar.

A chave da IA **fica no Supabase** (nunca no site). Configuração, uma vez:

1. Crie uma chave em **console.anthropic.com → API Keys** (com créditos em Billing).
2. Supabase → **Edge Functions → Deploy a new function → Via Editor**, com o nome **`vagas-ia`**.
   Cole o conteúdo de [`supabase/functions/vagas-ia/index.ts`](../supabase/functions/vagas-ia/index.ts)
   e clique em **Deploy**. Deixe "Verify JWT" ligado.
3. Supabase → **Edge Functions → Secrets → Add new secret**: nome `ANTHROPIC_API_KEY`, valor = a chave.

Só a equipe logada consegue chamar a função. Cada vaga melhorada custa poucos centavos.

## Por que alguém foi para "Não qualificados"

Abrindo o card, o quadro vermelho no topo explica o motivo: score abaixo do mínimo (com as
palavras que **achou** e as que **faltaram** no currículo), resposta eliminatória, ou arquivo que
**não parece um currículo** (print de tela, foto qualquer, sem experiência, formação ou contato).
Discordou? Mova para **Aplicações**: a pessoa fica lá e não volta sozinha para Não qualificados.

Currículo em **foto** ou **PDF escaneado** também é lido (OCR). Se não der para ler nada, o card
fica como **MANUAL** em Aplicações.

**Uma candidatura por e-mail em cada vaga:** o formulário avisa "você já se candidatou" e o banco
também barra (trigger `candidaturas_unica`). No mesmo celular, a página já abre avisando. Card com
**nome repetido** na mesma vaga ganha uma etiqueta, para pegar quem usou outro e-mail.

## Como funciona o score

O painel **lê o currículo** (PDF e Word, direto no navegador da equipe) e salva o texto em
`cv_text`, uma vez só. Em cima desse texto:

1. **Palavras-chave com pontos** (ex.: `sorvet` 4, `gelat` 4, `cafeteria` 3, `atendimento` 3,
   `caixa` 2…), até um **teto** (padrão 20). Acento não importa, e o começo da palavra pega as
   variações. No painel, o texto do CV aparece com as palavras encontradas destacadas.
2. **Score = pontos ÷ teto × 100**. **A** ≥ 70 · **B** ≥ 40 · **C** abaixo (ajustável por vaga).
3. Se a vaga tiver **perguntas extras**, cada resposta também vale pontos, e respostas ⛔
   eliminam.
4. Enquanto lê, o card mostra **LENDO**. Currículo em **foto/escaneado** não tem texto: fica como
   **MANUAL** em *Aplicações*, para alguém abrir e avaliar.
5. O **telefone** é puxado do próprio currículo para o botão de WhatsApp. Sem telefone, os
   botões viram **e-mail** com a mensagem pronta.

O score é calculado **no painel**: mudou a regra, todo mundo é recalculado, e o candidato não
consegue forjar o próprio score.

> ⚖️ Pontue só o que tem a ver com o trabalho. Idade, gênero, aparência, religião, estado
> civil etc. não podem ser critério: é discriminação proibida por lei.

## Backend (Supabase)

Rode o [`SETUP.sql`](SETUP.sql) **uma vez** no SQL Editor (é idempotente). Ele cria:

- `vagas`: vagas + regras (`questions`, `keywords`, `kw_max`, `thresholds`).
- `candidaturas`: nome, e-mail, CV (+ texto lido), respostas opcionais, status, nota e anotações.
- bucket **privado** `cvs` (5 MB, PDF / imagem / Word) e bucket **público** `banners` (artes das vagas).
- **RLS**: o público só lê vagas ativas, só **insere** candidatura (já como `novo`, sem nota)
  e só **sobe** arquivo na pasta de uma vaga ativa. Ler, avaliar, baixar CV e apagar fica
  restrito à equipe logada (logins de funcionário `@ponto.coquin.app` ficam de fora).

## Como hospedar (link próprio na Vercel)

1. Na Vercel, **New Project** → importe o repositório `coquin`.
2. **Root Directory** = **`vagas`**.
3. Deploy. O link do formulário é a raiz; o painel fica em `/admin`.

Dica: use um domínio curto (ex.: `vagas.coquin.com.br`), que fica melhor na bio do Instagram.
