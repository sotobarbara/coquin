# Coquin Gelato · site institucional (`coquin.com.br`)

Site da marca, no mesmo padrão dos outros apps do repositório: páginas em HTML/CSS/JS, **sem build**,
hospedado na Vercel. Formulários salvos no **mesmo Supabase** do painel.

| Página | Arquivo | O que tem |
|---|---|---|
| Início | `index.html` | Hero com "Peça no WhatsApp", selos, o produto (R$ 35), a experiência, onde nos encontrar, bloco de parceiros e contato |
| Produto | `produto.html` | Foto, descrição, selos, preço, "Pedir pelo WhatsApp" e **visualizador 3D** |
| Parceiros | `parceiros.html` | Proposta B2B (operação completa, sem investimento, aluguel mensal pago pela Coquin), etapas e **formulário de parceria** |
| Contato | `contato.html` | WhatsApp, telefone, e-mail, Instagram, horários, endereço e **formulário de contato** |

Em todas: navegação fixa (menu no celular), **WhatsApp flutuante** e rodapé.

## Dados usados (confirmados)

- Produto: **gelato tailandês** servido na quenga do coco · sem lactose · sem glúten · artesanal · **R$ 35**
- WhatsApp / telefone: **(85) 99971-9276** · e-mail **coquingelato@gmail.com** · Instagram **@coquingelato**
- Pontos: **Beira-Mar** (Av. Historiador Raimundo Girão, em frente à feirinha, perto da Pizza Hut) **16h às 23h** ·
  **Imprensa Food Square 17h às 23h** · **Praia do Futuro** (horário: "consulte pelo WhatsApp")
- Rodapé: Coquin Comércio de Alimentos LTDA · Rua Dom Joaquim, 33, Centro

**Ainda faltam:** sabores (se houver mais de um), horário da Praia do Futuro, fotos do quiosque e do
carrinho, e os arquivos 3D (`.glb`) do mascote/coco/carrinho.

## Visualizador 3D (`assets/viewer.js`)

- Three.js 0.160 (via jsDelivr), carregado **só quando a pessoa chega no visualizador** (o resto do site fica leve).
- Abas **Coco / Carrinho**, alternância **Por fora / Por dentro**, marcadores numerados no modelo e card com
  **Anterior / Próximo** (a câmera vai até o ponto). Gira sozinho devagar quando ninguém mexe.
- **Modelos reais:** coloque os `.glb` em `models/` e escreva o nome em `models/models.json`
  (ex.: `"coco": "coco.glb"`). Enquanto estiver `null`, aparece o modelo provisório feito em código.
  - Dentro do `.glb`, objetos chamados **`fora`** e **`dentro`** são mostrados/ocultados pela alternância.
  - O modelo é centralizado e redimensionado sozinho.
- **Textos e posições dos marcadores:** no começo de `assets/viewer.js` (`SCENES`): `t` título, `d` texto,
  `p` posição no modelo, `c` posição da câmera. Ao trocar para o `.glb` real, ajuste `p` e `c`.

## Formulários

Validação no navegador (campos obrigatórios, e-mail, telefone com DDD, máscara de telefone), proteção
simples contra robôs e mensagem de confirmação. Os envios vão para a tabela **`site_contatos`**:

1. Rode o [`SETUP.sql`](SETUP.sql) **uma vez** no SQL Editor do Supabase.
2. Para ver as mensagens: Supabase → **Table Editor → site_contatos** (`tipo` = `contato` ou `parceiro`).

Se o envio falhar, o formulário mostra o link do WhatsApp.

## Como publicar (Vercel)

1. Vercel → **Add New → Project** → importe o repositório `coquin`.
2. **Root Directory** = **`site`** → Deploy.
3. **Settings → Domains** → adicione `coquin.com.br` e `www.coquin.com.br`.
4. No **Registro.br** (DNS de coquin.com.br), crie os registros que a Vercel mostrar, normalmente:
   `A` em `@` → `76.76.21.21` e `CNAME` em `www` → `cname.vercel-dns.com`.
   O `vagas` (CNAME) continua como está.

## Desempenho (Lighthouse, celular)

Medido localmente: performance 97–99, acessibilidade 100, boas práticas 100, SEO 100.
