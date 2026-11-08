const API = '/produtos';

let produtos = [];
let editandoId = null; // null = cadastrando, número = editando

const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const $ = (id) => document.getElementById(id);

const form = $('formProduto');
const inputNome = $('nome');
const inputPreco = $('preco');
const inputEstoque = $('estoque');

function mostrarMsg(texto, tipo) {
  const el = $('msg');
  el.textContent = texto;
  el.className = `msg ${tipo}`;
  el.hidden = false;
}

// ===== READ =====
async function carregarProdutos() {
  try {
    const resp = await api(API);
    produtos = await resp.json();
  } catch (e) {
    produtos = [];
    mostrarMsg('Não foi possível carregar os produtos. Verifique se a API está rodando.', 'erro');
  }
  renderTabela();
}

function renderTabela() {
  const tbody = $('tabelaProdutos');
  tbody.innerHTML = '';

  const baixos = produtos.filter((p) => p.quantidade_estoque <= 5).length;
  $('resumo').textContent =
    `${produtos.length} ${produtos.length === 1 ? 'produto' : 'produtos'}` +
    (baixos ? `, ${baixos} com estoque baixo` : '');

  if (produtos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="vazio">Nenhum produto cadastrado. Use o formulário ao lado para cadastrar o primeiro.</td></tr>';
    return;
  }

  for (const p of produtos) {
    const tr = document.createElement('tr');
    if (p.id === editandoId) tr.className = 'em-edicao';

    let selo = '';
    if (p.quantidade_estoque === 0) selo = '<span class="selo">esgotado</span>';
    else if (p.quantidade_estoque <= 5) selo = '<span class="selo">baixo</span>';

    tr.innerHTML = `
      <td class="cod">${p.id}</td>
      <td class="nome"></td>
      <td class="num">${brl(p.preco)}</td>
      <td class="num">${selo}${p.quantidade_estoque}</td>
      <td class="acoes">
        <button class="editar">Editar</button>
        <button class="excluir">Excluir</button>
      </td>`;

    tr.querySelector('.nome').textContent = p.nome;
    tr.querySelector('.editar').setAttribute('aria-label', `Editar ${p.nome}`);
    tr.querySelector('.excluir').setAttribute('aria-label', `Excluir ${p.nome}`);
    tr.querySelector('.editar').addEventListener('click', () => iniciarEdicao(p));
    tr.querySelector('.excluir').addEventListener('click', () => excluirProduto(p));
    tbody.appendChild(tr);
  }
}

// ===== CREATE / UPDATE =====
function validarFormulario(dados) {
  if (!dados.nome) return 'Informe o nome do produto.';
  if (isNaN(dados.preco) || dados.preco < 0) return 'Informe um preço igual ou maior que zero.';
  if (!Number.isInteger(dados.quantidade_estoque) || dados.quantidade_estoque < 0) {
    return 'Informe o estoque como número inteiro, igual ou maior que zero.';
  }
  return null;
}

async function salvarProduto(event) {
  event.preventDefault();

  const dados = {
    nome: inputNome.value.trim(),
    preco: parseFloat(inputPreco.value),
    quantidade_estoque: Number(inputEstoque.value === '' ? NaN : inputEstoque.value),
  };

  const invalido = validarFormulario(dados);
  if (invalido) return mostrarMsg(invalido, 'erro');

  const editando = editandoId !== null;
  const url = editando ? `${API}/${editandoId}` : API;

  try {
    const resp = await api(url, {
      method: editando ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
    const corpo = await resp.json();

    if (!resp.ok) {
      mostrarMsg(corpo.erro || 'O produto não foi salvo. Tente de novo.', 'erro');
      return;
    }

    mostrarMsg(editando ? `Alterações em "${corpo.nome}" salvas.` : `"${corpo.nome}" cadastrado.`, 'ok');
    limparFormulario();
    await carregarProdutos();
  } catch (e) {
    mostrarMsg('Sem conexão com a API. O produto não foi salvo.', 'erro');
  }
}

function iniciarEdicao(produto) {
  editandoId = produto.id;
  inputNome.value = produto.nome;
  inputPreco.value = produto.preco;
  inputEstoque.value = produto.quantidade_estoque;

  $('ficha').classList.add('editando');
  $('tituloForm').textContent = 'Editar produto';
  $('dicaForm').textContent = `Alterando o código ${produto.id}.`;
  $('btnSalvar').textContent = 'Salvar alterações';
  $('btnCancelar').hidden = false;
  $('msg').hidden = true;
  renderTabela();
  inputNome.focus();
}

function limparFormulario() {
  editandoId = null;
  form.reset();
  $('ficha').classList.remove('editando');
  $('tituloForm').textContent = 'Novo produto';
  $('dicaForm').textContent = 'Preencha os dados para colocar o produto à venda.';
  $('btnSalvar').textContent = 'Cadastrar produto';
  $('btnCancelar').hidden = true;
  renderTabela();
}

// ===== DELETE =====
async function excluirProduto(produto) {
  if (!confirm(`Excluir "${produto.nome}"? Essa ação não pode ser desfeita.`)) return;

  try {
    const resp = await api(`${API}/${produto.id}`, { method: 'DELETE' });

    if (!resp.ok) {
      const corpo = await resp.json();
      mostrarMsg(corpo.erro || 'O produto não foi excluído. Tente de novo.', 'erro');
      return;
    }

    if (editandoId === produto.id) limparFormulario();
    mostrarMsg(`"${produto.nome}" excluído.`, 'ok');
    await carregarProdutos();
  } catch (e) {
    mostrarMsg('Sem conexão com a API. O produto não foi excluído.', 'erro');
  }
}

form.addEventListener('submit', salvarProduto);
$('btnCancelar').addEventListener('click', () => {
  limparFormulario();
  $('msg').hidden = true;
});
carregarProdutos();
