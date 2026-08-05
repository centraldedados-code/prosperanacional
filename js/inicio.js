/**
 * PROSPERA NACIONAL - TELA INICIO
 *
 * Responsabilidades desta tela:
 * 1. Buscar todas as acoes cadastradas (consultarAcoes) e calcular,
 *    no proprio frontend, as cinco contagens do resumo.
 * 2. Tratar o clique em "Consultar acoes" mostrando apenas o aviso
 *    "Disponivel em breve." - sem navegar para lugar nenhum, porque
 *    essa tela ainda nao existe.
 */

document.addEventListener('DOMContentLoaded', function () {
  carregarResumo();
  configurarBotaoConsultarAcoes();
});

function configurarBotaoConsultarAcoes() {
  var botao = document.getElementById('botaoConsultarAcoes');
  var aviso = document.getElementById('avisoConsultar');

  botao.addEventListener('click', function () {
    aviso.classList.add('visivel');
  });
}

async function carregarResumo() {
  var avisoResumo = document.getElementById('avisoResumo');

  var resposta = await consultarAcoes();

  if (!resposta.sucesso) {
    console.error('Falha ao carregar o resumo de acoes:', resposta.erro);
    avisoResumo.textContent = 'Nao foi possivel carregar o resumo agora. Atualize a pagina para tentar novamente.';
    avisoResumo.classList.add('visivel');
    return;
  }

  var acoes = resposta.dados || [];

  var contagens = {
    total: acoes.length,
    'EM ABERTO': 0,
    'EM CONFERENCIA': 0,
    'PRECISA CORRIGIR': 0,
    'PRONTA': 0
  };

  acoes.forEach(function (acao) {
    var status = String(acao.Status || '').toUpperCase().trim();
    if (contagens.hasOwnProperty(status)) {
      contagens[status]++;
    }
  });

  document.getElementById('numeroTotal').textContent = contagens.total;
  document.getElementById('numeroAberto').textContent = contagens['EM ABERTO'];
  document.getElementById('numeroConferencia').textContent = contagens['EM CONFERENCIA'];
  document.getElementById('numeroCorrigir').textContent = contagens['PRECISA CORRIGIR'];
  document.getElementById('numeroPronta').textContent = contagens['PRONTA'];
}
