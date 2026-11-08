const express = require('express');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');

const db = require('./database/db');
const swaggerSpec = require('./docs/swagger');
const produtoRoutes = require('./routes/produtoRoutes');
const vendaRoutes = require('./routes/vendaRoutes');
const { router: authRoutes } = require('./routes/authRoutes');
const { identificarUsuario, paginaExigeLogin } = require('./middlewares/auth');

const app = express();
app.use(cors());
app.use(express.json());
app.use(identificarUsuario); // lê o token (se houver) e preenche req.usuario

// ---------- Páginas ----------
const FRONTEND = path.join(__dirname, '../../frontend');
const pagina = (arquivo) => path.join(FRONTEND, arquivo);

// Para onde cada perfil vai depois do login
const inicioDo = (usuario) => (usuario.papel === 'admin' ? '/admin' : '/');

// Só aceita caminhos internos no ?voltar= (evita redirecionar para outro site)
function destinoSeguro(voltar, usuario) {
  if (typeof voltar === 'string' && voltar.startsWith('/') && !voltar.startsWith('//')) {
    if (voltar.startsWith('/admin') && usuario.papel !== 'admin') return '/';
    return voltar;
  }
  return inicioDo(usuario);
}

app.get(['/login', '/cadastro'], (req, res) => {
  if (req.usuario) return res.redirect(destinoSeguro(req.query.voltar, req.usuario));
  res.sendFile(pagina('login.html'));
});

app.get('/sair', (req, res) => {
  res.clearCookie('token', { path: '/' });
  res.redirect('/login');
});

app.get('/', paginaExigeLogin, (req, res) => res.sendFile(pagina('loja.html')));

app.get('/admin', paginaExigeLogin, (req, res) => {
  if (req.usuario.papel !== 'admin') {
    return res.status(403).sendFile(pagina('acesso-negado.html'));
  }
  res.sendFile(pagina('admin.html'));
});

// Endereços antigos continuam funcionando
app.get('/loja.html', (req, res) => res.redirect('/'));
app.get('/admin.html', (req, res) => res.redirect('/admin'));

// Arquivos estáticos (os .html só são acessados pelas rotas acima)
app.use('/css', express.static(path.join(FRONTEND, 'css')));
app.use('/js', express.static(path.join(FRONTEND, 'js')));

// ---------- API ----------

app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ok', banco: 'conectado' });
  } catch (e) {
    res.status(503).json({ erro: 'Banco de dados indisponível.' });
  }
});

// Documentação Swagger
app.get('/docs.json', (req, res) => res.json(swaggerSpec));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'API Supermercado - Swagger',
  swaggerOptions: { persistAuthorization: true },
}));

app.use('/auth', authRoutes);
app.use('/produtos', produtoRoutes);
app.use('/vendas', vendaRoutes);

// Erros não tratados nas rotas (o Express 5 repassa erros de funções async para cá)
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON inválido no corpo da requisição.' });
  }
  console.error(err);
  res.status(500).json({ erro: 'Erro interno do servidor.' });
});

const PORT = process.env.PORT || 3000;

db.inicializar()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Loja:    http://localhost:${PORT}`);
      console.log(`Swagger: http://localhost:${PORT}/docs`);
    });
  })
  .catch((e) => {
    console.error('Não foi possível conectar ao PostgreSQL:', e.message);
    process.exit(1);
  });
