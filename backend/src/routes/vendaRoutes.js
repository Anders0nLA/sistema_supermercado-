const express = require('express');
const db = require('../database/db');
const { realizarVenda, VendaError } = require('../services/vendaService');

const router = express.Router();

router.post('/', (req, res) => {
  try {
    const venda = realizarVenda(req.body.itens);
    res.status(201).json(venda);
  } catch (e) {
    if (e instanceof VendaError) {
      return res.status(e.status).json({ erro: e.message });
    }
    console.error(e);
    res.status(500).json({ erro: 'Erro interno ao processar a venda.' });
  }
});

router.get('/:id', (req, res) => {
  const venda = db.prepare('SELECT * FROM venda WHERE id = ?').get(req.params.id);
  if (!venda) return res.status(404).json({ erro: 'Pedido não encontrado.' });

  const itens = db.prepare(`
    SELECT iv.produto_id, p.nome, iv.quantidade, iv.preco_unitario,
           iv.quantidade * iv.preco_unitario AS subtotal
    FROM item_venda iv
    JOIN produto p ON p.id = iv.produto_id
    WHERE iv.venda_id = ?
  `).all(req.params.id);

  res.json({ ...venda, itens });
});

router.get('/', (req, res) => {
  const vendas = db.prepare(`
    SELECT v.*,
      (SELECT COALESCE(SUM(quantidade), 0) FROM item_venda WHERE venda_id = v.id) AS total_itens
    FROM venda v
    ORDER BY v.id DESC
  `).all();
  res.json(vendas);
});

module.exports = router;