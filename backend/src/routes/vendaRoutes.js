const express = require('express');
const db = require('../database/db');
const { realizarVenda, VendaError } = require('../services/vendaService');
const { exigirLogin, exigirPapel } = require('../middlewares/auth');

const router = express.Router();
router.use(exigirLogin);

// Qualquer usuário logado pode comprar; a venda fica registrada no nome dele
router.post('/', async (req, res) => {
  try {
    const venda = await realizarVenda(req.body && req.body.itens, req.usuario.id);
    res.status(201).json(venda);
  } catch (e) {
    if (e instanceof VendaError) {
      return res.status(e.status).json({ erro: e.message });
    }
    console.error(e);
    res.status(500).json({ erro: 'Erro interno ao processar a venda.' });
  }
});

// Administrador vê qualquer pedido; cliente vê só os próprios
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(404).json({ erro: 'Pedido não encontrado.' });
  }

  const { rows } = await db.query(
    `SELECT v.*, u.nome AS cliente
     FROM venda v LEFT JOIN usuario u ON u.id = v.usuario_id
     WHERE v.id = $1`,
    [id]
  );
  const venda = rows[0];
  const ehDono = venda && venda.usuario_id === req.usuario.id;
  if (!venda || (req.usuario.papel !== 'admin' && !ehDono)) {
    return res.status(404).json({ erro: 'Pedido não encontrado.' });
  }

  const itens = await db.query(
    `SELECT iv.produto_id, p.nome, iv.quantidade, iv.preco_unitario,
            iv.quantidade * iv.preco_unitario AS subtotal
     FROM item_venda iv
     JOIN produto p ON p.id = iv.produto_id
     WHERE iv.venda_id = $1
     ORDER BY iv.id`,
    [id]
  );

  res.json({ ...venda, itens: itens.rows });
});

// Lista de todos os pedidos: só administrador
router.get('/', exigirPapel('admin'), async (req, res) => {
  const { rows } = await db.query(`
    SELECT v.*, u.nome AS cliente,
      (SELECT COALESCE(SUM(quantidade), 0)::int FROM item_venda WHERE venda_id = v.id) AS total_itens
    FROM venda v
    LEFT JOIN usuario u ON u.id = v.usuario_id
    ORDER BY v.id DESC
  `);
  res.json(rows);
});

module.exports = router;
