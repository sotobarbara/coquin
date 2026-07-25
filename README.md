# Coquin — Controle de operação

Controle da operação da Coquin, pensado para o **celular**. Um único `index.html`
(sem build). A Coquin vende **só gelato**, com **preço fixo de R$ 35,00** por unidade.

O controle é por **fechamento do dia** (não venda a venda): no fim do dia você lança
quantos gelatos venderam e concilia com a maquininha **Stone**.

## O que controla

- **Fechamento diário**: total de gelatos + faturamento do dia.
- **Conciliação Stone**: você informa (ou **importa o CSV** da Stone) o quanto entrou por
  **Pix / Débito / Crédito**; o app **deduz o dinheiro** sozinho
  (`dinheiro = faturamento − Stone`) e mostra o split *cartão/Pix × dinheiro*.
- **Check de valor**: alerta quando `gelatos × preço` não bate com o faturamento
  (combo, desconto ou erro de digitação) ou quando a Stone passa do total.
- **Faturamento do mês** por forma de pagamento (Pix, Dinheiro, Débito, Crédito) e **ticket médio**.
- **Meta do mês** de gelatos (padrão **1.200** · **Imprensa**) com **ritmo**, **dias para fechar
  o mês** e **projeção** de fechamento.
- **Histórico** dos fechamentos, com aviso ⚠︎ nos dias que não batem.

## Import do CSV da Stone

O app lê o **relatório de vendas** exportado da Stone (CSV separado por `;`). Ele usa as colunas
`DATA DA VENDA`, `PRODUTO`, `VALOR BRUTO` e `ULTIMO STATUS` (conta só as **Aprovadas**),
agrupa por dia e soma por forma de pagamento. Se o arquivo tiver vários dias, mostra um chip
por dia para você escolher. A quantidade de gelatos vem pré-preenchida com o **piso**
(o que passou no cartão/Pix); basta ajustar para o **total do dia** que o restante vira dinheiro.

## Como usar

1. Abra o `index.html` no navegador do celular.
2. Toque em **+ Fechar o dia** → escolha a data, **Importar CSV da Stone** (ou digite os valores),
   informe o **total de gelatos** do dia e confira a conciliação. Toque em **Salvar fechamento**.
3. Setas **‹ ›** no topo navegam entre os meses.
4. **Ajustes** define a meta de gelatos, a unidade e o **preço do gelato**.
5. **Compartilhar resumo do mês** gera um texto pronto para WhatsApp.

> **Dica (iPhone/Android):** abra o link e use *"Adicionar à Tela de Início"* para virar um ícone de app.

## Status / roadmap

- **Fase 1 (atual)** — fechamento diário + conciliação Stone (dados **locais**, neste aparelho).
- **Fase 2** — **multi-celular** (Supabase) para sincronizar entre aparelhos.
- **Fase 3** — **estoque de coco** (comprado → descascado → vendido → degustação → sobra) com
  detecção de desperdício/perda.

## Personalização

- Padrões: constantes `DEFAULT_GOAL` / `DEFAULT_UNIT` / `DEFAULT_PRICE` no `<script>`
  (meta, unidade e preço também são editáveis em **Ajustes**).
- Cores da marca: variáveis CSS no início do `<style>` (`--green`, etc.).
