const db = require('../database/db');

const LIMITE_DESCONTO = 200.0;
const PERCENTUAL_DESCONTO = 0.05;

function arredondar(valor) {
  return Math.round(valor * 100) / 100;
}

function calcularTotais(subtotal) {
  const desconto = subtotal > LIMITE_DESCONTO ? arredondar(subtotal * PERCENTUAL_DESCONTO) : 0;
  return {
    valor_bruto: arredondar(subtotal),
    desconto,
    valor_final: arredondar(subtotal - desconto),
  };
}

// Erro com status HTTP para as rotas saberem o que responder
class VendaError extends Error {
  constructor(mensagem, status = 400) {
    super(mensagem);
    this.status = status;
  }
}

const buscarProduto = db.prepare('SELECT * FROM produto WHERE id = ?');
const inserirVenda = db.prepare(
  'INSERT INTO venda (valor_bruto, desconto, valor_final) VALUES (?, ?, ?)'
);
const inserirItem = db.prepare(
  'INSERT INTO item_venda (venda_id, produto_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)'
);
const baixarEstoque = db.prepare(
  'UPDATE produto SET quantidade_estoque = quantidade_estoque - ? WHERE id = ?'
);

// Tudo dentro de uma transação: se algo lançar erro, o banco desfaz tudo (rollback)
const realizarVenda = db.transaction((itens) => {
  if (!Array.isArray(itens) || itens.length === 0) {
    throw new VendaError('O carrinho está vazio.');
  }

  // Junta itens repetidos do mesmo produto
  const agrupados = new Map();
  for (const item of itens) {
    const produto_id = Number(item.produto_id);
    const quantidade = Number(item.quantidade);
    if (!Number.isInteger(produto_id) || !Number.isInteger(quantidade) || quantidade <= 0) {
      throw new VendaError('Item inválido: informe produto_id e quantidade inteira maior que zero.');
    }
    agrupados.set(produto_id, (agrupados.get(produto_id) || 0) + quantidade);
  }

  // Valida estoque e calcula o subtotal usando o preço do BANCO (nunca o do front)
  let subtotal = 0;
  const linhas = [];
  for (const [produto_id, quantidade] of agrupados) {
    const produto = buscarProduto.get(produto_id);
    if (!produto) {
      throw new VendaError(`Produto ${produto_id} não encontrado.`, 404);
    }
    if (produto.quantidade_estoque < quantidade) {
      throw new VendaError(
        `Estoque insuficiente para "${produto.nome}". Disponível: ${produto.quantidade_estoque}.`,
        409
      );
    }
    subtotal += produto.preco * quantidade;
    linhas.push({ produto, quantidade });
  }

  const totais = calcularTotais(subtotal);

  const venda = inserirVenda.run(totais.valor_bruto, totais.desconto, totais.valor_final);
  const venda_id = Number(venda.lastInsertRowid);

  for (const { produto, quantidade } of linhas) {
    inserirItem.run(venda_id, produto.id, quantidade, produto.preco);
    baixarEstoque.run(quantidade, produto.id);
  }

  return {
    id: venda_id,
    ...totais,
    itens: linhas.map(({ produto, quantidade }) => ({
      produto_id: produto.id,
      nome: produto.nome,
      quantidade,
      preco_unitario: produto.preco,
    })),
  };
});

module.exports = { realizarVenda, calcularTotais, VendaError };