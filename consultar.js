/**
 * PROSPERA NACIONAL - TELA CONSULTAR ACOES
 *
 * Busca todas as acoes uma unica vez (consultarAcoes, sem filtros) e
 * aplica todos os filtros - nucleo, OS, status, periodo e nome - no
 * proprio navegador. Essa decisao evita criar ou alterar endpoints no
 * backend: consultarAcoes ja existe e ja suporta filtro por nucleo, OS,
 * status e uma data exata, mas nao suporta periodo nem busca por texto,
 * entao filtrar tudo no navegador mantem um unico caminho de filtragem
 * (mais simples de entender e testar) em vez de misturar filtro no
 * servidor com filtro no cliente.
 */

var NOMES_EXIBICAO_OS_CONSULTA = {
  1: 'Diagnóstico',
  2: 'Mapeamento',
  3: 'Caderno',
  4: 'Seminários',
  5: 'Oficinas',
  6: 'Palestras',
  7: 'Consultorias'
};

var todasAsAcoesCarregadas = [];

document.addEventListener('DOMContentLoaded', function () {
  carregarFiltrosDeConfiguracao();
  carregarAcoes();
  configurarEventosDeFiltro();
});

/* ============================================================
   CARREGAMENTO INICIAL
   ============================================================ */

async function carregarFiltrosDeConfiguracao() {
  var resposta = await listarConfiguracoes();
  if (!resposta.sucesso) {
    console.error('Falha ao carregar configuracoes para os filtros:', resposta.erro);
    return;
  }

  var selectNucleo = document.getElementById('filtroNucleo');
  (resposta.dados.nucleos || [])
    .filter(function (n) { return String(n.Ativo_Inativo).toUpperCase() === 'ATIVO'; })
    .forEach(function (nucleo) {
      var opcao = document.createElement('option');
      opcao.value = nucleo.Nucleo;
      opcao.textContent = nucleo.Nucleo;
      selectNucleo.appendChild(opcao);
    });

  var selectOS = document.getElementById('filtroOS');
  (resposta.dados.os || [])
    .filter(function (os) { return String(os.Ativo_Inativo).toUpperCase() === 'ATIVO'; })
    .sort(function (a, b) { return Number(a.Numero_OS) - Number(b.Numero_OS); })
    .forEach(function (os) {
      var numero = Number(os.Numero_OS);
      var opcao = document.createElement('option');
      opcao.value = numero;
      opcao.textContent = 'OS ' + numero + ' - ' + (NOMES_EXIBICAO_OS_CONSULTA[numero] || os.Nome_OS);
      selectOS.appendChild(opcao);
    });
}

async function carregarAcoes() {
  var resposta = await consultarAcoes();

  if (!resposta.sucesso) {
    console.error('Falha ao consultar acoes:', resposta.erro);
    var aviso = document.getElementById('avisoErroConsulta');
    aviso.textContent = traduzirErroApi(resposta.erro);
    aviso.classList.remove('oculto');
    return;
  }

  todasAsAcoesCarregadas = resposta.dados || [];
  aplicarFiltros();
}

/* ============================================================
   FILTROS (todos aplicados no navegador)
   ============================================================ */

function configurarEventosDeFiltro() {
  ['filtroNucleo', 'filtroOS', 'filtroStatus', 'filtroDataInicial', 'filtroDataFinal'].forEach(function (id) {
    document.getElementById(id).addEventListener('change', aplicarFiltros);
  });
  document.getElementById('filtroNome').addEventListener('input', aplicarFiltros);
}

function aplicarFiltros() {
  var nucleo = document.getElementById('filtroNucleo').value;
  var os = document.getElementById('filtroOS').value;
  var status = document.getElementById('filtroStatus').value;
  var dataInicial = document.getElementById('filtroDataInicial').value;
  var dataFinal = document.getElementById('filtroDataFinal').value;
  var nomeBusca = document.getElementById('filtroNome').value.trim().toLowerCase();

  var filtradas = todasAsAcoesCarregadas.filter(function (acao) {
    if (nucleo && acao.Nucleo !== nucleo) return false;

    if (os) {
      var prefixoOS = 'OS ' + os + ' -';
      if (String(acao.OS).indexOf(prefixoOS) !== 0) return false;
    }

    if (status && String(acao.Status).toUpperCase().trim() !== status) return false;

    var dataAcaoIso = extrairDataIsoDeApi(acao.Data);
    if (dataInicial && dataAcaoIso < dataInicial) return false;
    if (dataFinal && dataAcaoIso > dataFinal) return false;

    if (nomeBusca && String(acao.Nome_Acao || '').toLowerCase().indexOf(nomeBusca) === -1) return false;

    return true;
  });

  renderizarTabela(filtradas);
}

/* ============================================================
   RENDERIZACAO DA TABELA
   ============================================================ */

function renderizarTabela(lista) {
  var corpo = document.getElementById('corpoTabelaAcoes');
  var contador = document.getElementById('contadorResultados');
  var mensagemVazia = document.getElementById('mensagemVazia');

  corpo.innerHTML = '';

  contador.textContent = lista.length === 1
    ? '1 ação encontrada.'
    : lista.length + ' ações encontradas.';

  if (lista.length === 0) {
    mensagemVazia.classList.remove('oculto');
    return;
  }
  mensagemVazia.classList.add('oculto');

  lista.forEach(function (acao) {
    var linha = document.createElement('tr');

    var percentual = acao.Percentual_Alcancado !== '' && acao.Percentual_Alcancado !== undefined
      ? acao.Percentual_Alcancado + '%'
      : '-';

    var classeSelo = classeSeloStatus(acao.Status);

    linha.innerHTML =
      '<td>' + escaparHtmlConsulta(acao.ID_Acao) + '</td>' +
      '<td>' + escaparHtmlConsulta(acao.Nucleo) + '</td>' +
      '<td>' + escaparHtmlConsulta(acao.OS) + '</td>' +
      '<td>' + escaparHtmlConsulta(acao.Nome_Acao) + '</td>' +
      '<td>' + formatarDataExibicaoApi(acao.Data) + '</td>' +
      '<td>' + escaparHtmlConsulta(acao.Responsavel) + '</td>' +
      '<td><span class="selo-status ' + classeSelo + '">' + textoStatusExibicao(acao.Status) + '</span></td>' +
      '<td>' + percentual + '</td>' +
      '<td><a class="link-ficha" href="ficha.html?id=' + encodeURIComponent(acao.ID_Acao) + '">Abrir ficha</a></td>';

    corpo.appendChild(linha);
  });
}

function escaparHtmlConsulta(texto) {
  var div = document.createElement('div');
  div.textContent = texto === undefined || texto === null ? '' : String(texto);
  return div.innerHTML;
}
