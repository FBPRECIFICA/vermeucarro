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
    alert('Preencha todos os campos obrigatórios.');
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
      `Olá ${nome}! 👋 Seu veículo já está conosco na MM ServiceCar. Acompanhe o progresso do serviço em tempo real por este link: ${d.link}. Qualquer dúvida estamos à disposição! 🚗`
    );
    const tel = telefone.replace(/\D/g, '');
    const telFull = tel.startsWith('55') ? tel : `55${tel}`;
    document.getElementById('btn-whatsapp-envio').href = `https://wa.me/${telFull}?text=${msg}`;

    document.getElementById('link-gerado-box').classList.remove('hidden');
  } catch {
    alert('Erro de conexão com o servidor.');
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
  const diff = Date.now() - new Date(isoStr).getTime();
  return Math.floor(diff / 86400000);
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
    div.innerHTML = lista.map(a => `
      <div class="card" style="opacity:.8">
        <div class="card-header">
          <div>
            <div class="card-nome">${a.nome}</div>
            <div class="card-veiculo">${a.veiculo} — ${a.placa}</div>
            <span class="badge-status" style="background:#6c757d;margin-top:6px;display:inline-block">
              ${ETAPAS_NOMES[a.status_atual]}
            </span>
          </div>
          <span style="font-size:12px;color:#aaa">Encerrado: ${new Date(a.atualizado_em).toLocaleDateString('pt-BR')}</span>
        </div>
      </div>`).join('');
  } catch {
    document.getElementById('lista-historico').innerHTML =
      '<p style="color:red;text-align:center">Erro ao carregar.</p>';
  }
}

function abrirModal(id, statusAtual) {
  idAtualModal = id;
  etapaSelecionada = statusAtual;
  document.getElementById('modal-obs').value = '';
  document.getElementById('modal-fotos').value = '';
  document.getElementById('modal-video').value = '';

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
  const videoFile = document.getElementById('modal-video').files[0];

  const fd = new FormData();
  fd.append('etapa', etapaSelecionada);
  fd.append('observacao', obs);
  Array.from(fotos).forEach(f => fd.append('fotos', f));
  if (videoFile) fd.append('video', videoFile);

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
    alert('Erro de conexão.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa fa-check"></i> Confirmar Atualização';
  }
}

async function encerrar(id, nome) {
  if (!confirm(`Encerrar atendimento de ${nome}? Ele será movido para o histórico.`)) return;
  const r = await fetch(`/api/atendimentos/${id}/encerrar`, { method: 'POST' });
  if (r.ok) carregarAtivos();
  else alert('Erro ao encerrar.');
}