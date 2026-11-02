const express = require('express');
const repo = require('../repositories/produtoRepository');

const router = express.Router();

function validar({ nome, preco, quantidade_estoque }) {
  if (!nome || typeof nome !== 'string' || !nome.trim()) {
    return 'O nome é obrigatório.';
  }
  if (typeof preco !== 'number' || isNaN(preco) || preco < 0) {
    return 'O preço deve ser um número maior ou igual a zero.';
  }
  if (!Number.isInteger(quantidade_estoque) || quantidade_estoque < 0) {
    return 'O estoque deve ser um número inteiro maior ou igual a zero.';
  }
  return null;
}

// Listar todos
router.get('/', (req, res) => {
  res.json(repo.listar());
});

// Buscar um
router.get('/:id', (req, res) => {
  const produto = repo.buscarPorId(req.params.id);
  if (!produto) return res.status(404).json({ erro: 'Produto não encontrado.' });
  res.json(produto);
});

// Criar
router.post('/', (req, res) => {
  const erro = validar(req.body);
  if (erro) return res.status(400).json({ erro });
  res.status(201).json(repo.criar(req.body));
});

// Atualizar
router.put('/:id', (req, res) => {
  if (!repo.buscarPorId(req.params.id)) {
    return res.status(404).json({ erro: 'Produto não encontrado.' });
  }
  const erro = validar(req.body);
  if (erro) return res.status(400).json({ erro });
  res.json(repo.atualizar(req.params.id, req.body));
});

// Deletar
router.delete('/:id', (req, res) => {
  if (!repo.buscarPorId(req.params.id)) {
    return res.status(404).json({ erro: 'Produto não encontrado.' });
  }
  try {
    repo.deletar(req.params.id);
    res.status(204).send();
  } catch (e) {
    // produto já vendido não pode ser apagado (chave estrangeira em item_venda)
    res.status(409).json({ erro: 'Não é possível excluir um produto que já foi vendido.' });
  }
});

module.exports = router;