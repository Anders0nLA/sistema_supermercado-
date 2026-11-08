const express = require('express');
const repo = require('../repositories/usuarioRepository');
const { gerarHash, conferirSenha } = require('../auth/senha');
const { assinarToken, DURACAO_SEGUNDOS } = require('../auth/token');
const { exigirLogin } = require('../middlewares/auth');

const router = express.Router();

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SENHA_MINIMA = 6;

const OPCOES_COOKIE = {
  httpOnly: true,     // o JavaScript da página não consegue ler o token
  sameSite: 'lax',    // o navegador não envia o cookie em POST vindo de outro site
  path: '/',
  maxAge: DURACAO_SEGUNDOS * 1000,
};

function usuarioPublico(u) {
  return { id: u.id, nome: u.nome, email: u.email, papel: u.papel };
}

// Gera o token, grava no cookie e devolve também no corpo (para usar no Swagger)
function iniciarSessao(res, usuario, status = 200) {
  const publico = usuarioPublico(usuario);
  const token = assinarToken({ sub: publico.id, nome: publico.nome, email: publico.email, papel: publico.papel });
  res.cookie('token', token, OPCOES_COOKIE);
  res.status(status).json({ usuario: publico, token });
}

router.post('/login', async (req, res) => {
  const { email, senha } = req.body || {};
  if (!email || !senha) {
    return res.status(400).json({ erro: 'Informe e-mail e senha.' });
  }

  const usuario = await repo.buscarPorEmail(email);
  // mesma mensagem para e-mail inexistente e senha errada: não revela quais e-mails existem
  if (!usuario || !(await conferirSenha(senha, usuario.senha_hash))) {
    return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });
  }

  iniciarSessao(res, usuario);
});

// Cadastro aberto ao público: sempre cria uma conta de cliente
router.post('/cadastro', async (req, res) => {
  const { nome, email, senha } = req.body || {};

  if (!nome || typeof nome !== 'string' || !nome.trim()) {
    return res.status(400).json({ erro: 'Informe seu nome.' });
  }
  if (!email || typeof email !== 'string' || !EMAIL_VALIDO.test(email.trim())) {
    return res.status(400).json({ erro: 'Informe um e-mail válido.' });
  }
  if (!senha || typeof senha !== 'string' || senha.length < SENHA_MINIMA) {
    return res.status(400).json({ erro: `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.` });
  }

  try {
    const usuario = await repo.criar({
      nome,
      email,
      senhaHash: await gerarHash(senha),
      papel: 'cliente',
    });
    iniciarSessao(res, usuario, 201);
  } catch (e) {
    if (e.code === '23505') {
      return res.status(409).json({ erro: 'Já existe uma conta com este e-mail.' });
    }
    throw e;
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token', { path: '/' });
  res.status(204).send();
});

router.get('/me', exigirLogin, (req, res) => {
  res.json(req.usuario);
});

module.exports = { router, OPCOES_COOKIE };
