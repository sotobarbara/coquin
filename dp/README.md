# Coquin — Departamento Pessoal

App **independente** (link próprio, como `escala/` e `checklist/`) para o DP da Coquin: **folha automática,
hora extra, VT/VA, adiantamento, férias, 13º, rescisão e FGTS**, com **recibos impressos com a logo da empresa**
(2 vias por folha A4, valor por extenso e assinatura). Página única (`index.html`) + motor de cálculo (`calc.js`),
sem build. Funciona sem login (salva no aparelho) e, com o login de gerente, sincroniza via Supabase.

## Agenda de pagamentos da casa (aba Painel)

| Quando | O quê | Como calcula |
|---|---|---|
| **Todo dia 01** | **VT + VA** do mês | VT = R$ 10,80 × dias de trabalho do mês (tira as folgas semanais da pessoa, feriados e férias) − faltas/atestados do mês anterior · VA = R$ 400 |
| **Todo dia 20** | **Adiantamento quinzenal** | 40% do salário (ajustável por pessoa), sem descontos |
| **5º dia útil** | **Salário** do mês anterior | Holerite completo: salário + extras − INSS − IRRF − 6% de VT − adiantamento − vales |
| Dia 20 | Guias (FGTS Digital e DCTFWeb) | FGTS 8%, INSS retido, IRRF |
| 30/11 e 20/12 | 13º (1ª e 2ª parcela) | avos + médias, INSS e IRRF na 2ª |

Dia 01 ou 20 caindo em domingo/feriado → **antecipa** para o dia útil anterior (dá pra mudar para adiar ou manter).
O 5º dia útil conta segunda a sábado, sem feriados (CLT art. 459 §1º). Cada pagamento tem **“Ver por pessoa”**
(com PIX), **marcar pago** e **🖨 Recibos**.

## Abas

- **Equipe** — cadastro: CPF, PIS, cargo/CBO, admissão, vínculo (CLT, aprendiz, estágio, PJ), contrato de experiência,
  salário, insalubridade/periculosidade, dependentes de IR, folga semanal (para o VT), VT/VA/adiantamento por pessoa,
  PIX/banco e saldo do FGTS. Com login, **importa a equipe do app Escala**.
- **Folha** — **+ Hora extra**: *dia X, colaborador Y, W horas* — o adicional sai sozinho pelo dia (domingo, feriado
  ou folga da pessoa = 100%, demais = 50%), avisa quando passa de 2h no dia e lista as extras do mês dia a dia
  (os dias também saem no holerite). **+ Falta / atestado**: dia, colaborador e quantos dias — mostra na hora o desconto no salário (falta) e
  quantos dias saem do **VT do mês seguinte** (só dias em que a pessoa trabalharia). **+ Outros** (HE 50%/100%, adicional noturno, comissão, bônus, falta com ou
  sem DSR, atestado, atraso, vale, consumo, pensão, reembolso, ajuste de VT, adiantamento manual), **holerite**
  por pessoa, **calculadora de hora extra** (com reflexo no DSR, recibo avulso ou lançar na folha), **imprimir todos
  os holerites** e **CSV** para a contabilidade. Mostra também o custo empresa (FGTS, patronal, provisão de férias/13º).
- **Férias** — períodos aquisitivos, saldo, prazo (alerta de **férias em dobro**, art. 137), programação com
  1/3, **abono pecuniário**, faltas (art. 130), adiantamento do 13º, **recibo** e **aviso de férias**.
  Na folha do mês, o salário sai proporcional e o INSS é acertado com o das férias.
- **13º salário** — avos (15+ dias no mês), média de variáveis, 1ª e 2ª parcela, recibos.
- **Rescisão** — sem justa causa, pedido de demissão, justa causa, acordo (484-A), fim/rescisão antecipada de
  experiência (arts. 479/480). Aviso proporcional (30 + 3/ano, Lei 12.506), projeção do aviso nos avos,
  férias vencidas/em dobro/proporcionais + 1/3, 13º, FGTS do mês/aviso/13º, **multa 40% (20% no acordo)**,
  saque e seguro-desemprego, prazo de 10 dias e **termo de rescisão** impresso.
- **FGTS e guias** — FGTS por pessoa, INSS retido, IRRF, patronal (conforme o regime), saldo estimado e multa,
  e os recolhimentos do ano com “marcar pago”.
- **Empresa e ajustes** — razão social, CNPJ, endereço, **logo** (vai nos recibos), valores da agenda, regras
  (divisor 220, % de HE, noturno, 6% do VT, desconto de VA, DSR), regime tributário, feriados locais e backup.

## Exemplo (Wagner, CLT, R$ 2.000, 6h extras em nov/2026)

Salário 2.000,00 + HE 50% 81,82 + DSR 24,90 − INSS 165,29 − VT 6% 120,00 − adiantamento (19/11) 800,00
= **R$ 1.021,43** no 5º dia útil (05/12). VT do dia 01: 23 dias de trabalho − 2 de atestado de outubro = 21 × 10,80 = 226,80 + VA 400.

## Regras e tabelas (2026)

| Regra | Base |
|---|---|
| INSS progressivo 7,5 / 9 / 12 / 14% até R$ 8.475,55 | Portaria Interministerial MPS/MF nº 13/2026 |
| IRRF (tabela de 05/2025) + isenção até R$ 5.000 e redução até R$ 7.350 | Lei 15.270/2025 |
| Hora = salário ÷ 220 · HE 50% (100% domingo/feriado) · DSR sobre HE | CLT arts. 59 e 64 · Súmula 172 TST |
| Adicional noturno 20% | CLT art. 73 |
| Desconto do VT até 6% do salário-base | Lei 7.418/1985 · Decreto 10.854/2021 |
| Salário até o 5º dia útil | CLT art. 459 §1º |
| FGTS 8% (aprendiz 2%) · multa 40% / 20% | Lei 8.036/1990 · CLT art. 484-A |
| Férias + 1/3, abono, faltas, prazos | CF art. 7º XVII · CLT arts. 129–145 |
| 13º em 2 parcelas | Leis 4.090/1962 e 4.749/1965 |
| Aviso prévio proporcional · prazo de 10 dias | Lei 12.506/2011 · CLT art. 477 §6º |

> É uma conta de controle da casa — confira com a contabilidade antes da folha oficial/eSocial
> (convenção coletiva, pensão judicial, salário-família etc. não entram automaticamente).

## Backend (Supabase)

Rode o [`SETUP.sql`](SETUP.sql) uma vez no SQL Editor. Cria a tabela `dp_store` (só gerentes leem/gravam, via
`app_admins`). Sem rodar, o app funciona normalmente só no aparelho. Backup em JSON em *Empresa e ajustes*.

## Como hospedar

Na Vercel: **New Project** → mesmo repositório → **Root Directory = `dp`** → Deploy. No celular, *Adicionar à Tela de Início*.

## Personalização (no código)

- Valores padrão (VT, VA, dias, %): `DEFAULT_CFG` em `calc.js` (ou pela tela *Empresa e ajustes*).
- Tabelas INSS/IRRF: `INSS_2026`, `IRRF_TABLE` em `calc.js`.
- Equipe inicial: `SEED_EMPS` no `index.html`.
