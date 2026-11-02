CREATE TABLE IF NOT EXISTS produto (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  preco REAL NOT NULL CHECK (preco >= 0),
  quantidade_estoque INTEGER NOT NULL CHECK (quantidade_estoque >= 0)
);

CREATE TABLE IF NOT EXISTS venda (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data TEXT NOT NULL DEFAULT (datetime('now')),
  valor_bruto REAL NOT NULL,
  desconto REAL NOT NULL,
  valor_final REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS item_venda (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venda_id INTEGER NOT NULL REFERENCES venda(id),
  produto_id INTEGER NOT NULL REFERENCES produto(id),
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  preco_unitario REAL NOT NULL
);