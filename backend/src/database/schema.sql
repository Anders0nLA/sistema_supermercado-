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
  -- se o produto for excluído, o item continua na venda (produto_id vira NULL)
  produto_id INTEGER REFERENCES produto(id) ON DELETE SET NULL,
  -- nome do produto no momento da compra, para o histórico não depender do cadastro
  nome_produto TEXT,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  preco_unitario NUMERIC(10, 2) NOT NULL
);

-- Bancos criados antes: guardam o nome nos itens antigos e liberam a exclusão de produtos
ALTER TABLE item_venda ADD COLUMN IF NOT EXISTS nome_produto TEXT;
UPDATE item_venda iv SET nome_produto = p.nome
  FROM produto p WHERE p.id = iv.produto_id AND iv.nome_produto IS NULL;
ALTER TABLE item_venda ALTER COLUMN produto_id DROP NOT NULL;
ALTER TABLE item_venda DROP CONSTRAINT IF EXISTS item_venda_produto_id_fkey;
ALTER TABLE item_venda ADD CONSTRAINT item_venda_produto_id_fkey
  FOREIGN KEY (produto_id) REFERENCES produto(id) ON DELETE SET NULL;
