// Especificação OpenAPI 3 da API do supermercado (exibida em /docs)

const erro = (descricao) => ({
  description: descricao,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } },
});

const json = (ref, descricao) => ({
  description: descricao,
  content: { 'application/json': { schema: { $ref: `#/components/schemas/${ref}` } } },
});

const parametroId = (descricao) => ({
  name: 'id',
  in: 'path',
  required: true,
  description: descricao,
  schema: { type: 'integer', minimum: 1 },
});

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'API Sistema de Supermercado',
    version: '1.0.0',
    description:
      'API do TDE de Programação Back-End: CRUD de produtos, vendas com baixa automática ' +
      'de estoque e 5% de desconto em compras acima de R$ 200,00.\n\n' +
      '**Autenticação:** faça login em `POST /auth/login`, copie o `token` da resposta e clique em ' +
      '**Authorize**. Se você já entrou no site neste navegador, o cookie de sessão é enviado automaticamente.\n\n' +
      'Contas de teste: `admin@supermercado.com` / `admin123` (administrador) e ' +
      '`cliente@supermercado.com` / `cliente123` (cliente).',
  },
  servers: [{ url: '/', description: 'Servidor atual' }],
  tags: [
    { name: 'Autenticação', description: 'Login, cadastro de clientes e sessão' },
    { name: 'Produtos', description: 'Cadastro e controle de estoque' },
    { name: 'Vendas', description: 'Simulação de compra e pedidos' },
    { name: 'Status', description: 'Saúde da API' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Status'],
        summary: 'Verifica se a API e o banco estão no ar',
        responses: {
          200: {
            description: 'API funcionando',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    banco: { type: 'string', example: 'conectado' },
                  },
                },
              },
            },
          },
          503: erro('Banco de dados indisponível'),
        },
      },
    },
    '/produtos': {
      get: {
        tags: ['Produtos'],
        summary: 'Lista todos os produtos (ordenados por nome)',
        responses: {
          200: {
            description: 'Lista de produtos',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Produto' } },
              },
            },
          },
        },
      },
      post: {
        tags: ['Produtos'],
        summary: 'Cadastra um produto',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ProdutoInput' } } },
        },
        responses: {
          201: json('Produto', 'Produto criado'),
          400: erro('Dados inválidos'),
        },
      },
    },
    '/produtos/{id}': {
      parameters: [parametroId('ID do produto')],
      get: {
        tags: ['Produtos'],
        summary: 'Busca um produto pelo ID',
        responses: {
          200: json('Produto', 'Produto encontrado'),
          404: erro('Produto não encontrado'),
        },
      },
      put: {
        tags: ['Produtos'],
        summary: 'Atualiza um produto',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ProdutoInput' } } },
        },
        responses: {
          200: json('Produto', 'Produto atualizado'),
          400: erro('Dados inválidos'),
          404: erro('Produto não encontrado'),
        },
      },
      delete: {
        tags: ['Produtos'],
        summary: 'Exclui um produto',
        responses: {
          204: { description: 'Produto excluído' },
          404: erro('Produto não encontrado'),
        },
      },
    },
    '/vendas': {
      get: {
        tags: ['Vendas'],
        summary: 'Lista os pedidos (mais recentes primeiro)',
        responses: {
          200: {
            description: 'Lista de vendas',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/VendaResumo' } },
              },
            },
          },
        },
      },
      post: {
        tags: ['Vendas'],
        summary: 'Realiza uma compra',
        description:
          'Valida o estoque, calcula o total com o preço do banco, aplica 5% de desconto se o ' +
          'subtotal for maior que R$ 200,00 e dá baixa no estoque. Tudo em uma única transação.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/VendaInput' } } },
        },
        responses: {
          201: json('VendaCriada', 'Compra realizada'),
          400: erro('Carrinho vazio ou item inválido'),
          404: erro('Produto não encontrado'),
          409: erro('Estoque insuficiente'),
        },
      },
    },
    '/vendas/{id}': {
      parameters: [parametroId('ID da venda')],
      get: {
        tags: ['Vendas'],
        summary: 'Detalha um pedido com seus itens',
        responses: {
          200: json('VendaDetalhe', 'Pedido encontrado'),
          404: erro('Pedido não encontrado'),
        },
      },
    },
  },
  components: {
    schemas: {
      Erro: {
        type: 'object',
        properties: { erro: { type: 'string', example: 'Produto não encontrado.' } },
      },
      ProdutoInput: {
        type: 'object',
        required: ['nome', 'preco', 'quantidade_estoque'],
        properties: {
          nome: { type: 'string', example: 'Arroz 5kg' },
          preco: { type: 'number', minimum: 0, example: 25.9 },
          quantidade_estoque: { type: 'integer', minimum: 0, example: 50 },
        },
      },
      Produto: {
        allOf: [
          { type: 'object', properties: { id: { type: 'integer', example: 1 } } },
          { $ref: '#/components/schemas/ProdutoInput' },
        ],
      },
      VendaInput: {
        type: 'object',
        required: ['itens'],
        properties: {
          itens: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['produto_id', 'quantidade'],
              properties: {
                produto_id: { type: 'integer', example: 1 },
                quantidade: { type: 'integer', minimum: 1, example: 8 },
              },
            },
          },
        },
      },
      Totais: {
        type: 'object',
        properties: {
          valor_bruto: { type: 'number', example: 207.2 },
          desconto: { type: 'number', example: 10.36 },
          valor_final: { type: 'number', example: 196.84 },
        },
      },
      ItemVenda: {
        type: 'object',
        properties: {
          produto_id: { type: 'integer', example: 1 },
          nome: { type: 'string', example: 'Arroz 5kg' },
          quantidade: { type: 'integer', example: 8 },
          preco_unitario: { type: 'number', example: 25.9 },
        },
      },
      VendaCriada: {
        allOf: [
          {
            type: 'object',
            properties: {
              id: { type: 'integer', example: 1 },
              data: { type: 'string', format: 'date-time' },
            },
          },
          { $ref: '#/components/schemas/Totais' },
          {
            type: 'object',
            properties: {
              itens: { type: 'array', items: { $ref: '#/components/schemas/ItemVenda' } },
            },
          },
        ],
      },
      VendaResumo: {
        allOf: [
          {
            type: 'object',
            properties: {
              id: { type: 'integer', example: 1 },
              data: { type: 'string', format: 'date-time' },
              total_itens: { type: 'integer', example: 8 },
            },
          },
          { $ref: '#/components/schemas/Totais' },
        ],
      },
      VendaDetalhe: {
        allOf: [
          {
            type: 'object',
            properties: {
              id: { type: 'integer', example: 1 },
              data: { type: 'string', format: 'date-time' },
            },
          },
          { $ref: '#/components/schemas/Totais' },
          {
            type: 'object',
            properties: {
              itens: {
                type: 'array',
                items: {
                  allOf: [
                    { $ref: '#/components/schemas/ItemVenda' },
                    { type: 'object', properties: { subtotal: { type: 'number', example: 207.2 } } },
                  ],
                },
              },
            },
          },
        ],
      },
    },
  },
};

// ---------- Autenticação e permissões ----------

const usuarioSchema = {
  type: 'object',
  properties: {
    id: { type: 'integer', example: 1 },
    nome: { type: 'string', example: 'Administrador' },
    email: { type: 'string', example: 'admin@supermercado.com' },
    papel: { type: 'string', enum: ['admin', 'cliente'] },
  },
};

spec.components.schemas.Usuario = usuarioSchema;
spec.components.schemas.Sessao = {
  type: 'object',
  properties: {
    usuario: { $ref: '#/components/schemas/Usuario' },
    token: { type: 'string', description: 'Use em Authorize (Bearer)' },
  },
};

spec.components.securitySchemes = {
  bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
  cookieAuth: { type: 'apiKey', in: 'cookie', name: 'token' },
};

const corpoJson = (props, required, exemplo) => ({
  required: true,
  content: {
    'application/json': {
      schema: { type: 'object', required, properties: props },
      example: exemplo,
    },
  },
});

spec.paths['/auth/login'] = {
  post: {
    tags: ['Autenticação'],
    summary: 'Entra no sistema',
    description: 'Grava o token num cookie HttpOnly e também o devolve no corpo.',
    requestBody: corpoJson(
      { email: { type: 'string' }, senha: { type: 'string' } },
      ['email', 'senha'],
      { email: 'admin@supermercado.com', senha: 'admin123' }
    ),
    responses: {
      200: json('Sessao', 'Login feito'),
      400: erro('E-mail ou senha não informados'),
      401: erro('E-mail ou senha incorretos'),
    },
  },
};

spec.paths['/auth/cadastro'] = {
  post: {
    tags: ['Autenticação'],
    summary: 'Cria uma conta de cliente',
    description: 'Contas criadas por aqui são sempre de cliente. Já entra logado.',
    requestBody: corpoJson(
      { nome: { type: 'string' }, email: { type: 'string' }, senha: { type: 'string', minLength: 6 } },
      ['nome', 'email', 'senha'],
      { nome: 'Maria Souza', email: 'maria@email.com', senha: 'segredo1' }
    ),
    responses: {
      201: json('Sessao', 'Conta criada'),
      400: erro('Dados inválidos'),
      409: erro('E-mail já cadastrado'),
    },
  },
};

spec.paths['/auth/logout'] = {
  post: {
    tags: ['Autenticação'],
    summary: 'Sai do sistema (apaga o cookie)',
    responses: { 204: { description: 'Sessão encerrada' } },
  },
};

spec.paths['/auth/me'] = {
  get: {
    tags: ['Autenticação'],
    summary: 'Mostra o usuário logado',
    security: [{ bearerAuth: [] }, { cookieAuth: [] }],
    responses: {
      200: json('Usuario', 'Usuário da sessão'),
      401: erro('Não logado'),
    },
  },
};

// Quem pode chamar cada operação
const permissoes = {
  'GET /produtos': 'logado',
  'POST /produtos': 'admin',
  'GET /produtos/{id}': 'logado',
  'PUT /produtos/{id}': 'admin',
  'DELETE /produtos/{id}': 'admin',
  'GET /vendas': 'admin',
  'POST /vendas': 'logado',
  'GET /vendas/{id}': 'logado',
};

for (const [chave, nivel] of Object.entries(permissoes)) {
  const [metodo, caminho] = chave.split(' ');
  const op = spec.paths[caminho][metodo.toLowerCase()];
  op.security = [{ bearerAuth: [] }, { cookieAuth: [] }];
  op.responses[401] = erro('Não logado');
  if (nivel === 'admin') {
    op.summary += ' (somente administrador)';
    op.responses[403] = erro('Conta sem permissão');
  }
}

spec.paths['/vendas/{id}'].get.description =
  'Administrador vê qualquer pedido; cliente vê apenas os próprios (outros retornam 404).';

module.exports = spec;
