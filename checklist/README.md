# Coquin — Checklist operacional

App **independente** (projeto e link próprios, separados do controle de vendas/estoque) para a
**rotina diária** da Coquin. Página única (`index.html`, sem build), pensada para o **celular**.
Funciona com **login da equipe** e **sincroniza entre celulares** via Supabase; sem login,
funciona local no aparelho.

## O que faz

Checklist **por dia**, com dois turnos independentes:

- **🌅 Entrada** (abertura) e **🌙 Saída** (fechamento). A tela já abre no turno certo pela
  **hora do dia** (antes das 15h = entrada).
- **Responsável do dia**: quem for fazer **escolhe o próprio nome** (Ionnara, Ingrid ou Paulo).
  Cada turno tem seu responsável — quem abre pode ser diferente de quem fecha. Fica registrado
  **quem assinou** e **a que horas** concluiu.
- **Tarefas com um toque** (check animado + risco). **Anel de progresso** por turno e **barra**
  "X de Y tarefas".
- **Medições, não só ✓**: temperatura do **gelato** e do **freezer** registram o **valor em °C**
  com um **termômetro visual** — o ponteiro cai na **zona verde** (ideal) ou vai pro **vermelho**,
  com frase didática ("ponto ideal para bolear", "mole demais", "muito duro"). **Desperdício** e
  **sobra de coco** viram **número**.
  - Faixa do **gelato** (ponto de bolear): **-15 a -12 °C**. Faixa do **freezer**: **-30 a -18 °C**.
    Ajuste em `CHECKLISTS` (`min`/`max`) se seu equipamento pedir outra.
- **Ocorrências do dia**: campo de observação por turno (ex.: "freezer oscilando").
- **Cada turno é opcional** — dá pra marcar só a entrada, só a saída, ou os dois.
- **Histórico do mês**: por dia, mostra entrada e saída, quem foi o responsável, se ficou
  **concluído** ou **parcial**, e um **⚠** quando houve temperatura fora da faixa.

### Análise (aba no topo)

Painel sobre o histórico do mês selecionado:

- **Cumprimento**: % de turnos iniciados que foram concluídos 100% (entrada e saída).
- **Destaques**: sequência de dias 🔥, **alertas de temperatura**, **horário médio** de
  abertura/fechamento, e **soma de desperdício/sobra** do mês.
- **Tarefas mais puladas**: ranking das tarefas que mais ficam pendentes — onde a operação falha.
- **Participação da equipe**: turnos concluídos por pessoa.

As **faixas de temperatura** e as tarefas ficam nas constantes `CHECKLISTS` (no `<script>`) —
ajuste os valores `min`/`max` de `temp_gel` e `temp_frz` para os do seu equipamento.

### Tarefas

**Entrada:** organizar e limpar o ponto · temperatura do gelato · quantidade e qualidade dos
cocos · repor descartáveis · repor acompanhamentos e caldas · partir cocos para repor água.

**Saída:** lavar utensílios (garrafas, bowls, colheres) · enxugar · guardar descartáveis ·
estoque de descartáveis · estoque de acompanhamentos · caldas · limpeza do local · temperatura
do freezer · contar desperdício · sobra de coco · armazenamento · bateria das maquinetas.

## Backend (Supabase)

Usa uma tabela própria `checklists` — **não toca** em vendas, estoque ou caixa. Por padrão
aponta para o **mesmo projeto Supabase** da equipe (mesmo login, sem backend novo pra configurar).

- Rode o [`SETUP.sql`](SETUP.sql) **uma vez** no **SQL Editor** do Supabase (cria a tabela,
  liga RLS e o realtime). É idempotente.
- Quer um backend 100% separado? Crie outro projeto no Supabase, rode o `SETUP.sql` nele e troque
  `SUPABASE_URL` / `SUPABASE_ANON` no topo do `<script>` do `index.html`.

## Como hospedar (link próprio na Vercel)

É um projeto separado, dentro da mesma pasta do repositório (`checklist/`):

1. Na Vercel, **New Project** → importe o mesmo repositório `coquin`.
2. Em **Root Directory**, selecione **`checklist`**.
3. Deploy. Vai gerar **outro link**, independente do app de controle.

No celular, use *"Adicionar à Tela de Início"* para virar um app.

## Personalização (no código)

- **Equipe**: constante `TEAM` (nomes e cores dos avatares).
- **Tarefas**: constante `CHECKLISTS` (listas de `entrada` e `saida`).
- **Supabase**: `SUPABASE_URL` / `SUPABASE_ANON` no topo do `<script>`.
- **Cores da marca**: variáveis CSS no início do `<style>` (`--green`, etc.).
