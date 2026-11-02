const express = require('express');
const cors = require('cors');
require('./database/db'); // garante que as tabelas existam

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.json({ status: 'Funcinando' }));

const vendaRoutes = require('./routes/vendaRoutes');
app.use('/vendas', vendaRoutes);


const produtoRoutes = require('./routes/produtoRoutes');
app.use('/produtos', produtoRoutes);

const path = require('path');
app.use(express.static(path.join(__dirname, '../../frontend')));

app.listen(3000, () => console.log('Rodando em http://localhost:3000'));
