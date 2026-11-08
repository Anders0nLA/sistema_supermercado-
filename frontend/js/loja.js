const API_PRODUTOS = '/produtos';
const API_VENDAS = '/vendas';
const LIMITE_DESCONTO = 200;

let produtos = [];
let carrinho = {}; // { produto_id: quantidade }
let ultimoAlterado = null; // id do item que acabou de mudar (para destacar no cupom)

const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const $ = (id) => document.getElementById(id);

// Remove acentos para a busca: "acucar" encontra "Açúcar"
const normalizar = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function mostrarMsg(texto, tipo) {
  const el = $('msg');
  el.textContent = texto;
  el.className = `msg ${tipo}`;
  el.hidden = false;
}

async function carregarProdutos() {
  try {
    const resp = await api(API_PRODUTOS);
    produtos = await resp.json();
  } catch (e) {
    produtos = [];
    mostrarMsg('Não foi possível carregar os produtos. Verifique se a API está rodando.', 'erro');
  }
  renderProdutos();
  renderCupom();
}

// ---------- Gôndola ----------

function etiquetaHTML(preco) {
  const [reais, centavos] = preco.toFixed(2).split('.');
  return `<span class="moeda">R$</span><span class="reais">${Number(reais).toLocaleString('pt-BR')}</span><span class="centavos">,${centavos}</span>`;
}

function textoEstoque(qtd) {
  if (qtd <= 0) return 'Esgotado';
  if (qtd <= 5) return qtd === 1 ? 'Resta 1' : `Restam ${qtd}`;
  return `${qtd} em estoque`;
}

function renderProdutos() {
  const lista = $('gondola');
  const termo = normalizar($('busca').value.trim());
  const visiveis = termo ? produtos.filter((p) => normalizar(p.nome).includes(termo)) : produtos;

  $('contagem').textContent = termo
    ? `${visiveis.length} de ${produtos.length} produtos`
    : `${produtos.length} ${produtos.length === 1 ? 'produto' : 'produtos'}`;

  if (produtos.length === 0) {
    lista.innerHTML = '<li class="vazio">Nenhum produto cadastrado ainda. Cadastre produtos na Administração.</li>';
    return;
  }
  if (visiveis.length === 0) {
    lista.innerHTML = '';
    const li = document.createElement('li');
    li.className = 'vazio';
    li.textContent = `Nenhum produto encontrado para "${$('busca').value.trim()}".`;
    lista.appendChild(li);
    return;
  }

  lista.innerHTML = '';
  for (const p of visiveis) {
    const noCarrinho = carrinho[p.id] || 0;
    const esgotado = p.quantidade_estoque <= 0;
    const noLimite = noCarrinho >= p.quantidade_estoque;

    const li = document.createElement('li');
    li.className = 'produto' + (esgotado ? ' esgotado' : '');
    li.dataset.id = p.id;
    li.innerHTML = `
      <h3 class="produto-nome"></h3>
      <div class="etiqueta">${etiquetaHTML(p.preco)}</div>
      <div class="produto-rodape">
        <span class="estoque ${p.quantidade_estoque > 0 && p.quantidade_estoque <= 5 ? 'pouco' : ''}">${textoEstoque(p.quantidade_estoque)}</span>
        ${noCarrinho > 0
          ? `<div class="passo">
               <button class="menos" aria-label="Tirar um">−</button>
               <output aria-label="Quantidade no cupom">${noCarrinho}</output>
               <button class="mais" aria-label="Adicionar mais um" ${noLimite ? 'disabled' : ''}>+</button>
             </div>`
          : esgotado ? '' : '<button class="btn-add">Adicionar</button>'}
      </div>`;

    li.querySelector('.produto-nome').textContent = p.nome;
    const nomeAcessivel = (acao) => `${acao} ${p.nome}`;
    if (noCarrinho > 0) {
      li.querySelector('.menos').setAttribute('aria-label', nomeAcessivel('Tirar um'));
      li.querySelector('.mais').setAttribute('aria-label', nomeAcessivel('Adicionar mais um'));
      li.querySelector('.menos').addEventListener('click', () => alterarQtd(p.id, -1));
      li.querySelector('.mais').addEventListener('click', () => alterarQtd(p.id, 1));
    } else if (!esgotado) {
      const btn = li.querySelector('.btn-add');
      btn.setAttribute('aria-label', nomeAcessivel('Adicionar'));
      btn.addEventListener('click', () => alterarQtd(p.id, 1));
    }
    lista.appendChild(li);
  }
}

function alterarQtd(id, delta) {
  const p = produtos.find((x) => x.id === id);
  const nova = (carrinho[id] || 0) + delta;

  if (nova <= 0) delete carrinho[id];
  else if (nova <= p.quantidade_estoque) carrinho[id] = nova;

  ultimoAlterado = nova > 0 ? id : null;
  $('msg').hidden = true;

  // Mantém o foco no controle do mesmo produto depois de redesenhar
  const focoMais = document.activeElement && document.activeElement.classList.contains('mais');
  renderProdutos();
  renderCupom();
  restaurarFoco(id, delta > 0 && (focoMais || nova === 1) ? '.mais' : '.menos');
}

function restaurarFoco(id, seletor) {
  const li = $('gondola').querySelector(`[data-id="${id}"]`);
  if (!li) return;
  const alvo = [seletor, '.btn-add', '.menos']
    .map((s) => li.querySelector(s))
    .find((el) => el && !el.disabled);
  if (alvo) alvo.focus();
}

// ---------- Cupom ----------

// Prévia visual. Quem calcula de verdade é o back-end (vendaService).
function calcularPrevia() {
  let subtotal = 0;
  for (const [id, qtd] of Object.entries(carrinho)) {
    const p = produtos.find((x) => x.id === Number(id));
    if (p) subtotal += p.preco * qtd;
  }
  subtotal = Math.round(subtotal * 100) / 100;
  const desconto = subtotal > LIMITE_DESCONTO ? Math.round(subtotal * 0.05 * 100) / 100 : 0;
  return { subtotal, desconto, total: Math.round((subtotal - desconto) * 100) / 100 };
}

function renderCupom() {
  const lista = $('itens');
  const ids = Object.keys(carrinho);
  lista.innerHTML = ids.length ? '' : '<li class="vazio">Nenhum item ainda.</li>';

  for (const id of ids) {
    const p = produtos.find((x) => x.id === Number(id));
    if (!p) continue;
    const qtd = carrinho[id];

    const li = document.createElement('li');
    li.className = 'cupom-item' + (Number(id) === ultimoAlterado ? ' mudou' : '');
    li.innerHTML = `
      <span class="nome"></span>
      <span class="conta">${qtd} x ${p.preco.toFixed(2).replace('.', ',')}</span>
      <span class="valor">${(p.preco * qtd).toFixed(2).replace('.', ',')}</span>
      <button class="remover" title="Remover do cupom">×</button>`;
    li.querySelector('.nome').textContent = p.nome;
    const remover = li.querySelector('.remover');
    remover.setAttribute('aria-label', `Remover ${p.nome} do cupom`);
    remover.addEventListener('click', () => alterarQtd(p.id, -qtd));
    lista.appendChild(li);
  }
  ultimoAlterado = null;

  const { subtotal, desconto, total } = calcularPrevia();
  $('subtotal').textContent = brl(subtotal);
  $('desconto').textContent = '- ' + brl(desconto);
  $('linhaDesconto').classList.toggle('ativo', desconto > 0);
  $('total').textContent = brl(total);
  $('btnFinalizar').disabled = ids.length === 0;

  const qtdItens = Object.values(carrinho).reduce((a, b) => a + b, 0);
  $('barraCupom').hidden = qtdItens === 0;
  $('barraTexto').textContent = `${qtdItens} ${qtdItens === 1 ? 'item' : 'itens'}, ${brl(total)}`;

  // Quanto falta para o desconto
  const meta = $('meta');
  const atingida = subtotal > LIMITE_DESCONTO;
  meta.classList.toggle('atingida', atingida);
  $('metaBarra').style.width = Math.min(subtotal / LIMITE_DESCONTO, 1) * 100 + '%';
  if (atingida) {
    $('metaTexto').textContent = 'Desconto de 5% aplicado.';
  } else if (subtotal === 0) {
    $('metaTexto').textContent = 'Compras acima de R$ 200,00 ganham 5% de desconto.';
  } else {
    const falta = Math.max(LIMITE_DESCONTO - subtotal + 0.01, 0.01);
    $('metaTexto').textContent = `Faltam ${brl(falta)} para ganhar 5% de desconto.`;
  }
}

async function finalizarCompra() {
  const itens = Object.entries(carrinho).map(([id, qtd]) => ({
    produto_id: Number(id),
    quantidade: qtd,
  }));

  const botao = $('btnFinalizar');
  botao.disabled = true;
  botao.textContent = 'Finalizando...';

  try {
    const resp = await api(API_VENDAS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itens }),
    });
    const dados = await resp.json();

    if (!resp.ok) {
      mostrarMsg(dados.erro || 'A compra não foi finalizada. Tente de novo.', 'erro');
    } else {
      carrinho = {};
      mostrarMsg(
        `Compra nº ${dados.id} finalizada. Total pago: ${brl(dados.valor_final)}` +
          (dados.desconto > 0 ? `, com ${brl(dados.desconto)} de desconto.` : '.'),
        'ok'
      );
    }
  } catch (e) {
    mostrarMsg('Sem conexão com a API. A compra não foi finalizada.', 'erro');
  }

  botao.textContent = 'Finalizar compra';
  await carregarProdutos(); // atualiza o estoque na tela
}

$('btnFinalizar').addEventListener('click', finalizarCompra);
$('busca').addEventListener('input', renderProdutos);
carregarProdutos();
