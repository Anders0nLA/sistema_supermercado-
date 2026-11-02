const db = require('../database/db');

function listar() {
  return db.prepare('SELECT * FROM produto ORDER BY nome').all();
}

function buscarPorId(id) {
  return db.prepare('SELECT * FROM produto WHERE id = ?').get(id);
}

function criar({ nome, preco, quantidade_estoque }) {
  const info = db
    .prepare('INSERT INTO produto (nome, preco, quantidade_estoque) VALUES (?, ?, ?)')
    .run(nome, preco, quantidade_estoque);
  return buscarPorId(info.lastInsertRowid);
}

function atualizar(id, { nome, preco, quantidade_estoque }) {
  db.prepare(
    'UPDATE produto SET nome = ?, preco = ?, quantidade_estoque = ? WHERE id = ?'
  ).run(nome, preco, quantidade_estoque, id);
  return buscarPorId(id);
}

function deletar(id) {
  return db.prepare('DELETE FROM produto WHERE id = ?').run(id);
}

module.exports = { listar, buscarPorId, criar, atualizar, deletar };