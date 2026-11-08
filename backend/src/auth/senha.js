// Hash de senha com scrypt (nativo do Node). A senha nunca é salva em texto puro.
// Formato salvo no banco: scrypt$<sal>$<hash>
const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);
const TAMANHO = 64;

async function gerarHash(senha) {
  const sal = crypto.randomBytes(16).toString('hex');
  const hash = await scrypt(senha, sal, TAMANHO);
  return `scrypt$${sal}$${hash.toString('hex')}`;
}

async function conferirSenha(senha, salvo) {
  const [algoritmo, sal, hashHex] = String(salvo).split('$');
  if (algoritmo !== 'scrypt' || !sal || !hashHex) return false;

  const esperado = Buffer.from(hashHex, 'hex');
  const calculado = await scrypt(String(senha), sal, TAMANHO);
  // comparação em tempo constante, para não vazar informação pelo tempo de resposta
  return esperado.length === calculado.length && crypto.timingSafeEqual(esperado, calculado);
}

module.exports = { gerarHash, conferirSenha };
