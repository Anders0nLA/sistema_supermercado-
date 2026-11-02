const express = require('express');
const cors = require('cors');
require('./database/db'); // garante que as tabelas existam

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.json({ status: 'Funcinando' }));

app.listen(3000, () => console.log('Rodando em http://localhost:3000'));