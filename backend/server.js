const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

const SENHA_PAINEL = process.env.SENHA_PAINEL || 'mmservice2024';
const WHATSAPP_OFICINA = process.env.WHATSAPP || '5522999999999';
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads', req.params.id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).substr(2, 6)}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 200 * 1024 * 1024 } });

app.post('/api/auth', (req, res) => {
  const { senha } = req.body;
  if (senha === SENHA_PAINEL) {
    res.json({ ok: true });
  } else {
    res.status(401).json({ ok: false, erro: 'Senha incorreta' });
  }
});

app.post('/api/atendimentos', async (req, res) => {
  const { nome, telefone, veiculo, placa, ano, problema } = req.body;
  if (!nome || !telefone || !veiculo || !placa || !ano) {
    return res.status(400).json({ erro: 'Campos obrigatórios faltand