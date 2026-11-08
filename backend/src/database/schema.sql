CREATE TABLE IF NOT EXISTS produto (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  preco NUMERIC(10, 2) NOT NULL CHECK (preco >= 0),
  quantidade_estoque INTEGER NOT NULL CHECK (quantidade_estoque >= 0)
);

-- papel define o nível de acesso: 'admin' gerencia produtos, 'cliente' só compra
CREATE TABLE IF NOT EXISTS usuario (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  papel TEXT NOT NULL DEFAULT 'cliente' CHECK (papel IN ('admin', 'cliente')),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS venda (
  id SERIAL PRIMARY KEY,
  data TIMESTAMP NOT NULL DEFAULT NOW(),
  valor_bruto NUMERIC(10, 2) NOT NULL,
  desconto NUMERIC(10, 2) NOT NULL,
  valor_final NUMERIC(10, 2) NOT NULL,
  usuario_id INTEGER REFERENCES usuario(id)
);

-- bancos criados antes do login não têm a coluna usuario_id
ALTER TABLE venda ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuario(id);

CREATE TABLE IF NOT EXISTS item_venda (
  id SERIAL PRIMARY KEY,
  venda_id INTEGER NOT NULL REFERENCES venda(id),
  produto_id INTEGER NOT NULL REFERENCES produto(id),
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  preco_unitario NUMERIC(10, 2) NOT NULL
);
