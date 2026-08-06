/**
 * PROSPERA NACIONAL - TELA INICIO
 *
 * Responsabilidade desta tela: buscar todas as acoes cadastradas
 * (consultarAcoes) e calcular, no proprio frontend, as cinco contagens
 * do resumo. O botao "Consultar acoes" agora navega direto para
 * consultar.html (Etapa 3) - nao precisa mais de tratamento por JS.
 */

document.addEventListener('DOMContentLoaded', function () {
  carregarResumo();
});

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
