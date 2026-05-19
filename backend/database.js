const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function init() {
  await pool.query(`
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
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS status_historico (
      id SERIAL PRIMARY KEY,
      atendimento_id TEXT NOT NULL,
      etapa INTEGER NOT NULL,
      observacao TEXT,
      criado_em TEXT NOT NULL
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS midias (
      id SERIAL PRIMARY KEY,
      atendimento_id TEXT NOT NULL,
      etapa INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      filename TEXT NOT NULL,
      criado_em TEXT NOT NULL
    )
  `);
}

init().catch(console.error);

module.exports = pool;