const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'data.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS atendimentos (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    telefone TEXT NOT NULL,
    veiculo TEXT NOT NULL,
    placa TEXT NOT NULL,
    ano TEXT NOT NULL,
    problema TEXT,
    status_atual INTEGER DEFAULT 1,
    ativo INTEGER DEFAULT 1,
    criado_em TEXT NOT NULL,
    atualizado_em TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS status_historico (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    atendimento_id TEXT NOT NULL,
    etapa INTEGER NOT NULL,
    observacao TEXT,
    criado_em TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS midias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    atendimento_id TEXT NOT NULL,
    etapa INTEGER NOT NULL,
    tipo TEXT NOT NULL,
    filename TEXT NOT NULL,
    criado_em TEXT NOT NULL
  );
`);

module.exports = db;