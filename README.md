# Coquin — Controle de Vendas

Controle de vendas **bem básico** da Coquin, pensado para usar no **celular**.
Um único `index.html` — funciona **offline** e os dados ficam salvos **só no aparelho**
(nada vai para a internet).

A Coquin vende **só gelato**, com **preço fixo de R$ 35,00** por unidade — então a venda é
só escolher **quantos gelatos** e a **forma de pagamento**; o valor é calculado sozinho.

## O que controla

- **Faturamento do mês** e a divisão por forma de pagamento: **Pix, Dinheiro, Débito e Crédito**.
- **Gelatos vendidos** no mês e no dia.
- **Meta do mês** de gelatos (começa em **1.200** para a **Imprensa**) com barra de progresso,
  indicador de **ritmo** (à frente / no ritmo / atrás), **dias restantes para fechar o mês** e
  **projeção** de quantos gelatos vai fechar no ritmo atual.
- **Histórico por dia**: vendas agrupadas por data, com subtotal e nº de gelatos de cada dia.

## Como usar

1. Abra o `index.html` no navegador do celular.
2. Toque em **+ Nova venda**, escolha **quantos gelatos** (botões rápidos 1/2/3/5/10 ou +/−) e a
   **forma de pagamento**. O total (qtd × R$ 35) aparece na hora. Toque em **Registrar venda**.
3. Use as setas **‹ ›** no topo para navegar entre os meses.
4. **Editar meta** ajusta a meta de gelatos, o nome da unidade e o **preço do gelato**.
5. **Compartilhar resumo do mês** gera um texto pronto para WhatsApp.

> **Dica (iPhone/Android):** abra o link no navegador e use *"Adicionar à Tela de Início"*
> para virar um ícone de app.

## Personalização

- Meta, unidade e preço padrão: constantes `DEFAULT_GOAL` / `DEFAULT_UNIT` / `DEFAULT_PRICE`
  no `<script>` (o preço também é editável direto no app, em **Editar meta**).
- Cores da marca: variáveis CSS no início do `<style>` (`--green`, etc.).
