// Token de sessão no padrão JWT (HS256), assinado com HMAC-SHA256 nativo do Node.
const crypto = require('crypto');

// Em produção, defina JWT_SECRET. Sem ela, um segredo aleatório é gerado
// a cada inicialização (e todos precisam fazer login de novo quando a API reinicia).
const SEGREDO = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const DURACAO_SEGUNDOS = 8 * 60 * 60; // 8 horas

const codificar = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
const decodificar = (texto) => JSON.parse(Buffer.from(texto, 'base64url').toString('utf8'));
const assinatura = (dados) => crypto.createHmac('sha256', SEGREDO).update(dados).digest('base64url');

function assinarToken(dados) {
  const agora = Math.floor(Date.now() / 1000);
  const cabecalho = codificar({ alg: 'HS256', typ: 'JWT' });
  const corpo = codificar({ ...dados, iat: agora, exp: agora + DURACAO_SEGUNDOS });
  return `${cabecalho}.${corpo}.${assinatura(`${cabecalho}.${corpo}`)}`;
}

// Retorna os dados do token, ou null se for inválido, adulterado ou expirado
function verificarToken(token) {
  if (typeof token !== 'string') return null;
  const partes = token.split('.');
  if (partes.length !== 3) return null;

  const [cabecalho, corpo, recebida] = partes;
  const a = Buffer.from(recebida);
  const b = Buffer.from(assinatura(`${cabecalho}.${corpo}`));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    if (decodificar(cabecalho).alg !== 'HS256') return null;
    const dados = decodificar(corpo);
    if (!dados.exp || dados.exp < Math.floor(Date.now() / 1000)) return null;
    return dados;
  } catch (e) {
    return null;
  }
}

module.exports = { assinarToken, verificarToken, DURACAO_SEGUNDOS };
