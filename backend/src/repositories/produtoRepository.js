const db = require('../database/db');

async function listar() {
  const { rows } = await db.query('SELECT * FROM produto ORDER BY nome');
  return rows;
}

async function buscarPorId(id) {
  const { rows } = await db.query('SELECT * FROM produto WHERE id = $1', [id]);
  return rows[0];
}

async function criar({ nome, preco, quantidade_estoque }) {
  const { rows } = await db.query(
    'INSERT INTO produto (nome, preco, quantidade_estoque) VALUES ($1, $2, $3) RETURNING *',
    [nome.trim(), preco, quantidade_estoque]
  );
  return rows[0];
}

async function atualizar(id, { nome, preco, quantidade_estoque }) {
  const { rows } = await db.query(
    'UPDATE produto SET nome = $1, preco = $2, quantidade_estoque = $3 WHERE id = $4 RETURNING *',
    [nome.trim(), preco, quantidade_estoque, id]
  );
  return rows[0];
}

async function deletar(id) {
  await db.query('DELETE FROM produto WHERE id = $1', [id]);
}

module.exports = { listar, buscarPorId, criar, atualizar, deletar };
