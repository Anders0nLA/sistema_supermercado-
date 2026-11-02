const API = '/produtos';

let produtos = [];
let editandoId = null; // null = cadastrando, número = editando

const brl = (v) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const form = document.getElementById('formProduto');
const inputNome = document.getElementById('nome');
const inputPreco = document.getElementById('preco');
const inputEstoque = document.getElementById('estoque');
const btnSalvar = document.getElementById('btnSalvar');
const btnCancelar = document.getElementById('btnCancelar');
const tituloForm = document.getElementById('tituloForm');

function mostrarMsg(texto, tipo) {
  const el = document.getElementById('msg');
  el.textContent = texto;
  el.className = tipo;
  el.style.display = 'block';
}

// ===== READ =====
async function carregarProdutos() {
  const resp = await fetch(API);
  produtos = await resp.json();
  renderTabela();
}

function renderTabela() {
  const tbody = document.getElementById('tabelaProdutos');
  tbody.innerHTML = '';

  if (produtos.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="vazio">Nenhum produto cadastrado.</td></tr>';
    return;
  }

  for (const p of produtos) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.id}</td>
      <td class="nome"></td>
      <td>${brl(p.preco)}</td>
      <td class="${p.quantidade_estoque <= 5 ? 'estoque-baixo' : ''}">${p.quantidade_estoque}</td>
      <td class="acoes">
        <button class="btn-editar">Editar</button>
        <button class="btn-excluir">Excluir</button>
      </td>`;

    tr.querySelector('.nome').textContent = p.nome;
    tr.querySelector('.btn-editar').addEventListener('click', () => iniciarEdicao(p));
    tr.querySelector('.btn-excluir').addEventListener('click', () => excluirProduto(p));
    tbody.appendChild(tr);
  }
}

// ===== CREATE / UPDATE =====
async function salvarProduto(event) {
  event.preventDefault();

  const dados = {
    nome: inputNome.value.trim(),
    preco: parseFloat(inputPreco.value),
    quantidade_estoque: parseInt(inputEstoque.value, 10),
  };

  const url = editandoId ? `${API}/${editandoId}` : API;
  const metodo = editandoId ? 'PUT' : 'POST';

  try {
    const resp = await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
    const corpo = await resp.json();

    if (!resp.ok) {
      mostrarMsg(corpo.erro || 'Erro ao salvar o produto.', 'erro');
      return;
    }

    mostrarMsg(
      editandoId ? 'Produto atualizado com sucesso!' : 'Produto cadastrado com sucesso!',
      'ok'
    );
    limparFormulario();
    await carregarProdutos();
  } catch (e) {
    mostrarMsg('Não foi possível conectar ao servidor.', 'erro');
  }
}

function iniciarEdicao(produto) {
  editandoId = produto.id;
  inputNome.value = produto.nome;
  inputPreco.value = produto.preco;
  inputEstoque.value = produto.quantidade_estoque;

  tituloForm.textContent = `Editando produto #${produto.id}`;
  btnSalvar.textContent = 'Atualizar produto';
  btnCancelar.hidden = false;
  inputNome.focus();
}

function limparFormulario() {
  editandoId = null;
  form.reset();
  tituloForm.textContent = 'Novo produto';
  btnSalvar.textContent = 'Salvar produto';
  btnCancelar.hidden = true;
}

// ===== DELETE =====
async function excluirProduto(produto) {
  if (!confirm(`Excluir o produto "${produto.nome}"?`)) return;

  try {
    const resp = await fetch(`${API}/${produto.id}`, { method: 'DELETE' });

    if (!resp.ok) {
      const corpo = await resp.json();
      mostrarMsg(corpo.erro || 'Erro ao excluir o produto.', 'erro');
      return;
    }

    if (editandoId === produto.id) limparFormulario();
    mostrarMsg('Produto excluído com sucesso!', 'ok');
    await carregarProdutos();
  } catch (e) {
    mostrarMsg('Não foi possível conectar ao servidor.', 'erro');
  }
}

form.addEventListener('submit', salvarProduto);
btnCancelar.addEventListener('click', limparFormulario);
carregarProdutos();