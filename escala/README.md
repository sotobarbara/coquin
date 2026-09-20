# Coquin — Escala & Ponto

App **independente** (projeto e link próprios, como o `checklist/`) para a **escala da equipe**
e o **controle de ponto** da Coquin. Página única (`index.html`, sem build), pensada para o
**celular**. Funciona com **login da equipe** e sincroniza entre os aparelhos via Supabase;
sem login, funciona local no aparelho.

Quatro abas: **Escala · Ponto · Trocas · Fechar**.

---

## Escala (dinâmica, com as regras da CLT)

- **⚡ Gerar**: monta o mês inteiro (ou de hoje em diante) em um toque, em dois modos:
  - **⚖️ Equilibrada** — divide horas, folgas e fins de semana por igual entre a equipe.
  - **🎲 Randômica** — sorteia a escala respeitando exatamente as mesmas regras (dá pra
    **sortear de novo** até gostar do resultado; só grava quando você toca em *Aplicar*).
- **Grade do mês**: pessoas × dias, com o turno de cada um (**M** manhã, **T** tarde,
  **I** integral) e as folgas. Toque numa célula para trocar o turno, marcar **férias**,
  **atestado** ou **falta**, e **travar o dia** (o gerador e as trocas não mexem mais nele).
- **Conformidade CLT**: cartão que confere o mês inteiro e diz o que está ok e o que precisa
  de ajuste, com o artigo de lei de cada regra.
- **Resumo por pessoa**: horas do mês, folgas e **domingos de folga**.
- **Hoje na loja**: quem trabalha, em que turno, quem já bateu o ponto e quem está de folga.

### Regras aplicadas (e onde elas estão na lei)

| Regra | Base legal |
|---|---|
| 8h por dia e **44h por semana** | CLT, art. 58 |
| No máximo **2h extras** por dia | CLT, art. 59 |
| **11h** entre o fim de uma jornada e o início da outra | CLT, art. 66 |
| **Folga semanal (DSR)** de 24h, preferencialmente aos domingos | CLT, art. 67 · Lei 605/1949 |
| Intervalo de 1h (jornada > 6h) / 15 min (4h a 6h) | CLT, art. 71 |
| **Domingo de folga** ao menos uma vez a cada **3 semanas** (comércio) | Lei 10.101/2000, art. 6º, parágrafo único |
| Tolerância de 5 min por marcação e **10 min no dia** | CLT, art. 58, §1º |
| Comprovante de marcação (NSR) do ponto por aplicativo (REP-P) | Portaria MTP 671/2021 |

Tudo isso é **configurável** em *⚙︎ Ajustes da escala* (horários dos turnos, quantas pessoas
por turno em cada dia da semana, horas por semana, máximo de dias seguidos, periodicidade do
domingo de folga, interjornada e tolerância).

## Trocas de folga (recalcula sozinho)

O funcionário pede: *"quero trocar a folga de X por Y"*. O app:

1. Procura uma **troca direta** — um colega que folga no dia Y e trabalha no dia X. Os dois
   trocam de folga, a cobertura do dia fica igualzinha e ninguém perde folga.
2. Se não houver, escolhe **quem pode cobrir** o turno sem ferir a CLT e devolve a folga dessa
   pessoa nos dias seguintes.
3. **Recalcula os próximos dias** (folga semanal, 6 dias seguidos, domingos, cobertura mínima)
   e mostra **exatamente o que muda**, dia a dia, antes de confirmar — com o motivo de cada
   mudança.
4. **Bloqueia o que é ilegal**: se a troca deixaria alguém sem folga na semana, o app explica
   (art. 67) e sugere a janela de dias em que a troca cabe.

O pedido pode ser **enviado para aprovação** (fica pendente, com selo na aba) ou **aprovado na
hora**. Na aprovação o recálculo é refeito com a escala mais atual.

## Ponto

- **Bater ponto** em um toque: entrada → saída para intervalo → volta → saída. A cada toque
  sai um **comprovante** com **NSR**, data/hora e identificador (Portaria MTP 671/2021).
- Mostra a **escala do dia** de quem está batendo, o total trabalhado **ao vivo** e o **saldo
  do dia** (com a tolerância legal de 10 min).
- **Senha do ponto** por pessoa (opcional) e **localização** da marcação (quando o celular
  permite).
- **Equipe hoje**: quem entrou, quem saiu, quem faltou.
- **Meu mês**: horas trabalhadas × previstas, banco de horas, extras, faltas e atrasos.

## Fechar (fechamento do mês)

- KPIs do mês: horas trabalhadas, **horas extras**, faltas e **saldo do banco de horas** da equipe.
- Lista por pessoa e **espelho de ponto** dia a dia (toque na pessoa) — com **correção de
  marcação** com justificativa (fica registrada como *ajuste*).
- Alerta de **marcações em aberto** antes de fechar a folha.
- **Exportação em CSV**: resumo do mês e espelho de ponto completo (abre no Excel/Sheets e vai
  direto pra folha).

## Backend (Supabase)

Tabelas próprias: `shift_employees`, `shift_schedule`, `shift_swaps`, `time_punches` e
`shift_config` — **não toca** em vendas, estoque, caixa ou checklist. Por padrão aponta para o
**mesmo projeto Supabase** da equipe (mesmo login).

- Rode o [`SETUP.sql`](SETUP.sql) **uma vez** no **SQL Editor** do Supabase (cria as tabelas,
  liga RLS e o realtime). É idempotente.
- Backend 100% separado? Crie outro projeto no Supabase, rode o `SETUP.sql` nele e troque
  `SUPABASE_URL` / `SUPABASE_ANON` no topo do `<script>` do `index.html`.

## Como hospedar (link próprio na Vercel)

Projeto separado dentro da mesma pasta do repositório (`escala/`):

1. Na Vercel, **New Project** → importe o mesmo repositório `coquin`.
2. Em **Root Directory**, selecione **`escala`**.
3. Deploy. Vai gerar **outro link**, independente do controle e do checklist.

No celular, use *"Adicionar à Tela de Início"* para virar um app.

> **Ver funcionando sem cadastrar nada:** abra o link com `?demo=1` (ex.:
> `…vercel.app/?demo=1`). Ele gera uma escala de exemplo, marcações de ponto do mês e um
> pedido de troca pendente — tudo **só no aparelho**, sem subir nada pra nuvem.

## Personalização (no código)

- **Equipe inicial**: constante `SEED_TEAM` (mesma do checklist; depois edite em *👥 Equipe*).
- **Turnos**: `DEFAULT_SHIFTS` (código, nome, entrada, saída, intervalo, cor).
- **Cobertura por dia da semana**: `DEFAULT_DEMAND`.
- **Regras**: `DEFAULT_RULES` (44h, 6 dias seguidos, domingo a cada 3 semanas, 11h, tolerância).
- **Supabase**: `SUPABASE_URL` / `SUPABASE_ANON` no topo do `<script>`.
- **Cores da marca**: variáveis CSS no início do `<style>` (`--green`, `--gold`, etc.).

## Referências de mercado

O padrão de *escala automática + troca de turno com aprovação + ponto* segue o que fazem
**Deputy** (Auto-Scheduling), **7shifts** e **Sling** (escala para restaurantes com troca de
turno), **When I Work**, **Homebase** e **Connecteam** lá fora; e **Pontomais**, **Tangerino
(Sólides)**, **Ahgora** e **Oitchau** no Brasil (ponto por app com comprovante, espelho de
ponto e banco de horas conforme a Portaria 671/2021). Este app faz o recorte que a Coquin
precisa, sem mensalidade por funcionário.
