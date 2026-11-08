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

// Junta itens repetidos do mesmo produto e valida o formato
function agruparItens(itens) {
  if (!Array.isArray(itens) || itens.length === 0) {
    throw new VendaError('O carrinho está vazio.');
  }
  const agrupados = new Map();
  for (const item of itens) {
    const produto_id = Number(item && item.produto_id);
    const quantidade = Number(item && item.quantidade);
    if (!Number.isInteger(produto_id) || produto_id <= 0 || !Number.isInteger(quantidade) || quantidade <= 0) {
      throw new VendaError('Item inválido: informe produto_id e quantidade inteira maior que zero.');
    }
    agrupados.set(produto_id, (agrupados.get(produto_id) || 0) + quantidade);
  }
  return agrupados;
}

// Tudo dentro de uma transação: se algo der errado, o banco desfaz tudo (ROLLBACK)
async function realizarVenda(itens, usuarioId = null) {
  const agrupados = agruparItens(itens);
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    // Valida estoque e calcula o subtotal usando o preço do BANCO (nunca o do front).
    // FOR UPDATE trava a linha do produto até o fim da transação, evitando que duas
    // compras simultâneas vendam o mesmo estoque.
    let subtotal = 0;
    const linhas = [];
    for (const [produto_id, quantidade] of agrupados) {
      const { rows } = await client.query(
        'SELECT * FROM produto WHERE id = $1 FOR UPDATE',
        [produto_id]
      );
      const produto = rows[0];
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

    const venda = await client.query(
      'INSERT INTO venda (valor_bruto, desconto, valor_final, usuario_id) VALUES ($1, $2, $3, $4) RETURNING id, data',
      [totais.valor_bruto, totais.desconto, totais.valor_final, usuarioId]
    );
    const { id: venda_id, data } = venda.rows[0];

    for (const { produto, quantidade } of linhas) {
      await client.query(
        'INSERT INTO item_venda (venda_id, produto_id, quantidade, preco_unitario) VALUES ($1, $2, $3, $4)',
        [venda_id, produto.id, quantidade, produto.preco]
      );
      await client.query(
        'UPDATE produto SET quantidade_estoque = quantidade_estoque - $1 WHERE id = $2',
        [quantidade, produto.id]
      );
    }

    await client.query('COMMIT');

    return {
      id: venda_id,
      data,
      ...totais,
      itens: linhas.map(({ produto, quantidade }) => ({
        produto_id: produto.id,
        nome: produto.nome,
        quantidade,
        preco_unitario: produto.preco,
      })),
    };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

module.exports = { realizarVenda, calcularTotais, VendaError };
