const express = require('express');
const repo = require('../repositories/produtoRepository');
const { exigirLogin, exigirPapel } = require('../middlewares/auth');

const router = express.Router();

// Qualquer usuário logado pode ver os produtos; só o administrador altera
router.use(exigirLogin);
const somenteAdmin = exigirPapel('admin');

function validar({ nome, preco, quantidade_estoque } = {}) {
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

// Converte o :id da URL; retorna null se não for um inteiro positivo
function lerId(req) {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Listar todos
router.get('/', async (req, res) => {
  res.json(await repo.listar());
});

// Buscar um
router.get('/:id', async (req, res) => {
  const id = lerId(req);
  const produto = id && (await repo.buscarPorId(id));
  if (!produto) return res.status(404).json({ erro: 'Produto não encontrado.' });
  res.json(produto);
});

// Criar
router.post('/', somenteAdmin, async (req, res) => {
  const erro = validar(req.body);
  if (erro) return res.status(400).json({ erro });
  res.status(201).json(await repo.criar(req.body));
});

// Atualizar
router.put('/:id', somenteAdmin, async (req, res) => {
  const id = lerId(req);
  if (!id || !(await repo.buscarPorId(id))) {
    return res.status(404).json({ erro: 'Produto não encontrado.' });
  }
  const erro = validar(req.body);
  if (erro) return res.status(400).json({ erro });
  res.json(await repo.atualizar(id, req.body));
});

// Deletar
router.delete('/:id', somenteAdmin, async (req, res) => {
  const id = lerId(req);
  if (!id || !(await repo.buscarPorId(id))) {
    return res.status(404).json({ erro: 'Produto não encontrado.' });
  }
  // Produto já vendido também pode ser excluído: as vendas antigas guardam o nome dele
  await repo.deletar(id);
  res.status(204).send();
});

module.exports = router;
