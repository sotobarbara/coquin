# Coquin — Controle de operação

App **mobile** de controle da Coquin (vende **gelato**, preço fixo **R$ 35**). Página única
(`index.html`, sem build), hospedada na Vercel. Funciona com **login da equipe** e
**sincroniza entre celulares** via Supabase; sem login, funciona local no aparelho.

O controle é por **fechamento do dia** (não venda a venda) e tem 3 abas: **Vendas**,
**Estoque** e **Dados**.

---

## Vendas (fechamento diário + Stone)

- **Fechar o dia**: total de **gelatos** vendidos + **faturamento** do dia.
- **Conciliação Stone**: informe (ou **importe o CSV** da Stone) o que entrou por
  **Pix / Débito / Crédito**. O app **deduz o dinheiro** sozinho
  (`dinheiro = faturamento − Stone`) e mostra o split *cartão/Pix × dinheiro*.
- **Check de valor**: alerta quando `gelatos × preço` não bate com o faturamento
  (combo, desconto ou erro) ou quando a Stone passa do total.
- **Import do CSV da Stone** (relatório de vendas, separado por `;`): usa as colunas
  `DATA DA VENDA`, `PRODUTO`, `VALOR BRUTO`, `VALOR LIQUIDO` e `ULTIMO STATUS`
  (conta só **Aprovadas**). Agrupa por dia, soma por forma de pagamento, guarda o
  **fluxo por hora** e a **taxa da Stone** (bruto − líquido). Arquivo com vários dias →
  botão **"Lançar/atualizar os N dias"** (cria os que faltam e atualiza os existentes).
- **Detalhe do dia** (toque num dia): pagamentos, split cartão/dinheiro e insumos consumidos.
  Toque no **lápis** para editar direto.

> A conciliação de **vendas** usa o **VALOR BRUTO** (o que o cliente pagou = 1 gelato),
> então bate com as vendas. A **taxa** de crédito/débito é tratada como **custo à parte**.

## Estoque (2 produtos)

Toggle **Coco | Sorvete**. Rendimento: **1 coco = 2 gelatos**, **1 caixa (10L) = 25 gelatos**.

- **Registrar** compras (com **custo por unidade**) e baixas: **degustação**, **treinamento**
  e **perda** — sempre na unidade do produto (cocos/caixas).
- **Consumo automático** pelas vendas: `consumo = gelatos ÷ rendimento`.
- **Saldo tipo livro-caixa** por produto + **autonomia** (dias de estoque) e **alertas**
  (baixo/crítico).
- **📸 Contagem física**: calcula a **quebra** (teórico − contado) e **ancora** o saldo no
  contado (a contagem vira a verdade dali pra frente). Pega desperdício/desvio automático.

## Caixa (contas a pagar e receber)

- **Entrada automática das vendas**: o faturamento do mês (soma dos fechamentos) já entra
  como entrada — não precisa lançar. Entrada manual fica só pra casos pontuais (evento, aporte).
- **Situação** de cada lançamento: **Pago/Recebido** (realizado) ou **A pagar/A receber**
  (pendente) com **vencimento**.
- **A pagar / A receber**: listas ordenadas por vencimento, com **chip** (atrasado / vence essa
  semana) e botão **✓** pra marcar como pago/recebido num toque.
- **Alerta** no topo: contas **atrasadas** e as que **vencem essa semana** (soma em R$).
- **Saídas pagas por categoria** (toque pra ver cada lançamento) e lista de todas as movimentações.
- Só o que está **pago/recebido** entra no **Resultado do caixa** e no **lucro (DRE)**;
  pendências ficam de fora até serem quitadas.

## Dados (dashboard)

- **Destaques**: melhor **dia da semana**, **pico de horário**, **margem/lucro**, ticket,
  estoque, e **comparativo vs mês passado**.
- **KPIs**: faturamento, gelatos (% meta), **lucro estimado** (margem líquida), ticket, quebra.
- **Mini-DRE**: `faturamento − insumos − taxa Stone = lucro estimado` + **recebido líquido na conta**.
- **Gráficos** (SVG, com **tooltip** ao tocar): faturamento por dia, **rende mais por dia da
  semana**, **pico de vendas por hora** (do CSV da Stone), **formas de pagamento** (donut) e
  **estoque de coco no mês**. Paleta testada para daltonismo.

## Metas

Meta mensal de gelatos (padrão **1.200 · Imprensa**) com **ritmo**, **dias para fechar o mês**
e **projeção** de fechamento.

---

## Ajustes

Botão **Ajustes** (card verde de Vendas): unidade/loja, **meta**, **preço do gelato** e
**custo planejado do coco**. Login/sincronia: card de conta (sincronizando / sair).

## Backend (Supabase)

Tabelas: `closings` (fechamentos), `stock` (estoque por produto) e `app_settings` (1 linha).
Segurança por **RLS + login** (a `anon key` é pública por design; só quem loga lê/escreve).
Realtime liga a sincronia entre celulares.

O **SQL de setup** está em [`SETUP.sql`](SETUP.sql) — rode uma vez no **SQL Editor** do Supabase.

## Como hospedar

Site estático: qualquer host serve o `index.html`. Neste projeto, deploy automático pela
**Vercel** a cada push. No celular, use *"Adicionar à Tela de Início"* para virar um app.

## Personalização (no código)

- Produtos e rendimento: `PRODUCTS` no `<script>` (coco = 2, sorvete = 25 gelatos/unidade).
- Padrões: `DEFAULT_GOAL` / `DEFAULT_UNIT` / `DEFAULT_PRICE` / `DEFAULT_COST`.
- Config do Supabase: `SUPABASE_URL` / `SUPABASE_ANON` no topo do `<script>`.
- Cores da marca: variáveis CSS no início do `<style>` (`--green`, cores das formas de pagamento…).
