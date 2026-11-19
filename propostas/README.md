# Coquin · Gerador de propostas de evento

App próprio (Root Directory = `propostas` na Vercel), página única sem build, no mesmo padrão
dos outros apps. Feito para responder rápido os pedidos de evento (casamento, casamento íntimo,
aniversário, 15 anos, corporativo, formatura).

## Como usar

1. **Cole a mensagem do cliente** no card "Colar o pedido" e toque em *Preencher*: o app puxa
   tipo de evento, nº de convidados, data, horário, local, telefone e a região (Fortaleza,
   região metropolitana ou litoral).
2. Confira os campos e escolha o **formato**:
   - **Open (por convidado)**: gelatos = convidados × gelatos por convidado.
   - **Pacote fechado**: quantidade fixa de gelatos.
   - **Venda no local**: convidados compram a R$ 35; o contratante paga só a taxa de presença.
3. Marque os **adicionais** e, se for o caso, um **desconto**.
4. Envie: **PDF** (A4, com capa e foto), **Texto p/ WhatsApp** (resumo pronto para colar) ou
   **Link** (o cliente abre a proposta no celular, com botão "Quero reservar" que abre o
   WhatsApp da Coquin).

A proposta é montada sozinha: preço com **desconto por volume**, **valor mínimo** para eventos
pequenos, **atendentes** sugeridos pelo nº de convidados, **horas extras** além das inclusas,
**deslocamento** por região, total e **valor por convidado**. O card escuro "Só para a Coquin"
mostra quantos cocos/caixas levar e, com os custos cadastrados, o lucro e a margem.

**Propostas**: histórico com status (rascunho, enviada, aprovada, recusada), busca, duplicar
(ótimo para eventos parecidos), atalho para o WhatsApp do cliente e indicadores (em aberto,
fechado, taxa de fechamento).

## Ajustes (revise antes de usar)

Os valores padrão são **exemplos**, exceto o preço do gelato (R$ 35) e água/refri (R$ 4/7):
faixas de volume, valor mínimo, taxa de presença, horas inclusas, hora extra, atendentes por
convidado, taxas de deslocamento, adicionais, sinal, validade, textos de "incluso" e
"condições", e custos internos. Tudo editável na aba **Ajustes**.

## Onde ficam os dados

No **próprio aparelho** (localStorage). Use *Ajustes → Exportar/Importar backup* para guardar
ou levar para outro aparelho. O link enviado ao cliente leva os dados da proposta no próprio
endereço (`#p=…`), então abre sem login e não depende de servidor.
