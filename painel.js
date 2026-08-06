/**
 * PROSPERA NACIONAL - PAINEL DA COORDENACAO
 *
 * Reaproveita integralmente os endpoints ja existentes:
 * listarConfiguracoes, consultarAcoes e consultarChecklist.
 * Nenhum endpoint novo foi criado, nenhum arquivo de backend foi
 * alterado.
 *
 * Estrategia de dados (documentada aqui de proposito, por ser a
 * decisao tecnica mais relevante desta tela):
 * 1. consultarAcoes() e chamada UMA vez, trazendo todas as acoes.
 * 2. Para calcular a coluna "Documentacao" e a area "Atencao da
 *    Coordenacao", e preciso saber a situacao do checklist de cada
 *    acao. Como nao existe (nem faz sentido criar agora, com o volume
 *    atual de acoes) um endpoint de resumo agregado, o painel chama
 *    consultarChecklist(idAcao) uma vez para CADA acao, em paralelo
 *    (Promise.all). Com poucas dezenas de acoes isso e rapido e nao
 *    sobrecarrega o Apps Script. Se o numero de acoes crescer muito
 *    (varias centenas), esse padrao deve ser revisto - por exemplo,
 *    criando um endpoint de resumo no backend - mas isso e uma
 *    decisao para quando o volume justificar, nao agora.
 * 3. Todos os filtros (nucleo, OS, status, periodo, nome) sao
 *    aplicados no navegador, sobre os dados ja carregados - o mesmo
 *    padrao ja usado em consultar.js. Os indicadores, os resumos por
 *    nucleo/OS, a area de atencao e a tabela principal reagem todos
 *    ao filtro atual, para permitir "recortar" o painel por nucleo,
 *    por exemplo.
 */

var NOMES_EXIBICAO_OS_PAINEL = {
  1: 'Diagnóstico', 2: 'Mapeamento', 3: 'Caderno', 4: 'Seminários',
  5: 'Oficinas', 6: 'Palestras', 7: 'Consultorias'
};

var listaNucleosPainel = [];
var listaOSPainel = [];
var todasAsAcoesPainel = [];
var mapaChecklistPorAcao = {};

document.addEventListener('DOMContentLoaded', function () {
  configurarEventosPainel();
  carregarTudoPainel();
});

function configurarEventosPainel() {
  document.getElementById('botaoAtualizarDados').addEventListener('click', function () {
    carregarTudoPainel();
  });
  document.getElementById('botaoFiltrarPainel').addEventListener('click', aplicarFiltrosPainel);
  document.getElementById('botaoLimparFiltrosPainel').addEventListener('click', limparFiltrosPainel);
}

/* ============================================================
   CARREGAMENTO DOS DADOS
   ============================================================ */

async function carregarTudoPainel() {
  document.getElementById('avisoErroPainel').classList.add('oculto');
  document.getElementById('avisoCarregandoPainel').classList.add('visivel');
  document.getElementById('conteudoPainel').classList.add('oculto');
  document.getElementById('botaoAtualizarDados').disabled = true;

  try {
    var respostaConfig = await listarConfiguracoes();
    if (!respostaConfig.sucesso) {
      throw new Error(respostaConfig.erro);
    }
    listaNucleosPainel = (respostaConfig.dados.nucleos || []).filter(function (n) {
      return String(n.Ativo_Inativo).toUpperCase() === 'ATIVO';
    });
    listaOSPainel = (respostaConfig.dados.os || [])
      .filter(function (os) { return String(os.Ativo_Inativo).toUpperCase() === 'ATIVO'; })
      .sort(function (a, b) { return Number(a.Numero_OS) - Number(b.Numero_OS); });

    popularSelectsFiltroPainel();

    var respostaAcoes = await consultarAcoes();
    if (!respostaAcoes.sucesso) {
      throw new Error(respostaAcoes.erro);
    }
    todasAsAcoesPainel = respostaAcoes.dados || [];

    var idsAcoes = todasAsAcoesPainel.map(function (a) { return a.ID_Acao; });
    var respostasChecklist = await Promise.all(idsAcoes.map(function (id) { return consultarChecklist(id); }));

    mapaChecklistPorAcao = {};
    idsAcoes.forEach(function (id, indice) {
      var r = respostasChecklist[indice];
      mapaChecklistPorAcao[id] = (r && r.sucesso) ? (r.dados || []) : [];
    });

    document.getElementById('conteudoPainel').classList.remove('oculto');
    document.getElementById('textoAtualizacaoPainel').textContent =
      'Atualizado em ' + new Date().toLocaleString('pt-BR');

    aplicarFiltrosPainel();

  } catch (erro) {
    console.error('Falha ao carregar o painel:', erro);
    var aviso = document.getElementById('avisoErroPainel');
    aviso.textContent = traduzirErroApi(erro.message || erro);
    aviso.classList.remove('oculto');
  } finally {
    document.getElementById('avisoCarregandoPainel').classList.remove('visivel');
    document.getElementById('botaoAtualizarDados').disabled = false;
  }
}

function popularSelectsFiltroPainel() {
  var selectNucleo = document.getElementById('filtroNucleoPainel');
  selectNucleo.innerHTML = '<option value="">Todos</option>';
  listaNucleosPainel.forEach(function (nucleo) {
    var opcao = document.createElement('option');
    opcao.value = nucleo.Nucleo;
    opcao.textContent = nucleo.Nucleo;
    selectNucleo.appendChild(opcao);
  });

  var selectOS = document.getElementById('filtroOSPainel');
  selectOS.innerHTML = '<option value="">Todas</option>';
  listaOSPainel.forEach(function (os) {
    var numero = Number(os.Numero_OS);
    var opcao = document.createElement('option');
    opcao.value = numero;
    opcao.textContent = 'OS ' + numero + ' - ' + (NOMES_EXIBICAO_OS_PAINEL[numero] || os.Nome_OS);
    selectOS.appendChild(opcao);
  });
}

/* ============================================================
   FILTROS (aplicados no navegador, mesmo padrao de consultar.js)
   ============================================================ */

function obterAcoesFiltradasPainel() {
  var nucleo = document.getElementById('filtroNucleoPainel').value;
  var os = document.getElementById('filtroOSPainel').value;
  var status = document.getElementById('filtroStatusPainel').value;
  var dataInicial = document.getElementById('filtroDataInicialPainel').value;
  var dataFinal = document.getElementById('filtroDataFinalPainel').value;
  var nomeBusca = document.getElementById('filtroNomePainel').value.trim().toLowerCase();

  return todasAsAcoesPainel.filter(function (acao) {
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
}

function aplicarFiltrosPainel() {
  var lista = obterAcoesFiltradasPainel();
  renderizarIndicadoresPainel(lista);
  renderizarResumoNucleoPainel(lista);
  renderizarResumoOSPainel(lista);
  renderizarAreaAtencaoPainel(lista);
  renderizarTabelaPrincipalPainel(lista);
}

function limparFiltrosPainel() {
  document.getElementById('filtroNucleoPainel').value = '';
  document.getElementById('filtroOSPainel').value = '';
  document.getElementById('filtroStatusPainel').value = '';
  document.getElementById('filtroDataInicialPainel').value = '';
  document.getElementById('filtroDataFinalPainel').value = '';
  document.getElementById('filtroNomePainel').value = '';
  aplicarFiltrosPainel();
}

/* ============================================================
   CLASSIFICACAO DA DOCUMENTACAO (regra ja definida na Ficha da Acao,
   reaplicada aqui para o painel - nao cria nenhum status novo no
   banco, e apenas uma leitura visual dos mesmos dados)
   ============================================================ */

function classificarDocumentacaoPainel(idAcao) {
  var itens = mapaChecklistPorAcao[idAcao] || [];

  var temPendente = itens.some(function (item) {
    var status = String(item.Status).toUpperCase().trim();
    return status === 'PREVISTO' || status === 'FALTANTE';
  });

  var temAValidar = itens.some(function (item) {
    return String(item.Status).toUpperCase().trim() === 'A VALIDAR';
  });

  if (temPendente && temAValidar) return 'PENDENTE + A VALIDAR';
  if (temPendente) return 'PENDENTE';
  if (temAValidar) return 'A VALIDAR';
  return 'OK';
}

function classeSeloDocumentacao(classificacao) {
  switch (classificacao) {
    case 'OK': return 'doc-ok';
    case 'PENDENTE': return 'doc-pendente';
    case 'A VALIDAR': return 'doc-avalidar';
    default: return 'doc-pendente-avalidar';
  }
}

/* ============================================================
   INDICADORES PRINCIPAIS
   ============================================================ */

function renderizarIndicadoresPainel(lista) {
  var contagens = { total: lista.length, 'EM ABERTO': 0, 'EM CONFERENCIA': 0, 'PRECISA CORRIGIR': 0, 'PRONTA': 0 };

  lista.forEach(function (acao) {
    var status = String(acao.Status || '').toUpperCase().trim();
    if (contagens.hasOwnProperty(status)) contagens[status]++;
  });

  document.getElementById('painelNumeroTotal').textContent = contagens.total;
  document.getElementById('painelNumeroAberto').textContent = contagens['EM ABERTO'];
  document.getElementById('painelNumeroConferencia').textContent = contagens['EM CONFERENCIA'];
  document.getElementById('painelNumeroCorrigir').textContent = contagens['PRECISA CORRIGIR'];
  document.getElementById('painelNumeroPronta').textContent = contagens['PRONTA'];
}

/* ============================================================
   RESUMO POR NUCLEO E POR OS
   ============================================================ */

function renderizarResumoNucleoPainel(lista) {
  var corpo = document.getElementById('corpoResumoNucleo');
  corpo.innerHTML = '';

  listaNucleosPainel.forEach(function (nucleo) {
    var quantidade = lista.filter(function (a) { return a.Nucleo === nucleo.Nucleo; }).length;
    var linha = document.createElement('tr');
    linha.innerHTML = '<td>' + escaparHtmlPainel(nucleo.Nucleo) + '</td><td class="numero-resumo">' + quantidade + '</td>';
    corpo.appendChild(linha);
  });
}

function renderizarResumoOSPainel(lista) {
  var corpo = document.getElementById('corpoResumoOS');
  corpo.innerHTML = '';

  listaOSPainel.forEach(function (os) {
    var numero = Number(os.Numero_OS);
    var prefixoOS = 'OS ' + numero + ' -';
    var quantidade = lista.filter(function (a) { return String(a.OS).indexOf(prefixoOS) === 0; }).length;
    var rotulo = 'OS ' + numero + ' - ' + (NOMES_EXIBICAO_OS_PAINEL[numero] || os.Nome_OS);
    var linha = document.createElement('tr');
    linha.innerHTML = '<td>' + escaparHtmlPainel(rotulo) + '</td><td class="numero-resumo">' + quantidade + '</td>';
    corpo.appendChild(linha);
  });
}

/* ============================================================
   AREA DE ATENCAO DA COORDENACAO
   ============================================================ */

function renderizarAreaAtencaoPainel(lista) {
  var precisaCorrigir = lista.filter(function (a) {
    return String(a.Status).toUpperCase().trim() === 'PRECISA CORRIGIR';
  });

  var pendentes = lista.filter(function (a) {
    var classificacao = classificarDocumentacaoPainel(a.ID_Acao);
    return classificacao === 'PENDENTE' || classificacao === 'PENDENTE + A VALIDAR';
  });

  var aValidar = lista.filter(function (a) {
    var classificacao = classificarDocumentacaoPainel(a.ID_Acao);
    return classificacao === 'A VALIDAR' || classificacao === 'PENDENTE + A VALIDAR';
  });

  preencherListaAtencao('listaAtencaoCorrigir', precisaCorrigir, 'Nenhuma ação com status Precisa Corrigir.');
  preencherListaAtencao('listaAtencaoPendente', pendentes, 'Nenhuma ação com documentação pendente.');
  preencherListaAtencao('listaAtencaoValidar', aValidar, 'Nenhuma ação com documentação a validar.');
}

function preencherListaAtencao(idLista, acoes, mensagemVazia) {
  var lista = document.getElementById(idLista);
  lista.innerHTML = '';

  if (acoes.length === 0) {
    var itemVazio = document.createElement('li');
    itemVazio.className = 'item-atencao';
    itemVazio.innerHTML = '<span class="mensagem-vazia" style="padding:4px 0;">' + mensagemVazia + '</span>';
    lista.appendChild(itemVazio);
    return;
  }

  acoes.forEach(function (acao) {
    var item = document.createElement('li');
    item.className = 'item-atencao';
    item.innerHTML =
      '<a href="ficha.html?id=' + encodeURIComponent(acao.ID_Acao) + '">' + escaparHtmlPainel(acao.Nome_Acao) + '</a>' +
      '<span class="nucleo-item-atencao">' + escaparHtmlPainel(acao.Nucleo) + '</span>';
    lista.appendChild(item);
  });
}

/* ============================================================
   TABELA PRINCIPAL
   ============================================================ */

function renderizarTabelaPrincipalPainel(lista) {
  var corpo = document.getElementById('corpoTabelaPainel');
  var contador = document.getElementById('contadorResultadosPainel');
  var mensagemVazia = document.getElementById('mensagemVaziaPainel');

  corpo.innerHTML = '';
  contador.textContent = lista.length === 1 ? '1 ação encontrada.' : lista.length + ' ações encontradas.';

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

    var classificacaoDoc = classificarDocumentacaoPainel(acao.ID_Acao);
    var seloDoc = '<span class="selo-doc ' + classeSeloDocumentacao(classificacaoDoc) + '">' + classificacaoDoc + '</span>';

    var linkDrive = acao.URL_Pasta_Drive
      ? '<a class="link-drive-painel" href="' + escaparHtmlPainel(acao.URL_Pasta_Drive) + '" target="_blank" rel="noopener">Abrir Drive</a>'
      : '';

    linha.innerHTML =
      '<td>' + escaparHtmlPainel(acao.ID_Acao) + '</td>' +
      '<td>' + escaparHtmlPainel(acao.Nucleo) + '</td>' +
      '<td>' + escaparHtmlPainel(acao.OS) + '</td>' +
      '<td>' + escaparHtmlPainel(acao.Nome_Acao) + '</td>' +
      '<td>' + formatarDataExibicaoApi(acao.Data) + '</td>' +
      '<td>' + escaparHtmlPainel(acao.Responsavel) + '</td>' +
      '<td><span class="selo-status ' + classeSeloStatus(acao.Status) + '">' + textoStatusExibicao(acao.Status) + '</span></td>' +
      '<td>' + percentual + '</td>' +
      '<td>' + seloDoc + '</td>' +
      '<td><a class="link-ficha" href="ficha.html?id=' + encodeURIComponent(acao.ID_Acao) + '">Abrir ficha</a>' + linkDrive + '</td>';

    corpo.appendChild(linha);
  });
}

function escaparHtmlPainel(texto) {
  var div = document.createElement('div');
  div.textContent = texto === undefined || texto === null ? '' : String(texto);
  return div.innerHTML;
}
