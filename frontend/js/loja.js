const API_PRODUTOS = '/produtos';
const API_VENDAS = '/vendas';

let produtos = [];
let carrinho = {}; // { produto_id: quantidade }

const brl = (v) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function mostrarMsg(texto, tipo) {
  const el = document.getElementById('msg');
  el.textContent = texto;
  el.className = tipo;
  el.style.display = 'block';
}

async function carregarProdutos() {
  const resp = await fetch(API_PRODUTOS);
  produtos = await resp.json();
  renderProdutos();
  renderCarrinho();
}

function renderProdutos() {
  const grid = document.getElementById('grid');

  if (produtos.length === 0) {
    grid.innerHTML = '<p class="vazio">Nenhum produto cadastrado.</p>';
    return;
  }

  grid.innerHTML = '';
  for (const p of produtos) {
    const noCarrinho = carrinho[p.id] || 0;
    const esgotado = p.quantidade_estoque <= 0;
    const limite = noCarrinho >= p.quantidade_estoque;

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h3></h3>
      <span class="preco">${brl(p.preco)}</span>
      <span class="estoque">${esgotado ? 'Esgotado' : 'Em estoque: ' + p.quantidade_estoque}</span>
      <button class="btn-add" ${esgotado || limite ? 'disabled' : ''}>Adicionar ao carrinho</button>`;

    card.querySelector('h3').textContent = p.nome;
    card.querySelector('button').addEventListener('click', () => alterarQtd(p.id, 1));
    grid.appendChild(card);
  }
}

function alterarQtd(id, delta) {
  const p = produtos.find((x) => x.id === id);
  const nova = (carrinho[id] || 0) + delta;

  if (nova <= 0) delete carrinho[id];
  else if (nova <= p.quantidade_estoque) carrinho[id] = nova;

  renderProdutos();
  renderCarrinho();
}

// Prévia visual. Quem calcula de verdade é o back-end (vendaService).
function calcularPrevia() {
  let subtotal = 0;
  for (const [id, qtd] of Object.entries(carrinho)) {
    const p = produtos.find((x) => x.id === Number(id));
    if (p) subtotal += p.preco * qtd;
  }
  const desconto = subtotal > 200 ? Math.round(subtotal * 0.05 * 100) / 100 : 0;
  return { subtotal, desconto, total: subtotal - desconto };
}

function renderCarrinho() {
  const itens = document.getElementById('itens');
  const ids = Object.keys(carrinho);
  itens.innerHTML = ids.length ? '' : '<p class="vazio">Carrinho vazio.</p>';

  for (const id of ids) {
    const p = produtos.find((x) => x.id === Number(id));
    if (!p) continue;

    const div = document.createElement('div');
    div.className = 'item';
    div.innerHTML = `
      <span class="nome"></span>
      <span class="qtd">
        <button class="menos">−</button><b>${carrinho[id]}</b><button class="mais">+</button>
      </span>
      <span>${brl(p.preco * carrinho[id])}</span>`;

    div.querySelector('.nome').textContent = p.nome;
    div.querySelector('.menos').addEventListener('click', () => alterarQtd(p.id, -1));
    div.querySelector('.mais').addEventListener('click', () => alterarQtd(p.id, 1));
    itens.appendChild(div);
  }

  const { subtotal, desconto, total } = calcularPrevia();
  document.getElementById('subtotal').textContent = brl(subtotal);
  document.getElementById('desconto').textContent = '- ' + brl(desconto);
  document.getElementById('total').textContent = brl(total);
  document.getElementById('btnFinalizar').disabled = ids.length === 0;
}

async function finalizarCompra() {
  const itens = Object.entries(carrinho).map(([id, qtd]) => ({
    produto_id: Number(id),
    quantidade: qtd,
  }));

  try {
    const resp = await fetch(API_VENDAS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itens }),
    });
    const dados = await resp.json();

    if (!resp.ok) {
      mostrarMsg(dados.erro || 'Erro ao finalizar a compra.', 'erro');
    } else {
      carrinho = {};
      mostrarMsg(
        `Compra #${dados.id} realizada! Total: ${brl(dados.valor_final)}` +
          (dados.desconto > 0 ? ` (desconto de ${brl(dados.desconto)})` : ''),
        'ok'
      );
    }
  } catch (e) {
    mostrarMsg('Não foi possível conectar ao servidor.', 'erro');
  }

  await carregarProdutos(); // atualiza o estoque na tela
}

document.getElementById('btnFinalizar').addEventListener('click', finalizarCompra);
carregarProdutos();