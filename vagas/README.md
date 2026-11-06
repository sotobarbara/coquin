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

## Formulário do candidato (`index.html`)

- Nome, **WhatsApp** (máscara BR), e-mail, bairro/cidade.
- **Currículo**: PDF, foto ou Word, até 5 MB (obrigatório ou opcional, você escolhe na vaga).
- **Perguntas da vaga** (botões de toque, rápido no celular), definidas no painel.
- "Conte sobre você" (texto livre, onde entram as palavras-chave).
- Consentimento **LGPD** obrigatório + campo-isca anti-robô.

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

## Como funciona o score

Cada vaga tem as próprias regras, editáveis no painel:

1. **Perguntas com pontos por resposta.** Ex.: "Experiência com atendimento": nunca = 0,
   menos de 6 meses = 2, 6m a 2 anos = 4, mais de 2 anos = 5.
   Perguntas de várias escolhas somam os pontos marcados, até um **teto**.
2. **Eliminatórias ⛔**: respostas que tiram o candidato da disputa (ex.: não topa escala com
   fim de semana). Ele continua visível, mas como **Eliminado**, no fim da lista.
3. **Palavras-chave** no texto livre (ex.: `sorvet`, `acai`, `cafeteria`, `atendimento`),
   com teto de pontos. Acento não importa, e o começo da palavra pega as variações.
4. **Score = pontos obtidos ÷ pontos possíveis × 100.**
   **A** ≥ 75 · **B** ≥ 50 · **C** abaixo (os cortes podem ser ajustados por vaga).

O score é calculado **no painel**, não no envio. Então mudar uma regra **recalcula todo
mundo**, inclusive quem já se inscreveu, e o candidato não tem como forjar o próprio score.

A vaga nova já vem com o **modelo Coquin – atendente de gelato** (dias e turnos, experiência
com atendimento e com food, caixa, escala 6x1, distância, início, 18+). É só ajustar.

> ⚖️ Pontue só o que tem a ver com o trabalho. Idade, gênero, aparência, religião, estado
> civil etc. não podem ser critério: é discriminação proibida por lei.

## Backend (Supabase)

Rode o [`SETUP.sql`](SETUP.sql) **uma vez** no SQL Editor (é idempotente). Ele cria:

- `vagas`: vagas + regras (`questions`, `keywords`, `kw_max`, `thresholds`).
- `candidaturas`: respostas, CV, status, nota e anotações.
- bucket **privado** `cvs` (5 MB, PDF / imagem / Word).
- **RLS**: o público só lê vagas ativas, só **insere** candidatura (já como `novo`, sem nota)
  e só **sobe** arquivo na pasta de uma vaga ativa. Ler, avaliar, baixar CV e apagar fica
  restrito à equipe logada (logins de funcionário `@ponto.coquin.app` ficam de fora).

## Como hospedar (link próprio na Vercel)

1. Na Vercel, **New Project** → importe o repositório `coquin`.
2. **Root Directory** = **`vagas`**.
3. Deploy. O link do formulário é a raiz; o painel fica em `/admin`.

Dica: use um domínio curto (ex.: `vagas.coquin.com.br`), que fica melhor na bio do Instagram.
