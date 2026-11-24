# Sistema de Supermercado

TDE de Programação Back-End: sistema de supermercado com back-end e interface web para gerenciar produtos, controlar o estoque e realizar vendas.

## Funcionalidades

- **Login e níveis de acesso**: administrador e cliente (página `/login`), com cadastro de novos clientes (`/cadastro`)
- **CRUD de produtos**: cadastrar, listar, editar e excluir (página `/admin`, só para administradores)
- **Loja**: carrinho e simulação de compra (página `/`), com cada venda registrada no nome de quem comprou
- **Baixa automática de estoque** após cada compra, dentro de uma transação
- **Regra de negócio**: 5% de desconto em compras acima de R$ 200,00 (calculado no back-end)
- **Documentação da API** com Swagger em `/docs`

## Contas de teste

Criadas automaticamente na primeira execução:

| Perfil | E-mail | Senha | Acesso |
|---|---|---|---|
| Administrador | `admin@supermercado.com` | `admin123` | Loja e Administração |
| Cliente | `cliente@supermercado.com` | `cliente123` | Só a loja |

Para trocar, defina `ADMIN_EMAIL`, `ADMIN_SENHA`, `CLIENTE_EMAIL` e `CLIENTE_SENHA` antes da primeira execução.

## Permissões

| Ação | Sem login | Cliente | Administrador |
|---|---|---|---|
| Ver loja e produtos | não | sim | sim |
| Comprar | não | sim | sim |
| Ver um pedido | não | só os próprios | todos |
| Listar todos os pedidos | não | não | sim |
| Cadastrar, editar e excluir produtos | não | não | sim |
| Abrir `/admin` | vai para o login | página "Área restrita" (403) | sim |

As permissões são verificadas no servidor, não só escondendo botões: um cliente que chamar `POST /produtos` direto na API recebe `403`.

### Como a autenticação funciona

- As senhas são guardadas como hash **scrypt** com sal aleatório (nunca em texto puro).
- No login, a API gera um token **JWT** (HS256) com o id, o nome e o papel do usuário, válido por 8 horas.
- O token vai num cookie `HttpOnly` e `SameSite=Lax`: o JavaScript da página não consegue lê-lo, e o navegador não o envia em requisições POST vindas de outros sites.
- A API também aceita o token no header `Authorization: Bearer <token>`, que é o que o Swagger usa.
- O segredo que assina os tokens vem da variável `JWT_SECRET`.

## Tecnologias

- Node.js + Express 5
- PostgreSQL 18, imagem `postgres:latest` (driver `pg`)
- HTML, CSS e JavaScript puro no front-end
- Swagger UI (`swagger-ui-express`)
- Docker e Docker Compose
- Autenticação com o módulo `crypto` nativo do Node (scrypt e HMAC-SHA256)

## Como rodar com Docker (recomendado)

Pré-requisito: Docker Desktop instalado e aberto.

```bash
cd docker
docker compose up --build
```

| O quê | Endereço |
|---|---|
| Login | http://localhost:3000/login |
| Loja | http://localhost:3000 |
| Administração | http://localhost:3000/admin |
| Swagger | http://localhost:3000/docs |

As tabelas, os dez produtos de exemplo e as contas de teste são criados automaticamente. Para parar: `docker compose down`. Para apagar também os dados do banco: `docker compose down -v`.

Se você já tinha rodado o projeto com o PostgreSQL 16, rode `docker compose down -v` antes de subir de novo: os dados de uma versão antiga não abrem numa versão nova.

## Como rodar sem Docker

Precisa de um PostgreSQL rodando. O jeito mais simples é subir só o banco pelo Docker:

```bash
cd docker
docker compose up -d db
cd ../backend
npm install
npm start
```

Por padrão a API conecta em `postgres://supermercado:supermercado@localhost:5432/supermercado`. Para usar outro banco, defina a variável `DATABASE_URL`. Sem `JWT_SECRET`, um segredo aleatório é gerado a cada inicialização (e é preciso entrar de novo quando a API reinicia).

## Endpoints

| Método | Rota | Acesso | Descrição |
|---|---|---|---|
| POST | `/auth/login` | público | Entra no sistema |
| POST | `/auth/cadastro` | público | Cria uma conta de cliente |
| POST | `/auth/logout` | público | Sai do sistema |
| GET | `/auth/me` | logado | Usuário da sessão |
| GET | `/produtos` | logado | Lista os produtos |
| GET | `/produtos/:id` | logado | Busca um produto |
| POST | `/produtos` | admin | Cadastra um produto |
| PUT | `/produtos/:id` | admin | Atualiza um produto |
| DELETE | `/produtos/:id` | admin | Exclui um produto (as vendas antigas mantêm o nome dele) |
| POST | `/vendas` | logado | Realiza uma compra: `{ "itens": [{ "produto_id": 1, "quantidade": 2 }] }` |
| GET | `/vendas` | admin | Lista os pedidos com o nome do cliente |
| GET | `/vendas/:id` | logado | Detalha um pedido (cliente só vê os próprios) |
| GET | `/health` | público | Verifica a API e o banco |

## Estrutura

```
backend/
  src/
    auth/          hash de senha (senha.js) e token JWT (token.js)
    database/      conexão (db.js), schema.sql e seed.sql
    docs/          especificação OpenAPI do Swagger
    middlewares/   verificação de login e de papel (auth.js)
    repositories/  acesso a produtos e usuários
    routes/        rotas de autenticação, produtos e vendas
    services/      regra de venda (desconto e baixa de estoque)
    server.js      páginas, rotas da API e proteção de acesso
frontend/          loja.html, admin.html, login.html, acesso-negado.html, css e js
docker/            Dockerfile e docker-compose.yml
```
