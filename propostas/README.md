# Coquin · Gerador de propostas de evento

App próprio (Root Directory = `propostas` na Vercel; o formulário público fica em `/orcamento`), página única sem build, no mesmo padrão
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

## Formulário do cliente (`/orcamento`)

Link público (mesmo visual do Portal de Vagas) para mandar no WhatsApp ou pôr na bio do Instagram.
O cliente responde tipo de evento, convidados, data, local/região, quem paga o gelato (open ou
os convidados compram), tempo de serviço, adicionais e contato, e vê **na hora uma
pré-proposta**: o que está incluso, o investimento estimado e o aviso de que **data e valores
são confirmados e negociados com o comercial**, com botão para o WhatsApp comercial já com o
número do pedido (#XXXXX) e o resumo.

- **Valor na pré-proposta** (Ajustes): *faixa* (padrão, ex.: R$ 3.150 a R$ 3.850), *exato* ou
  *não mostrar*. A ressalva também é editável.
- Os preços usados são os do gerador, e só vão para o formulário **depois de "Pronto,
  revisei"** com login. Até lá o formulário funciona, mas não mostra valor.
- Custos internos nunca vão para o formulário.
- O pedido cai na aba **Pedidos** do gerador (com aviso na hora), onde **Gerar proposta**
  monta a proposta completa a partir das respostas.

## Login e Supabase

1. Rode o [`SETUP.sql`](SETUP.sql) **uma vez** no SQL Editor do Supabase (mesmo projeto dos
   outros apps). Cria `propostas_config`, `propostas_pedidos` e `propostas`.
2. Entre no gerador com o **login da equipe**. Sem login ele continua funcionando só no
   aparelho, mas sem pedidos do site e sem publicar preços.

## Como o preço é calculado

| Item | Regra |
|---|---|
| Gelato | convidados × gelatos por convidado × preço do tamanho (**3 bolas R$ 35 · 2 bolas R$ 30**) |
| Equipe | **R$ 150 de diária por pessoa**, mínimo 2 pessoas (R$ 300); +1 pessoa a cada N convidados |
| Deslocamento | **R$ 1 por km** saindo do Centro (Rua Dom Joaquim, 33), ida e volta. A distância sai do endereço do evento (busca: Photon/OpenStreetMap; rota de carro: OSRM; se a rota falhar, linha reta × 1,3) |
| Venda no local | o contratante paga equipe + deslocamento (+ taxa extra opcional); convidados compram o gelato |
| Valor mínimo | **R$ 4.000** por evento (fds ~400 gelatos, dia fraco ~150). Abaixo disso entra "Complemento para o valor mínimo"; no formulário o cliente vê "Eventos a partir de R$ 4.000" |
| Opcionais | hora extra, desconto por volume, adicionais (zerados ou vazios por padrão) |

## Ajustes (revise antes de usar)

Os valores padrão são **exemplos**, exceto o preço do gelato (R$ 35) e água/refri (R$ 4/7):
faixas de volume, valor mínimo, taxa de presença, horas inclusas, hora extra, atendentes por
convidado, taxas de deslocamento, adicionais, sinal, validade, textos de "incluso" e
"condições", e custos internos. Tudo editável na aba **Ajustes**.

## Onde ficam os dados

Com login, no **Supabase** (sincroniza entre os aparelhos da equipe) e uma cópia no aparelho.
Sem login, só no aparelho (localStorage); *Ajustes → Exportar/Importar backup* para levar a
outro aparelho. O link enviado ao cliente leva os dados da proposta no próprio
endereço (`#p=…`), então abre sem login e não depende de servidor.
