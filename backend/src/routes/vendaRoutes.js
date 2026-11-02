const express = require('express');
const db = require('../database/db');
const { realizarVenda, VendaError } = require('../services/vendaService');

const router = express.Router();

// Finalizar compra
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

// Histórico de vendas (útil para mostrar na apresentação)
router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM venda ORDER BY id DESC').all());
});

module.exports = router;