const { verificarToken } = require('../auth/token');

function lerCookie(req, nome) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const parte of header.split(';')) {
    const i = parte.indexOf('=');
    if (i > 0 && parte.slice(0, i).trim() === nome) {
      return decodeURIComponent(parte.slice(i + 1).trim());
    }
  }
  return null;
}

// O token pode vir no cookie (navegador) ou no header Authorization (Swagger, Postman)
function lerToken(req) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return lerCookie(req, 'token');
}

// Roda em toda requisição: se houver token válido, preenche req.usuario
function identificarUsuario(req, res, next) {
  const dados = verificarToken(lerToken(req));
  req.usuario = dados
    ? { id: dados.sub, nome: dados.nome, email: dados.email, papel: dados.papel }
    : null;
  next();
}

// ---------- Para a API (respondem JSON) ----------

function exigirLogin(req, res, next) {
  if (!req.usuario) return res.status(401).json({ erro: 'Faça login para continuar.' });
  next();
}

function exigirPapel(...papeis) {
  return (req, res, next) => {
    if (!req.usuario) return res.status(401).json({ erro: 'Faça login para continuar.' });
    if (!papeis.includes(req.usuario.papel)) {
      return res.status(403).json({ erro: 'Sua conta não tem permissão para esta ação.' });
    }
    next();
  };
}

// ---------- Para as páginas (redirecionam) ----------

function paginaExigeLogin(req, res, next) {
  if (!req.usuario) {
    return res.redirect(`/login?voltar=${encodeURIComponent(req.originalUrl)}`);
  }
  next();
}

module.exports = { identificarUsuario, exigirLogin, exigirPapel, paginaExigeLogin };
