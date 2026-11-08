// A mesma página atende /login e /cadastro
const cadastro = location.pathname === '/cadastro';
const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);

function mostrarMsg(texto) {
  const el = $('msg');
  el.textContent = texto;
  el.className = 'msg erro';
  el.hidden = false;
}

if (cadastro) {
  document.title = 'Criar conta | Supermercado';
  $('tituloAcesso').textContent = 'Criar conta';
  $('dicaAcesso').textContent = 'Contas novas são de cliente: dá para comprar na loja.';
  $('campoNome').hidden = false;
  $('ajudaSenha').hidden = false;
  $('senha').autocomplete = 'new-password';
  $('btnEnviar').textContent = 'Criar conta';
  $('trocaModo').innerHTML = 'Já tem conta? <a href="/login">Entrar</a>';
  $('contasTeste').hidden = true;
}

// Mantém o ?voltar= ao alternar entre entrar e criar conta
const voltar = params.get('voltar');
if (voltar) {
  const link = $('trocaModo').querySelector('a');
  link.href += '?voltar=' + encodeURIComponent(voltar);
}

// Contas de teste: preenche e-mail e senha
document.querySelectorAll('#contasTeste button').forEach((btn) => {
  btn.addEventListener('click', () => {
    $('email').value = btn.dataset.email;
    $('senha').value = btn.dataset.senha;
    $('btnEnviar').focus();
  });
});

$('formAcesso').addEventListener('submit', async (event) => {
  event.preventDefault();

  const dados = { email: $('email').value.trim(), senha: $('senha').value };
  if (cadastro) dados.nome = $('nome').value.trim();

  if (cadastro && !dados.nome) return mostrarMsg('Informe seu nome.');
  if (!dados.email || !dados.senha) return mostrarMsg('Informe e-mail e senha.');

  const botao = $('btnEnviar');
  const textoBotao = botao.textContent;
  botao.disabled = true;
  botao.textContent = cadastro ? 'Criando conta...' : 'Entrando...';

  try {
    const resp = await fetch(cadastro ? '/auth/cadastro' : '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
    const corpo = await resp.json();

    if (!resp.ok) {
      mostrarMsg(corpo.erro || 'Não foi possível entrar. Tente de novo.');
    } else {
      // O servidor decide o destino: admin vai para /admin, cliente para a loja
      location.href = '/login' + (voltar ? '?voltar=' + encodeURIComponent(voltar) : '');
      return;
    }
  } catch (e) {
    mostrarMsg('Sem conexão com a API. Verifique se o servidor está rodando.');
  }

  botao.disabled = false;
  botao.textContent = textoBotao;
});
