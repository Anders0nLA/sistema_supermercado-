// Compartilhado pela loja e pela administração:
// mostra quem está logado no topo e trata sessão expirada.

function irParaLogin() {
  location.href = '/login?voltar=' + encodeURIComponent(location.pathname);
}

// fetch que redireciona para o login se a sessão tiver expirado
async function api(url, opcoes) {
  const resp = await fetch(url, opcoes);
  if (resp.status === 401) {
    irParaLogin();
    throw new Error('Sessão expirada');
  }
  return resp;
}

const sessao = (async () => {
  const resp = await fetch('/auth/me');
  if (!resp.ok) {
    irParaLogin();
    return null;
  }
  const usuario = await resp.json();

  document.getElementById('usuarioNome').textContent = usuario.nome;
  document.getElementById('usuarioPapel').textContent =
    usuario.papel === 'admin' ? 'Administrador' : 'Cliente';
  document.querySelectorAll('[data-so-admin]').forEach((el) => {
    el.hidden = usuario.papel !== 'admin';
  });
  return usuario;
})();
