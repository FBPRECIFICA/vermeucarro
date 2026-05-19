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

app.post('/api/atendimentos', (req, res) => {
  const { nome, telefone, veiculo, placa, ano, problema } = req.body;
  if (!nome || !telefone || !veiculo || !placa || !ano) {
    return res.status(400).json({ erro: 'Campos obrigatórios faltando' });
  }
  const id = uuidv4().replace(/-/g, '').substr(0, 12).toUpperCase();
  const agora = new Date().toISOString();

  db.run(
    `INSERT INTO atendimentos (id, nome, telefone, veiculo, placa, ano, problema, status_atual, ativo, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)`,
    [id, nome, telefone.replace(/\D/g, ''), veiculo, placa.toUpperCase(), ano, problema || '', agora, agora],
    function(err) {
      if (err) return res.status(500).json({ erro: err.message });
      db.run(
        `INSERT INTO status_historico (atendimento_id, etapa, observacao, criado_em) VALUES (?, 1, ?, ?)`,
        [id, 'Veículo recepcionado na MM ServiceCar.', agora]
      );
      const link = `${BASE_URL}/cliente.html?id=${id}`;
      res.json({ id, link });
    }
  );
});

app.get('/api/atendimentos', (req, res) => {
  db.all(`SELECT * FROM atendimentos WHERE ativo = 1 ORDER BY criado_em DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ erro: err.message });
    res.json(rows);
  });
});

app.get('/api/historico', (req, res) => {
  db.all(`SELECT * FROM atendimentos WHERE ativo = 0 ORDER BY atualizado_em DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ erro: err.message });
    res.json(rows);
  });
});

app.get('/api/atendimentos/:id', (req, res) => {
  db.get(`SELECT * FROM atendimentos WHERE id = ?`, [req.params.id], (err, at) => {
    if (err) return res.status(500).json({ erro: err.message });
    if (!at) return res.status(404).json({ erro: 'Atendimento não encontrado' });
    db.all(`SELECT * FROM status_historico WHERE atendimento_id = ? ORDER BY etapa ASC`, [req.params.id], (err2, historico) => {
      db.all(`SELECT * FROM midias WHERE atendimento_id = ? ORDER BY criado_em ASC`, [req.params.id], (err3, midias) => {
        res.json({ ...at, historico: historico || [], midias: midias || [] });
      });
    });
  });
});

app.post('/api/atendimentos/:id/status', upload.fields([
  { name: 'fotos', maxCount: 10 },
  { name: 'video', maxCount: 1 }
]), (req, res) => {
  const { etapa, observacao } = req.body;
  const novaEtapa = parseInt(etapa);
  const agora = new Date().toISOString();

  db.run(`UPDATE atendimentos SET status_atual = ?, atualizado_em = ? WHERE id = ?`,
    [novaEtapa, agora, req.params.id], function(err) {
      if (err) return res.status(500).json({ erro: err.message });
      db.run(`INSERT INTO status_historico (atendimento_id, etapa, observacao, criado_em) VALUES (?, ?, ?, ?)`,
        [req.params.id, novaEtapa, observacao || '', agora]);
      if (req.files) {
        if (req.files.fotos) {
          req.files.fotos.forEach(f => {
            db.run(`INSERT INTO midias (atendimento_id, etapa, tipo, filename, criado_em) VALUES (?, ?, ?, ?, ?)`,
              [req.params.id, novaEtapa, 'foto', f.filename, agora]);
          });
        }
        if (req.files.video) {
          req.files.video.forEach(f => {
            db.run(`INSERT INTO midias (atendimento_id, etapa, tipo, filename, criado_em) VALUES (?, ?, ?, ?, ?)`,
              [req.params.id, novaEtapa, 'video', f.filename, agora]);
          });
        }
      }
      res.json({ ok: true });
    });
});

app.post('/api/atendimentos/:id/encerrar', (req, res) => {
  db.run(`UPDATE atendimentos SET ativo = 0, atualizado_em = ? WHERE id = ?`,
    [new Date().toISOString(), req.params.id], function(err) {
      if (err) return res.status(500).json({ erro: err.message });
      res.json({ ok: true });
    });
});

app.get('/api/config', (req, res) => {
  res.json({ whatsapp: WHATSAPP_OFICINA, baseUrl: BASE_URL });
});

app.listen(PORT, () => {
  console.log(`\n🚗 MM ServiceCar rodando em http://localhost:${PORT}`);
  console.log(`📋 Painel: http://localhost:${PORT}/painel.html`);
  console.log(`🔑 Senha: ${SENHA_PAINEL}\n`);
});