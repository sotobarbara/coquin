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

## Portal de Vagas Coquin (`index.html`): o que o candidato vê

- **Página inicial** (link da bio): "Portal de Vagas Coquin", com hero "Vem fazer parte do nosso
  time!", busca, a lista de **vagas disponíveis** (local, escala, tipo e um resumo), o quadro
  **Como funciona?** e as seções **Nossa cultura**, **Benefícios** e **Dúvidas**.
- **Página da vaga** (`?v=id`): título, local, escala, horário, salário e nº de vagas no topo; à
  esquerda o formulário **Candidate-se** (nome, e-mail e currículo, em 1 minuto); à direita
  **Sobre a vaga** (com títulos e listas), **Benefícios e condições** e o banner.
- Usa a **logo oficial** (`logo-coquin-oficial.png`) e a foto da capa (`capa-foto.webp`, da arte "Faça parte do nosso time!").
  Cores: areia + verde oliva da logo (`#3D5842`). Fonte: Outfit.
- Perguntas extras aparecem no formulário só se a vaga tiver.

## Painel (`admin.html`)

**Pipeline (quadro estilo Trello, pensado para o computador)**
- Barra lateral com as vagas (e quantos inscritos cada uma tem). Em cima, os números da vaga:
  inscritos, nível A, score médio e quantos chegaram nas últimas 24h.
- **Colunas**: Aplicações → Em validação → Entrevista → Aprovados → **Não qualificados**.
  Quem chega com **nível C ou eliminado** já cai sozinho em *Não qualificados* (marcado como
  "auto"); quem chega com A/B entra em *Aplicações*. **Arraste os cards** entre as colunas.
- Card: iniciais, nome, bairro, **score + nível**, barra de aderência, pontos fortes ou
  motivo da eliminação, há quanto tempo se inscreveu, estrelas, CV e anotação.
- **Etapas novas** (ex.: *Em treinamento*): botão **+ Nova etapa** no fim do quadro. A etapa entra
  antes de *Não qualificados* e vale para todas as vagas. No **⋯** da coluna dá para renomear, mudar
  de lugar ou remover (quem estava nela volta para *Aplicações*). Fica salva na tabela `vagas_config`
  (rode o `SETUP.sql` atualizado uma vez).
- Filtro por nível (A/B/C/Eliminados), busca e ordenação (score, data, sua nota).
- **Busca dentro dos currículos:** digite uma palavra (ex.: `coco`) e o quadro mostra só quem tem ela
  no currículo, com o **trecho** destacado no card e todos os trechos no painel do candidato. Acento
  não importa e o começo da palavra pega as variações (coco → cocos); várias palavras = todas precisam aparecer.
- **Painel lateral do candidato**: score com o porquê de cada ponto, **ver currículo** (link
  temporário de 10 min), **WhatsApp** com mensagem pronta (chamar pra conversa / agradecer),
  etapa, **nota em estrelas**, contato, texto com as palavras-chave destacadas e **anotações**.
- **Agradecer quem não passou:** em *Não qualificados*, o painel do candidato mostra **Agradecer por
  e-mail / WhatsApp** (no lugar do convite) e cada card tem o botão **Agradecer**. No topo da coluna,
  **Agradecer todos** abre o Gmail (ou o app de e-mail) com a mensagem pronta e os endereços em Cco,
  em lotes de 50. Quem já recebeu fica marcado como **✓ agradecido** (`agradecido_em`).
- **Exportar CSV** (Excel/Sheets) e **excluir candidatura + CV** (pedido LGPD).
- Candidatura nova aparece na hora (realtime).
- **Por que foi qualificado:** no card, as palavras que pontuaram (✓ sorveteria, ✓ atendimento…);
  no painel do candidato, um quadro verde com o score x mínimo, cada palavra encontrada com os
  pontos, **o trecho do currículo onde ela aparece** e o que não apareceu.
- **Volume:** carrega as candidaturas em páginas de 1.000 (limite da API do Supabase), mostra 60
  cards por coluna com **"Mostrar mais"** e um aviso "Lendo currículos: X de Y" enquanto lê os novos.
  Testado com 1.500 candidaturas.
- **Foto do candidato:** se o currículo (PDF ou Word) tiver foto 3x4, ela vira o avatar do card.
  O painel escolhe a imagem com formato de retrato e tons de pele (descarta logos e ícones) e
  guarda uma miniatura em `cv_photo`. Sem foto, fica o avatar com as iniciais. Pegou a imagem
  errada? No painel do candidato tem **"Remover foto"**.
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

## Divulgação: Jooble e páginas de vagas no Instagram

- **Jooble (automático):** `https://vagas.coquin.com.br/jooble.xml` é um feed XML gerado na hora
  (função `api/jooble.js` na Vercel) com **todas as vagas ativas**. Cadastre o link uma vez no
  Jooble (Para empregadores → feed XML) e ele passa a puxar as vagas sozinho. Desligou a vaga, ela sai.
- **Páginas de vagas no Instagram:** no **Divulgar** de cada vaga há a mensagem pronta para DM,
  a arte para baixar e uma lista dos perfis de páginas de vagas que vocês usam, com o botão
  **Abrir DM**. A lista fica salva no navegador de quem cadastrou.

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
