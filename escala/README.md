# Coquin — Escala & Ponto

App **independente** (projeto e link próprios, como o `checklist/`) para a **escala da equipe**
e o **controle de ponto** da Coquin. Página única (`index.html`, sem build), pensada para o
**celular**. Funciona com **login da equipe** e sincroniza entre os aparelhos via Supabase;
sem login, funciona local no aparelho.

Cinco abas: **Escala · Ponto · Pedidos · Fechar · Folha** (o funcionário vê só Escala, Ponto e Pedidos —
o **Portal do colaborador**).

---

## Equipe e jornadas

Cada pessoa tem a **própria jornada** (entrada, saída e intervalo) e a **própria escala**
(6x1, 5x2 ou 4x3), cadastradas em *👥 Equipe*. O cadastro inicial é o da Coquin:

| Pessoa | Escala | Jornada | Vínculo | Dá | Folga fixa |
|---|---|---|---|---|---|
| Wagner | 6x1 | 10h–19h (1h de intervalo) | CLT | 8h/dia · **48h/semana** | quarta |
| Paulo | 5x2 | 15h–23h (1h de intervalo) | CLT | 7h/dia · 35h/semana | segunda e quarta |
| Ingrid | 6x1 | 15h–23h (1h de intervalo) | PJ | 7h/dia · 42h/semana | terça |

O app calcula isso na hora de cadastrar e avisa quando a conta passa do limite legal —
a jornada do Wagner fecha **48h por semana**, acima das 44h do art. 58. Ou vira hora extra,
ou a jornada cai para 7h20 (10h–18h20), ou entra uma folga a mais em algumas semanas.
Quem é **PJ fica fora das regras da CLT**: a escala e as horas ficam só como controle da
operação (o app sinaliza isso no cartão de conformidade).

### Folga fixa e semana civil

Cada pessoa pode ter **folga fixa** nos mesmos dias da semana (é o modelo da casa: Wagner
quarta, Paulo segunda e quarta, Ingrid terça). O app repete esses dias todo mês e só mexe
quando a CLT manda: quando chega a vez do **domingo de folga**, ele entra **no lugar** de uma
das folgas fixas da semana — e, se tirar a fixa quebrar o limite de 6 dias seguidos, a semana
fica com as duas (5 dias de trabalho), o que o app explica no cartão de conformidade.

A semana usada é a **civil, de domingo a sábado** — a mesma do DSR e a do calendário que a
loja já usa.

### Cobertura mínima por dia

Padrão lido da operação: **qui, sex e sáb com 3 pessoas**; **dom, seg e ter com 2**;
**qua com 1** (só o turno da tarde/noite). Muda em *⚙︎ Ajustes*.

## Escala (dinâmica, com as regras da CLT)

- **⚡ Gerar**: o app só escolhe **quais dias são de folga** de cada um (a jornada já é a da
  pessoa). Monta o mês inteiro (ou de hoje em diante) em um toque, em dois modos:
  - **⚖️ Equilibrada** — divide horas, folgas e fins de semana por igual entre a equipe.
  - **🎲 Randômica** — sorteia a escala respeitando exatamente as mesmas regras (dá pra
    **sortear de novo** até gostar do resultado; só grava quando você toca em *Aplicar*).
- **Duas visões**: **Grade** (pessoas × dias, com a hora de entrada de cada um) e
  **Folgas** — o calendário do mês com quem folga em cada dia, no formato que vai pro grupo
  da equipe. Toque num dia para editar. Toque numa célula para trocar o turno, marcar **férias**,
  **atestado** ou **falta**, e **travar o dia** (o gerador e as trocas não mexem mais nele).
- **Conformidade CLT**: cartão que confere o mês inteiro e diz o que está ok e o que precisa
  de ajuste, com o artigo de lei de cada regra.
- **Resumo por pessoa**: horas do mês, folgas e **domingos de folga**.
- **Hoje na loja**: quem trabalha, em que horário, quem já bateu o ponto, quem está de folga
  e a **cobertura por faixa de horário** (com jornadas diferentes, 10h–15h pode ter 1 pessoa e
  15h–19h ter 3).

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

## Ponto (com os tipos de pausa)

- **Entrada** em um toque. Depois o botão vira **Registrar saída**: um toque abre a lista e a
  pessoa escolhe **o tipo da saída** — 🍽️ intervalo/almoço, ☕ pausa rápida/lanche, 🚶 saída
  pessoal ou 🏁 fim do expediente — com o **horário já preenchido** (dá para corrigir antes de
  confirmar). Quando volta, o botão vira **Voltar do intervalo**.
- **O tipo muda a conta**: intervalo e saída pessoal são descontados da jornada; a pausa rápida
  conta como tempo trabalhado. A linha do tempo mostra quanto durou cada pausa e se contou.
- A cada marcação sai um **comprovante** com **NSR**, data/hora e identificador
  (Portaria MTP 671/2021).
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

## Portal do colaborador (login individual)

Cada funcionário tem **usuário e senha próprios** e bate o ponto **no próprio celular**:

- **Gerente cria o acesso**: *Equipe* → pessoa → **Acesso ao app** → usuário (ex.: `wagner`) e senha →
  *Criar acesso*. O app mostra o link, o usuário e a senha para mandar pra pessoa.
- **O funcionário entra** com `wagner` + senha e cai no **Portal do colaborador**: bate o **próprio ponto**,
  vê **Meu mês** (horas, extras, saldo), a **escala**, pede **troca de folga** e **envia atestado**
  (foto ou PDF). Troca a própria senha em *Minha conta*.
- **Não dá pra burlar o ponto**: a hora vem do **relógio do servidor** e o banco recusa marcação de
  outra pessoa, de outro dia, com horário diferente do servidor (± 3 min) ou que altere/apague
  marcação antiga (trava `guard_punch` no `SETUP.sql`). A localização vai junto quando o celular permite.
- **Salário e folha ficam só com o gerente**: o funcionário não vê Fechar, Folha, salários nem o ponto
  dos colegas — isso é garantido no banco (RLS), não só na tela. Logins de funcionário também
  **não acessam** vendas/estoque/caixa do app principal.
- **Atestado**: o funcionário anexa a foto/PDF com o período; o gerente vê em **Pedidos**, abre o anexo,
  e ao **aprovar** os dias viram *Atestado* na escala (sem desconto, sem VT). Arquivos num bucket
  privado do Supabase (`atestados`), visíveis só pra pessoa e pro gerente.

**Quem é gerente?** Ao rodar o `SETUP.sql`, todo login que já existe no projeto (ex.: o login da equipe)
vira gerente. Novo gerente depois: `insert into public.app_admins(email) values ('email@dominio.com');`

**No Supabase (uma vez):** *Authentication → Sign In / Providers → Email* → desligue **Confirm email**
(os logins dos funcionários são internos, `usuario@ponto.coquin.app`, e não recebem e-mail). Esqueceu a
senha? Redefina em *Authentication → Users*.

## Folha (pagamento da equipe — CLT e PJ)

Você registra o que aconteceu e o app **já mostra o saldo final** de cada pessoa.

- **Registrar falta**: escolhe a pessoa e o dia → a falta entra na escala (código *Falta*, dia travado)
  e o app mostra na hora **quanto muda o saldo** antes de confirmar. *Atestado* fica registrado
  mas não desconta o salário.
- **+ Lançamento**: hora extra (50% ou 100%), atraso/horas a menos, bônus/comissão, vale
  (dinheiro que a pessoa já pegou) e outros descontos.
- **Horas do ponto**: extras e horas a menos dos dias fechados no ponto entram sozinhas
  (dá pra desligar em *Ajustes da folha*).
- **Holerite** (toque na pessoa): proventos, descontos, líquido, adiantamento, benefícios e o
  **valor a depositar no 5º dia útil**. Marque *adiantamento pago* / *saldo pago*.
- **CSV da folha** para mandar pra contabilidade.

### A conta (exemplo: Wagner, CLT — R$ 2.000, alimentação R$ 400, VT R$ 10,80/dia)

| | |
|---|---|
| Salário base | R$ 2.000,00 |
| INSS 2026 (progressivo) | − R$ 155,69 |
| VT 6% do salário (limitado ao VT do mês) | − R$ 120,00 |
| **Líquido do mês** | R$ 1.724,31 |
| Adiantamento dia 15 (50%) | − R$ 1.000,00 |
| Saldo do salário | R$ 724,31 |
| + Alimentação + VT de dezembro (26 dias úteis × R$ 10,80) | R$ 680,80 |
| **Depositar no 5º dia útil** | **R$ 1.405,11** |

Com **1 falta**: sai R$ 66,67 (salário ÷ 30) e o VT do dia (R$ 10,80); o INSS cai R$ 6,00 →
saldo de **R$ 1.333,65**.

**VT antecipado e dias úteis:** o depósito do 5º dia útil leva o **VT do mês seguinte** — os **dias úteis**
de lá (segunda a sábado, **sem feriados**) menos as **faltas, dias de atestado e férias** deste mês, que já
tinham sido pagos e não foram usados. Ex.: folha de novembro/2026 → VT de dezembro (26 dias úteis, tira
25/12). Atestado e falta têm o campo **quantos dias** (atestado de 3 dias = 3 dias fora do VT seguinte). Feriados nacionais já vêm no app
(inclusive Sexta-feira Santa); os **estaduais/municipais** você coloca em *Ajustes da folha*. Dá pra
trocar para seg–sex ou para os dias da escala.

### Regras usadas

| Regra | Base |
|---|---|
| Dia = salário ÷ 30 · hora = salário ÷ 220 (44h) | CLT, art. 64 |
| Hora extra 50% (100% em domingo/feriado/folga) + DSR sobre extras | CLT, art. 59 · Súmula 172 TST |
| INSS progressivo 2026 (7,5% · 9% · 12% · 14%, teto R$ 8.475,55) | Portaria Interministerial MPS/MF nº 13/2026 |
| IRRF 2026 — zera até R$ 5.000, redução até R$ 7.350 | Lei 15.270/2025 |
| Desconto do VT até 6% do salário-base | Lei 7.418/1985 · Decreto 10.854/2021 |
| Saldo até o 5º dia útil (seg. a sáb., fora feriados nacionais) | CLT, art. 459, §1º |
| Falta pode tirar o DSR da semana (**desligado** por padrão) | Lei 605/1949, art. 6º |
| FGTS 8% — custo da empresa, não sai do salário | Lei 8.036/1990 |

**PJ**: sem INSS, IRRF, desconto de VT, DSR e FGTS — falta desconta o dia (valor ÷ 30) e hora
extra é paga pelo valor da hora (adicional configurável). Tudo isso muda em **Ajustes da folha**
(dia e % do adiantamento, divisor, adicionais, tabela do INSS, alimentação descontar na falta,
benefícios no depósito…). Salário, alimentação, VT/dia, % de adiantamento e dependentes ficam
no cadastro da pessoa (*Equipe* ou *Salário e benefícios* no holerite).

> É uma conta de controle da casa — confira com a contabilidade antes da folha oficial
> (convenção coletiva, pensão, insalubridade etc. não entram).

## Backend (Supabase)

Tabelas próprias: `shift_employees`, `shift_schedule`, `shift_swaps`, `time_punches`,
`payroll_entries`, `payroll_people` (salários), `absence_docs` (atestados), `app_admins` e `shift_config`,
mais o bucket privado `atestados` — **não toca** em vendas, estoque, caixa ou checklist. Por padrão aponta para o
**mesmo projeto Supabase** da equipe (mesmo login).

- Rode o [`SETUP.sql`](SETUP.sql) **uma vez** (e de novo depois desta versão, para criar a folha) no **SQL Editor** do Supabase (cria as tabelas,
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

- **Equipe inicial**: constante `SEED_TEAM` (nome, escala, jornada, intervalo, vínculo).
- **Escalas**: `SCALES` (6x1, 5x2, 4x3 — quantos dias de trabalho por semana).
- **Tipos de pausa do ponto**: `PAUSES` (o que conta e o que não conta na jornada).
- **Mínimo de gente por dia da semana**: `DEFAULT_DEMAND`.
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
