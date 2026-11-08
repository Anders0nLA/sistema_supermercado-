const db = require('../database/db');

// Campos que podem sair da API (nunca o senha_hash)
const PUBLICOS = 'id, nome, email, papel, criado_em';

async function buscarPorEmail(email) {
  const { rows } = await db.query('SELECT * FROM usuario WHERE email = $1', [
    String(email).trim().toLowerCase(),
  ]);
  return rows[0];
}

async function criar({ nome, email, senhaHash, papel = 'cliente' }) {
  const { rows } = await db.query(
    `INSERT INTO usuario (nome, email, senha_hash, papel) VALUES ($1, $2, $3, $4) RETURNING ${PUBLICOS}`,
    [nome.trim(), email.trim().toLowerCase(), senhaHash, papel]
  );
  return rows[0];
}

module.exports = { buscarPorEmail, criar };
