/**
 * PROSPERA NACIONAL - TELA CADASTRAR ACAO
 *
 * Controla o formulario em 3 etapas, a tela de confirmacao e a tela de
 * resultado (sucesso ou erro). Nenhuma regra de negocio (calculo de
 * percentual, validacao de duplicidade, criacao de pastas etc.) e
 * decidida aqui - o que este arquivo calcula localmente (percentual e
 * o texto de resultado) e so uma pre-visualizacao para o usuario. O
 * calculo que realmente vale e sempre o que a API devolve depois do
 * cadastro confirmado.
 */

// Nomes de exibicao das OS, com acentuacao, para a interface. O valor
// enviado ao backend continua sendo sempre o numero da OS - este mapa
// e usado apenas para montar o texto exibido nos menus e nos resumos.
var NOMES_EXIBICAO_OS = {
  1: 'Diagnóstico',
  2: 'Mapeamento',
  3: 'Caderno',
  4: 'Seminários',
  5: 'Oficinas',
  6: 'Palestras',
  7: 'Consultorias'
};

var listaNucleos = [];
var listaOS = [];
var ultimoCadastro = {};

document.addEventListener('DOMContentLoaded', function () {
  carregarConfiguracoes();
  configurarAutopreenchimentoNucleo();
  configurarNavegacaoEtapas();
  configurarCalculoPercentual();
  configurarTelaConfirmacao();
  configurarTelaResultado();
});

/* ============================================================
   CARREGAMENTO DE CONFIGURACOES (nucleos e OS vindos da API)
   ============================================================ */

async function carregarConfiguracoes() {
  var resposta = await listarConfiguracoes();

  if (!resposta.sucesso) {
    console.error('Falha ao carregar configuracoes:', resposta.erro);
    document.getElementById('avisoConfiguracao').classList.remove('oculto');
    document.getElementById('botaoContinuarEtapa1').disabled = true;
    return;
  }

  listaNucleos = resposta.dados.nucleos || [];
  listaOS = resposta.dados.os || [];

  preencherSelectNucleos();
  preencherSelectOS();
}

function preencherSelectNucleos() {
  var select = document.getElementById('campoNucleo');

  listaNucleos
    .filter(function (n) { return String(n.Ativo_Inativo).toUpperCase() === 'ATIVO'; })
    .forEach(function (nucleo) {
      var opcao = document.createElement('option');
      opcao.value = nucleo.Nucleo;
      opcao.textContent = nucleo.Nucleo;
      select.appendChild(opcao);
    });
}

function preencherSelectOS() {
  var select = document.getElementById('campoOS');

  listaOS
    .filter(function (os) { return String(os.Ativo_Inativo).toUpperCase() === 'ATIVO'; })
    .sort(function (a, b) { return Number(a.Numero_OS) - Number(b.Numero_OS); })
    .forEach(function (os) {
      var numero = Number(os.Numero_OS);
      var opcao = document.createElement('option');
      opcao.value = numero;
      opcao.textContent = 'OS ' + numero + ' - ' + (NOMES_EXIBICAO_OS[numero] || os.Nome_OS);
      select.appendChild(opcao);
    });
}

function obterRotuloOS(numeroOS) {
  var numero = Number(numeroOS);
  return 'OS ' + numero + ' - ' + (NOMES_EXIBICAO_OS[numero] || '');
}

/* ============================================================
   AUTOPREENCHIMENTO DE ESTADO E CIDADE A PARTIR DO NUCLEO
   ============================================================ */

function configurarAutopreenchimentoNucleo() {
  var campoNucleo = document.getElementById('campoNucleo');
  var campoEstado = document.getElementById('campoEstado');
  var campoCidade = document.getElementById('campoCidade');

  campoNucleo.addEventListener('change', function () {
    var nucleoSelecionado = listaNucleos.find(function (n) {
      return n.Nucleo === campoNucleo.value;
    });

    campoEstado.value = nucleoSelecionado ? nucleoSelecionado.Estado : '';
    campoCidade.value = nucleoSelecionado ? nucleoSelecionado.Cidade : '';
  });
}

/* ============================================================
   NAVEGACAO ENTRE ETAPAS
   ============================================================ */

function configurarNavegacaoEtapas() {
  document.getElementById('botaoContinuarEtapa1').addEventListener('click', function () {
    if (validarEtapa1()) irParaEtapa(2);
  });

  document.getElementById('botaoVoltarEtapa2').addEventListener('click', function () {
    irParaEtapa(1);
  });

  document.getElementById('botaoContinuarEtapa2').addEventListener('click', function () {
    if (validarEtapa2()) irParaEtapa(3);
  });

  document.getElementById('botaoVoltarEtapa3').addEventListener('click', function () {
    irParaEtapa(2);
  });
}

function irParaEtapa(numeroEtapa) {
  document.querySelectorAll('.etapa-formulario').forEach(function (secao) {
    secao.classList.toggle('ativa', Number(secao.dataset.etapa) === numeroEtapa);
  });

  document.querySelectorAll('.stepper .passo').forEach(function (passo) {
    var numeroPasso = Number(passo.dataset.passo);
    passo.classList.toggle('ativo', numeroPasso === numeroEtapa);
    passo.classList.toggle('concluido', numeroPasso < numeroEtapa);
  });

  document.getElementById('telaFormulario').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ============================================================
   VALIDACAO POR ETAPA (sem alert() - destaque direto no campo)
   ============================================================ */

function validarEtapa1() {
  var valido = true;

  valido = validarCampoObrigatorio('campoWrapperNucleo', 'campoNucleo') && valido;
  valido = validarCampoObrigatorio('campoWrapperResponsavel', 'campoResponsavel') && valido;
  valido = validarCampoObrigatorio('campoWrapperOS', 'campoOS') && valido;
  valido = validarCampoObrigatorio('campoWrapperTipoAcao', 'campoTipoAcao') && valido;
  valido = validarCampoObrigatorio('campoWrapperNomeAcao', 'campoNomeAcao') && valido;

  return valido;
}

/**
 * Validacao da Etapa 2 - Execucao.
 *
 * Campo a campo, conforme a regra que o proprio backend aplica em
 * cadastrarAcao (04_Acoes.gs): a unica chamada exigirCampo(payload, ...)
 * relativa a esta etapa e para 'data'. Nenhum outro campo da Etapa 2 e
 * obrigatorio no backend, entao nenhum outro e tratado como obrigatorio
 * aqui - isso evitaria uma regra de negocio inventada no frontend que
 * o backend nao aplica.
 *
 * - Data: OBRIGATORIA (exigirCampo(payload, 'data') no backend).
 * - Horario inicial: opcional (backend aceita '' sem erro).
 * - Horario final: opcional (backend aceita '' sem erro).
 * - Local: opcional (backend aceita '' sem erro).
 * - Carga horaria prevista: opcional (backend aceita '' sem erro).
 * - Carga horaria realizada: opcional (backend aceita '' sem erro).
 */
function validarEtapa2() {
  return validarCampoObrigatorio('campoWrapperData', 'campoData');
}

function validarCampoObrigatorio(idWrapper, idCampo) {
  var wrapper = document.getElementById(idWrapper);
  var campo = document.getElementById(idCampo);
  var valorPreenchido = String(campo.value || '').trim() !== '';

  wrapper.classList.toggle('invalido', !valorPreenchido);

  if (!valorPreenchido && document.getElementById(idWrapper).classList.contains('invalido')) {
    campo.focus();
  }

  return valorPreenchido;
}

/* ============================================================
   CALCULO AUTOMATICO DO PERCENTUAL E DO RESULTADO (pre-visualizacao)
   ============================================================ */

function configurarCalculoPercentual() {
  var campoMeta = document.getElementById('campoMetaPrevista');
  var campoAtendidos = document.getElementById('campoParticipantesAtendidos');

  campoMeta.addEventListener('input', atualizarPercentualEResultado);
  campoAtendidos.addEventListener('input', atualizarPercentualEResultado);
}

function atualizarPercentualEResultado() {
  var campoPercentual = document.getElementById('campoPercentualAlcancado');
  var campoResultado = document.getElementById('campoResultado');

  var meta = parseFloat(document.getElementById('campoMetaPrevista').value);
  var atendidos = parseFloat(document.getElementById('campoParticipantesAtendidos').value);

  if (meta > 0 && !isNaN(atendidos)) {
    var percentual = Math.round((atendidos / meta) * 10000) / 100;
    campoPercentual.value = percentual + '%';
    campoResultado.value = percentual + '% da meta alcançada.';
  } else {
    campoPercentual.value = '';
    campoResultado.value = 'Informe a meta prevista e os participantes atendidos para calcular.';
  }
}

/* ============================================================
   TELAS: FORMULARIO / CONFIRMACAO / RESULTADO
   ============================================================ */

function mostrarTela(idTela) {
  ['telaFormulario', 'telaConfirmacao', 'telaResultado'].forEach(function (id) {
    document.getElementById(id).classList.toggle('oculto', id !== idTela);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function configurarTelaConfirmacao() {
  document.getElementById('botaoAbrirConfirmacao').addEventListener('click', function () {
    montarResumoConfirmacao();
    mostrarTela('telaConfirmacao');
  });

  document.getElementById('botaoVoltarEditar').addEventListener('click', function () {
    mostrarTela('telaFormulario');
  });

  document.getElementById('botaoConfirmarCadastro').addEventListener('click', enviarCadastro);
}

function obterValorCampo(id) {
  var elemento = document.getElementById(id);
  return elemento ? elemento.value : '';
}

function montarResumoConfirmacao() {
  var linhas = [
    ['Núcleo', obterValorCampo('campoNucleo')],
    ['OS', obterRotuloOS(obterValorCampo('campoOS'))],
    ['Tipo de ação', obterValorCampo('campoTipoAcao')],
    ['Nome da ação', obterValorCampo('campoNomeAcao')],
    ['Responsável', obterValorCampo('campoResponsavel')],
    ['Data', formatarDataParaExibicao(obterValorCampo('campoData'))],
    ['Local', obterValorCampo('campoLocal') || '-']
  ];

  var meta = obterValorCampo('campoMetaPrevista');
  var atendidos = obterValorCampo('campoParticipantesAtendidos');
  if (meta || atendidos) {
    linhas.push(['Meta prevista', meta || '-']);
    linhas.push(['Inscritos', obterValorCampo('campoInscritos') || '-']);
    linhas.push(['Participantes atendidos', atendidos || '-']);
    linhas.push(['Percentual alcançado', obterValorCampo('campoPercentualAlcancado') || '-']);
  }

  var justificativa = obterValorCampo('campoJustificativa');
  if (justificativa) {
    linhas.push(['Justificativa', justificativa]);
  }

  var container = document.getElementById('resumoConfirmacao');
  container.innerHTML = '';

  linhas.forEach(function (linha) {
    var divLinha = document.createElement('div');
    divLinha.className = 'linha-resumo';
    divLinha.innerHTML = '<span class="rotulo">' + linha[0] + '</span><span class="valor">' + escaparHtml(String(linha[1])) + '</span>';
    container.appendChild(divLinha);
  });
}

function formatarDataParaExibicao(dataIso) {
  if (!dataIso) return '-';
  var partes = dataIso.split('-');
  if (partes.length !== 3) return dataIso;
  return partes[2] + '/' + partes[1] + '/' + partes[0];
}

function escaparHtml(texto) {
  var div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

/* ============================================================
   ENVIO DO CADASTRO
   ============================================================ */

function montarPayload() {
  return {
    nucleo: obterValorCampo('campoNucleo'),
    estado: obterValorCampo('campoEstado'),
    cidade: obterValorCampo('campoCidade'),
    responsavel: obterValorCampo('campoResponsavel').trim(),
    os: Number(obterValorCampo('campoOS')),
    tipoAcao: obterValorCampo('campoTipoAcao').trim(),
    nomeAcao: obterValorCampo('campoNomeAcao').trim(),
    data: obterValorCampo('campoData'),
    horaInicial: obterValorCampo('campoHoraInicial'),
    horaFinal: obterValorCampo('campoHoraFinal'),
    local: obterValorCampo('campoLocal').trim(),
    chPrevista: obterValorCampo('campoChPrevista') || '',
    chRealizada: obterValorCampo('campoChRealizada') || '',
    metaPrevista: obterValorCampo('campoMetaPrevista') || '',
    inscritos: obterValorCampo('campoInscritos') || '',
    participantesAtendidos: obterValorCampo('campoParticipantesAtendidos') || '',
    justificativa: obterValorCampo('campoJustificativa').trim()
  };
}

async function enviarCadastro() {
  var botao = document.getElementById('botaoConfirmarCadastro');
  var textoOriginal = botao.textContent;

  botao.disabled = true;
  botao.textContent = 'Cadastrando...';

  var payload = montarPayload();

  ultimoCadastro.nomeAcao = payload.nomeAcao;
  ultimoCadastro.nucleo = payload.nucleo;
  ultimoCadastro.osLabel = obterRotuloOS(payload.os);

  try {
    var resposta = await cadastrarAcao(payload);

    if (resposta.sucesso) {
      ultimoCadastro.idAcao = resposta.dados.idAcao;
      ultimoCadastro.pastaUrl = resposta.dados.pastaUrl;
      mostrarResultadoSucesso();
    } else {
      console.error('Erro ao cadastrar acao:', resposta.erro);
      mostrarResultadoErro(traduzirErroApi(resposta.erro));
    }
  } finally {
    botao.disabled = false;
    botao.textContent = textoOriginal;
  }
}

/* ============================================================
   TELA DE RESULTADO
   ============================================================ */

function configurarTelaResultado() {
  document.getElementById('botaoAbrirPasta').addEventListener('click', function () {
    if (ultimoCadastro.pastaUrl) {
      window.open(ultimoCadastro.pastaUrl, '_blank');
    }
  });

  document.getElementById('botaoCadastrarOutraSucesso').addEventListener('click', reiniciarFormulario);
  document.getElementById('botaoVoltarInicioSucesso').addEventListener('click', function () {
    window.location.href = 'index.html';
  });

  document.getElementById('botaoTentarNovamente').addEventListener('click', function () {
    mostrarTela('telaConfirmacao');
  });
  document.getElementById('botaoVoltarInicioErro').addEventListener('click', function () {
    window.location.href = 'index.html';
  });
}

function mostrarResultadoSucesso() {
  document.getElementById('resultadoId').textContent = ultimoCadastro.idAcao;
  document.getElementById('resultadoNome').textContent = ultimoCadastro.nomeAcao;
  document.getElementById('resultadoOS').textContent = ultimoCadastro.osLabel;
  document.getElementById('resultadoNucleo').textContent = ultimoCadastro.nucleo;

  document.getElementById('resultadoSucesso').classList.remove('oculto');
  document.getElementById('resultadoErro').classList.add('oculto');
  mostrarTela('telaResultado');
}

function mostrarResultadoErro(mensagemTraduzida) {
  document.getElementById('mensagemErroGeral').textContent = mensagemTraduzida;

  document.getElementById('resultadoErro').classList.remove('oculto');
  document.getElementById('resultadoSucesso').classList.add('oculto');
  mostrarTela('telaResultado');
}

/* ============================================================
   REINICIAR FORMULARIO (para "Cadastrar outra acao")
   ============================================================ */

function reiniciarFormulario() {
  var idsParaLimpar = [
    'campoNucleo', 'campoEstado', 'campoCidade', 'campoResponsavel', 'campoOS',
    'campoTipoAcao', 'campoNomeAcao', 'campoData', 'campoHoraInicial', 'campoHoraFinal',
    'campoLocal', 'campoChPrevista', 'campoChRealizada', 'campoMetaPrevista',
    'campoInscritos', 'campoParticipantesAtendidos', 'campoPercentualAlcancado',
    'campoResultado', 'campoJustificativa'
  ];

  idsParaLimpar.forEach(function (id) {
    document.getElementById(id).value = '';
  });

  document.querySelectorAll('.campo.invalido').forEach(function (campo) {
    campo.classList.remove('invalido');
  });

  ultimoCadastro = {};

  irParaEtapa(1);
  mostrarTela('telaFormulario');
}
