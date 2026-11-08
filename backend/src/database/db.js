const { Pool, types } = require('pg');
const fs = require('fs');
const path = require('path');

// O pg devolve NUMERIC (1700) e BIGINT (20) como string; convertemos para número
types.setTypeParser(1700, (v) => parseFloat(v));
types.setTypeParser(20, (v) => parseInt(v, 10));

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    'postgres://supermercado:supermercado@localhost:5432/supermercado',
});

// Contas criadas na primeira execução (os valores podem ser trocados por variáveis de ambiente)
const USUARIOS_PADRAO = [
  {
    nome: 'Administrador',
    email: process.env.ADMIN_EMAIL || 'admin@supermercado.com',
    senha: process.env.ADMIN_SENHA || 'admin123',
    papel: 'admin',
  },
  {
    nome: 'Cliente Teste',
    email: process.env.CLIENTE_EMAIL || 'cliente@supermercado.com',
    senha: process.env.CLIENTE_SENHA || 'cliente123',
    papel: 'cliente',
  },
];

// Cria as tabelas (se não existirem), os produtos de exemplo e as contas padrão
async function inicializar() {
  const { gerarHash } = require('../auth/senha');
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
  await pool.query(schema);
  await pool.query(seed);

  for (const u of USUARIOS_PADRAO) {
    await pool.query(
      `INSERT INTO usuario (nome, email, senha_hash, papel) VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      [u.nome, u.email.toLowerCase(), await gerarHash(u.senha), u.papel]
    );
  }
}

module.exports = {
  pool,
  query: (texto, params) => pool.query(texto, params),
  inicializar,
};
