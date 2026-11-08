-- Produtos de exemplo: só são inseridos se a tabela estiver vazia
INSERT INTO produto (nome, preco, quantidade_estoque)
SELECT nome, preco, quantidade_estoque
FROM (VALUES
  ('Arroz 5kg', 25.90, 50),
  ('Feijão Carioca 1kg', 8.49, 80),
  ('Açúcar Refinado 1kg', 4.99, 60),
  ('Café Torrado 500g', 18.90, 40),
  ('Óleo de Soja 900ml', 7.29, 70),
  ('Leite Integral 1L', 5.49, 120),
  ('Macarrão Espaguete 500g', 4.59, 90),
  ('Sabão em Pó 1,6kg', 22.90, 30),
  ('Azeite Extra Virgem 500ml', 39.90, 25),
  ('Picanha Bovina 1kg', 89.90, 15)
) AS v(nome, preco, quantidade_estoque)
WHERE NOT EXISTS (SELECT 1 FROM produto);
