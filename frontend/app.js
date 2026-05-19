const ETAPAS_NOMES = [
  '',
  '🏁 Veículo Recepcionado',
  '🔍 Em Diagnóstico',
  '📸 Coletando Evidências',
  '💰 Encaminhado p/ Orçamento',
  '📨 Orçamento Enviado',
  '✅ Orçamento Aprovado',
  '⚙️ Em Serviço',
  '🎉 Concluído'
];

let linkAtual = '';
let idAtualModal = '';
let etapaSelecionada = null;

document.getElementById('input-senha')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') fazerLogin();
});

async function fazerLogin() {
  const senha = document.getElementById('input-senha').value;
  try {
    const r = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senha })
    });
    if (r.ok) {
      sessionStorage.setItem('auth', '1');
      document.getElementById('tela-login').classList.add('hidden');
      document.getElementById('tela-painel').classList.remove('hidden');
      carregarAtivos();
    } else {
      document.getElementById('login-erro').classList.remove('hidden');
    }
  } catch {
    alert('Erro de conexão com o servidor.');
  }
}

function logout() {
  sessionStorage.removeItem('auth');
  location.reload();
}

window.addEventListener('DOMContentLoaded', () => {
  if (sessionStorage.getItem('auth')) {
    document.getElementById('tela-login').classList.add('hidden');
    document.getElementById('tela-painel').classList.remove('hidden');
    carregarAtivos();
  }
});

function mudarAba(aba, btn) {
  document.querySelectorAll('.aba-btn').forEach(b => b.classList.remove('ativa'));
  btn.classList.add('ativa');
  document.getElementById('aba-cadastro').classList.add('hidden');
  document.getElementById('aba-ativos').classList.add('hidden');
  document.getElementById('aba-historico').classList.add('hidden');
  document.getElementById(`aba-${aba}`).classList.remove('hidden');
  if (aba === 'ativos') carregarAtivos();
  if (aba === 'historico') carregarHistorico();
}

async function cadastrar() {
  const nome = document.getElementById('f-nome').value.trim();
  const telefone = document.getElementById('f-tel').value.trim();
  const veiculo = document.getElementById('f-veiculo').value.trim();
  const placa = document.getElementById('f-placa').value.trim();
  const ano = document.getElementById('f-ano').value.trim();
  const problema = document.getElementById('f-problema').value.trim();

  if (!nome || !telefone || !veiculo || !placa || !ano) {
    alert('Preencha todos os campos obrigatorios.');
    return;
  }

  try {
    const r = await fetch('/api/atendimentos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, telefone, veiculo, placa, ano, problema })
    });
    const d = await r.json();
    if (!r.ok) { alert(d.erro || 'Erro ao cadastrar.'); return; }

    linkAtual = d.link;
    document.getElementById('link-url-texto').textContent = d.link;

    const canvas = document.getElementById('qr-code');
    QRCode.toCanvas(canvas, d.link, { width: 120, margin: 1 });

    const msg = encodeURIComponent(
      `Ola ${nome}! Seu veiculo ja esta conosco. Acompanhe o progresso do servico em tempo real: ${d.link}`
    );
    const tel = telefone.replace(/\D/g, '');
    const telFull = tel.startsWith('55') ? tel : `55${tel}`;
    document.getElementById('btn-whatsapp-envio').href = `https://wa.me/${telFull}?text=${msg}`;
    document.getElementById('link-gerado-box').classList.remove('hidden');
  } catch {
    alert('Erro de conexao com o servidor.');
  }
}

function copiarLink() {
  navigator.clipboard.writeText(linkAtual).then(() => alert('Link copiado!'));
}

function novoAtendimento() {
  ['f-nome', 'f-tel', 'f-veiculo', 'f-placa', 'f-ano', 'f-problema'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('link-gerado-box').classList.add('hidden');
}

async function carregarAtivos() {
  try {
    const r = await fetch('/api/atendimentos');
    const lista = await r.json();
    document.getElementById('contador-ativos').textContent =
      lista.length ? `${lista.length} ativo${lista.length > 1 ? 's' : ''}` : '';
    document.getElementById('badge-ativos').textContent =
      lista.length ? ` (${lista.length})` : '';
    renderAtivos(lista);
  } catch {
    document.getElementById('lista-ativos').innerHTML =
      '<p style="color:red;text-align:center">Erro ao carregar atendimentos.</p>';
  }
}

function diasDesdeData(isoStr) {
  return Math.floor((Date.now() - new Date(isoStr).getTime()) / 86400000);
}

function renderAtivos(lista) {
  const div = document.getElementById('lista-ativos');
  if (!lista.length) {
    div.innerHTML = `<div style="text-align:center;padding:60px;color:#aaa">
      <i class="fa fa-car" style="font-size:48px;margin-bottom:16px;opacity:.3"></i>
      <p>Nenhum atendimento ativo no momento.</p>
    </div>`;
    return;
  }
  div.innerHTML = lista.map(a => {
    const dias = diasDesdeData(a.criado_em);
    let classeDias = 'normal';
    if (dias >= 5) classeDias = 'critico';
    else if (dias >= 3) classeDias = 'alerta';
    const link = `${location.origin}/cliente.html?id=${a.id}`;
    return `<div class="card">
      <div class="card-header">
        <div>
          <div class="card-nome">${a.nome}</div>
          <div class="card-veiculo">${a.veiculo} — ${a.placa} — ${a.ano}</div>
          <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            <span class="badge-status">${ETAPAS_NOMES[a.status_atual]}</span>
            <span class="badge-dias ${classeDias}">
              <i class="fa fa-calendar"></i> ${dias === 0 ? 'hoje' : `${dias} dia${dias > 1 ? 's' : ''}`}
            </span>
          </div>
        </div>
        <div class="card-actions">
          <button class="btn btn-vermelho btn-sm" onclick="abrirModal('${a.id}', ${a.status_atual})">
            <i class="fa fa-edit"></i> Atualizar
          </button>
          <a href="${link}" target="_blank" class="btn btn-outline btn-sm">
            <i class="fa fa-eye"></i> Ver
          </a>
          <button class="btn btn-gray btn-sm" onclick="encerrar('${a.id}', '${a.nome}')">
            <i class="fa fa-times"></i> Encerrar
          </button>
        </div>
      </div>
      ${a.problema ? `<div style="font-size:13px;color:#888;border-top:1px solid #f0f0f0;padding-top:10px;margin-top:4px">
        <i class="fa fa-comment" style="color:var(--vermelho)"></i> ${a.problema}
      </div>` : ''}
    </div>`;
  }).join('');
}

async function carregarHistorico() {
  try {
    const r = await fetch('/api/historico');
    const lista = await r.json();
    const div = document.getElementById('lista-historico');
    if (!lista.length) {
      div.innerHTML = `<div style="text-align:center;padding:60px;color:#aaa">
        <i class="fa fa-history" style="font-size:48px;margin-bottom:16px;opacity:.3"></i>
        <p>Nenhum atendimento encerrado ainda.</p>
      </div>`;
      return;
    }

    // Botão exportar todos em PDF
    let html = `<div style="display:flex;justify-content:flex-end;margin-bottom:16px">
      <button class="btn btn-preto btn-sm" onclick="exportarTodosPDF()">
        <i class="fa fa-file-pdf"></i> Exportar Todos em PDF
      </button>
    </div>`;

    html += lista.map(a => `
      <div class="card" style="cursor:pointer" onclick="abrirHistorico('${a.id}')">
        <div class="card-header">
          <div>
            <div class="card-nome">${a.nome}</div>
            <div class="card-veiculo">${a.veiculo} — ${a.placa} — ${a.ano}</div>
            <span class="badge-status" style="background:#6c757d;margin-top:6px;display:inline-block">
              ${ETAPAS_NOMES[a.status_atual]}
            </span>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
            <span style="font-size:12px;color:#aaa">Encerrado: ${new Date(a.atualizado_em).toLocaleDateString('pt-BR')}</span>
            <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();exportarPDF('${a.id}')">
              <i class="fa fa-file-pdf"></i> PDF
            </button>
          </div>
        </div>
      </div>`).join('');

    div.innerHTML = html;
  } catch {
    document.getElementById('lista-historico').innerHTML =
      '<p style="color:red;text-align:center">Erro ao carregar.</p>';
  }
}

async function abrirHistorico(id) {
  try {
    const r = await fetch(`/api/atendimentos/${id}`);
    const d = await r.json();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'modal-historico';
    modal.innerHTML = `
      <div class="modal" style="max-width:640px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <h3><i class="fa fa-history" style="color:var(--vermelho)"></i> Histórico — ${d.nome}</h3>
          <button class="btn btn-gray btn-sm" onclick="document.getElementById('modal-historico').remove()">
            <i class="fa fa-times"></i> Fechar
          </button>
        </div>
        <div style="background:#f5f5f5;border-radius:8px;padding:14px;margin-bottom:16px;font-size:13px">
          <b>Veículo:</b> ${d.veiculo} — ${d.placa} — ${d.ano}<br>
          <b>Entrada:</b> ${new Date(d.criado_em).toLocaleDateString('pt-BR')}<br>
          <b>Encerrado:</b> ${new Date(d.atualizado_em).toLocaleDateString('pt-BR')}<br>
          ${d.problema ? `<b>Problema:</b> ${d.problema}` : ''}
        </div>
        ${d.historico.map(h => `
          <div style="border-left:3px solid var(--vermelho);padding:10px 14px;margin-bottom:10px;background:#fff;border-radius:0 8px 8px 0">
            <div style="font-weight:700;font-size:13px">${ETAPAS_NOMES[h.etapa]}</div>
            ${h.observacao ? `<div style="font-size:12px;color:#555;margin-top:4px">${h.observacao}</div>` : ''}
            <div style="font-size:11px;color:#aaa;margin-top:4px">${new Date(h.criado_em).toLocaleString('pt-BR')}</div>
          </div>`).join('')}
        <div style="display:flex;justify-content:flex-end;margin-top:16px">
          <button class="btn btn-vermelho btn-sm" onclick="exportarPDF('${id}')">
            <i class="fa fa-file-pdf"></i> Exportar PDF
          </button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  } catch {
    alert('Erro ao carregar historico.');
  }
}

async function exportarPDF(id) {
  try {
    const r = await fetch(`/api/atendimentos/${id}`);
    const d = await r.json();
    gerarPDF([d]);
  } catch {
    alert('Erro ao gerar PDF.');
  }
}

async function exportarTodosPDF() {
  try {
    const r = await fetch('/api/historico');
    const lista = await r.json();
    const detalhes = await Promise.all(lista.map(a => fetch(`/api/atendimentos/${a.id}`).then(r => r.json())));
    gerarPDF(detalhes);
  } catch {
    alert('Erro ao gerar PDF.');
  }
}

function gerarPDF(atendimentos) {
  let html = `
    <html><head><meta charset="UTF-8">
    <style>
      body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; padding: 20px; }
      h1 { color: #B22222; font-size: 20px; margin-bottom: 4px; }
      .sub { color: #888; font-size: 12px; margin-bottom: 24px; }
      .atendimento { border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 24px; page-break-inside: avoid; }
      .atendimento h2 { font-size: 16px; margin: 0 0 4px; }
      .info { font-size: 12px; color: #555; margin-bottom: 12px; }
      .etapa { border-left: 3px solid #B22222; padding: 8px 12px; margin-bottom: 8px; background: #f9f9f9; border-radius: 0 6px 6px 0; }
      .etapa b { font-size: 12px; }
      .etapa p { font-size: 11px; color: #555; margin: 2px 0 0; }
      .etapa small { font-size: 10px; color: #aaa; }
    </style></head><body>
    <h1>Ver Meu Carro — Relatorio de Atendimentos</h1>
    <p class="sub">Gerado em ${new Date().toLocaleString('pt-BR')}</p>`;

  atendimentos.forEach(d => {
    html += `<div class="atendimento">
      <h2>${d.nome}</h2>
      <div class="info">
        Veiculo: ${d.veiculo} | Placa: ${d.placa} | Ano: ${d.ano}<br>
        Entrada: ${new Date(d.criado_em).toLocaleDateString('pt-BR')} |
        Encerrado: ${new Date(d.atualizado_em).toLocaleDateString('pt-BR')}
        ${d.problema ? `<br>Problema: ${d.problema}` : ''}
      </div>`;
    d.historico.forEach(h => {
      html += `<div class="etapa">
        <b>${ETAPAS_NOMES[h.etapa]}</b>
        ${h.observacao ? `<p>${h.observacao}</p>` : ''}
        <small>${new Date(h.criado_em).toLocaleString('pt-BR')}</small>
      </div>`;
    });
    html += `</div>`;
  });

  html += `</body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 500);
}

function abrirModal(id, statusAtual) {
  idAtualModal = id;
  etapaSelecionada = statusAtual;
  document.getElementById('modal-obs').value = '';
  document.getElementById('modal-fotos').value = '';
  document.getElementById('modal-videos').value = '';

  const grid = document.getElementById('etapas-grid');
  grid.innerHTML = ETAPAS_NOMES.slice(1).map((nome, i) => {
    const num = i + 1;
    const sel = num === statusAtual ? 'selecionada' : '';
    return `<div class="etapa-option ${sel}" onclick="selecionarEtapa(${num}, this)">${nome}</div>`;
  }).join('');

  document.getElementById('modal-status').classList.remove('hidden');
  document.getElementById('btn-confirmar-status').onclick = confirmarStatus;
}

function selecionarEtapa(num, el) {
  document.querySelectorAll('.etapa-option').forEach(e => e.classList.remove('selecionada'));
  el.classList.add('selecionada');
  etapaSelecionada = num;
}

function fecharModal() {
  document.getElementById('modal-status').classList.add('hidden');
}

async function confirmarStatus() {
  if (!etapaSelecionada) { alert('Selecione uma etapa.'); return; }
  const obs = document.getElementById('modal-obs').value;
  const fotos = document.getElementById('modal-fotos').files;
  const videos = document.getElementById('modal-videos').files;

  const fd = new FormData();
  fd.append('etapa', etapaSelecionada);
  fd.append('observacao', obs);
  Array.from(fotos).forEach(f => fd.append('fotos', f));
  Array.from(videos).forEach(f => fd.append('video', f));

  const btn = document.getElementById('btn-confirmar-status');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Enviando...';

  try {
    const r = await fetch(`/api/atendimentos/${idAtualModal}/status`, {
      method: 'POST',
      body: fd
    });
    if (r.ok) {
      fecharModal();
      carregarAtivos();
    } else {
      alert('Erro ao atualizar status.');
    }
  } catch {
    alert('Erro de conexao.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa fa-check"></i> Confirmar Atualizacao';
  }
}

async function encerrar(id, nome) {
  if (!confirm(`Encerrar atendimento de ${nome}? Ele sera movido para o historico.`)) return;
  const r = await fetch(`/api/atendimentos/${id}/encerrar`, { method: 'POST' });
  if (r.ok) carregarAtivos();
  else alert('Erro ao encerrar.');
}