/**
 * PROSPERA NACIONAL - CAMADA DE API
 *
 * Todo fetch() do sistema fica exclusivamente neste arquivo.
 * As telas (inicio.js, cadastrar.js) chamam essas funcoes e nunca
 * conversam diretamente com a URL do backend.
 *
 * Todas as funcoes retornam o JSON ja decodificado, no mesmo formato
 * que a API devolve: { sucesso: true, dados: ... } ou
 * { sucesso: false, erro: '...' }.
 *
 * Erros de rede (sem conexao, backend fora do ar, resposta que nao e
 * JSON valido) sao capturados e convertidos para o mesmo formato,
 * com uma mensagem tecnica registrada em console.error e uma mensagem
 * de erro padronizada para a tela.
 */

/**
 * Executa uma chamada GET para a API, com a acao e os parametros
 * informados, e devolve o JSON ja decodificado.
 */
async function apiGet(acao, parametros) {
  var url = API_URL + '?acao=' + encodeURIComponent(acao);

  if (parametros) {
    Object.keys(parametros).forEach(function (chave) {
      if (parametros[chave] !== undefined && parametros[chave] !== null && parametros[chave] !== '') {
        url += '&' + encodeURIComponent(chave) + '=' + encodeURIComponent(parametros[chave]);
      }
    });
  }

  try {
    var resposta = await fetch(url, { method: 'GET' });
    var texto = await resposta.text();
    return JSON.parse(texto);
  } catch (erro) {
    console.error('Falha na chamada GET (' + acao + '):', erro);
    return { sucesso: false, erro: 'ERRO_DE_REDE' };
  }
}

/**
 * Executa uma chamada GET para a API que GRAVA dados (usada apenas por
 * atualizarChecklist e alterarStatus). E identica a apiGet, com uma
 * unica diferenca proposital: NAO descarta parametros com valor de
 * texto vazio (''), porque nesses dois casos um texto vazio pode ser
 * uma informacao valida (por exemplo, apagar o conteudo do campo
 * Observacao). apiGet continua descartando valores vazios, sem
 * alteracao, para nao mudar o comportamento das consultas que ja
 * funcionam.
 *
 * Motivo de usar GET aqui em vez de POST: chamadas POST feitas com
 * fetch() para este Web App estavam sendo redirecionadas de um jeito
 * que descartava o metodo e o corpo da requisicao, fazendo o pedido
 * cair sem nenhum dado no doGet do backend. Usar GET evita esse
 * problema, aproveitando o mesmo caminho que ja e confiavel para as
 * consultas.
 */
async function apiGetEscrita(acao, parametros) {
  var url = API_URL + '?acao=' + encodeURIComponent(acao);

  if (parametros) {
    Object.keys(parametros).forEach(function (chave) {
      var valor = parametros[chave];
      if (valor !== undefined && valor !== null) {
        url += '&' + encodeURIComponent(chave) + '=' + encodeURIComponent(valor);
      }
    });
  }

  try {
    var resposta = await fetch(url, { method: 'GET' });
    var texto = await resposta.text();
    return JSON.parse(texto);
  } catch (erro) {
    console.error('Falha na chamada de escrita (' + acao + '):', erro);
    return { sucesso: false, erro: 'ERRO_DE_REDE' };
  }
}

/**
 * Executa uma chamada POST para a API. O Content-Type e sempre
 * text/plain;charset=utf-8 de proposito: evita que o navegador dispare
 * um preflight OPTIONS (que o Web App do Apps Script nao responde),
 * sem prejudicar nada, ja que o backend decodifica o corpo como JSON
 * manualmente, independente do Content-Type declarado.
 */
async function apiPost(acao, dadosAdicionais) {
  var corpo = Object.assign({ acao: acao }, dadosAdicionais || {});

  try {
    var resposta = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(corpo)
    });
    var texto = await resposta.text();
    return JSON.parse(texto);
  } catch (erro) {
    console.error('Falha na chamada POST (' + acao + '):', erro);
    return { sucesso: false, erro: 'ERRO_DE_REDE' };
  }
}

/**
 * Busca a lista de nucleos ativos e a lista das 07 OS, ja configuradas
 * no backend. Usada para popular os menus suspensos do formulario.
 */
async function listarConfiguracoes() {
  return apiGet('listarConfiguracoes');
}

/**
 * Busca todas as acoes cadastradas. Usada na tela Inicio para calcular
 * o resumo de contagens por status.
 */
async function consultarAcoes() {
  return apiGet('consultarAcoes');
}

/**
 * Envia o cadastro de uma nova acao. payload deve conter exatamente os
 * campos esperados pelo backend: nucleo, estado, cidade, responsavel,
 * os, tipoAcao, nomeAcao, data (AAAA-MM-DD), horaInicial, horaFinal,
 * local, chPrevista, chRealizada, metaPrevista, inscritos,
 * participantesAtendidos, justificativa.
 */
async function cadastrarAcao(payload) {
  return apiPost('cadastrarAcao', { payload: payload });
}

/**
 * Busca os dados completos de uma acao especifica pelo ID.
 * Usada na Ficha da Acao (Etapa 3).
 */
async function consultarAcaoPorId(idAcao) {
  return apiGet('consultarAcaoPorId', { idAcao: idAcao });
}

/**
 * Busca o checklist documental de uma acao especifica.
 * Usada na Ficha da Acao (Etapa 3).
 */
async function consultarChecklist(idAcao) {
  return apiGet('consultarChecklist', { idAcao: idAcao });
}

/**
 * Altera o status de uma acao (EM ABERTO, EM CONFERENCIA, PRECISA
 * CORRIGIR ou PRONTA). responsavelAlteracao e sempre digitado na hora,
 * ja que o sistema ainda nao tem login. observacao e opcional.
 *
 * Usa apiGetEscrita (nao apiPost) para contornar o problema de
 * confiabilidade do POST explicado em apiGetEscrita.
 */
async function alterarStatus(idAcao, novoStatus, responsavelAlteracao, observacao) {
  return apiGetEscrita('alterarStatus', {
    idAcao: idAcao,
    novoStatus: novoStatus,
    responsavelAlteracao: responsavelAlteracao,
    observacao: observacao || ''
  });
}

/**
 * Atualiza um documento do checklist de uma acao: status, link e/ou
 * observacao. link e observacao sao opcionais - so sao gravados quando
 * informados, sem apagar o que ja estava salvo quando omitidos.
 *
 * Usa apiGetEscrita (nao apiPost) para contornar o problema de
 * confiabilidade do POST explicado em apiGetEscrita.
 */
async function atualizarChecklist(idAcao, nomeDocumento, status, link, observacao) {
  return apiGetEscrita('atualizarChecklist', {
    idAcao: idAcao,
    nomeDocumento: nomeDocumento,
    status: status,
    link: link,
    observacao: observacao
  });
}

/**
 * Extrai apenas a parte da data (AAAA-MM-DD) de um valor vindo da API,
 * que chega como texto ISO completo (por exemplo
 * "2026-08-05T03:00:00.000Z", porque o backend grava a Data como data
 * real e o Apps Script serializa objetos Date assim em JSON).
 *
 * Pega sempre os primeiros 10 caracteres em vez de construir um objeto
 * Date no navegador, para nao correr risco de a data mudar de dia por
 * causa do fuso horario do dispositivo de quem esta usando o sistema.
 */
function extrairDataIsoDeApi(valorData) {
  var texto = String(valorData || '');
  return texto.length >= 10 ? texto.substring(0, 10) : texto;
}

/**
 * Formata um valor de data vindo da API para exibicao: DD/MM/AAAA.
 */
function formatarDataExibicaoApi(valorData) {
  var dataIso = extrairDataIsoDeApi(valorData);
  var partes = dataIso.split('-');
  if (partes.length !== 3) return dataIso || '-';
  return partes[2] + '/' + partes[1] + '/' + partes[0];
}

/**
 * Traduz o codigo interno de status para o texto exibido ao usuario.
 */
var TEXTOS_STATUS = {
  'EM ABERTO': 'Em Aberto',
  'EM CONFERENCIA': 'Em Conferência',
  'PRECISA CORRIGIR': 'Precisa Corrigir',
  'PRONTA': 'Pronta'
};

function textoStatusExibicao(status) {
  var chave = String(status || '').toUpperCase().trim();
  return TEXTOS_STATUS[chave] || status || '-';
}

/**
 * Retorna a classe CSS do selo (badge) correspondente a um status.
 */
var CLASSES_SELO_STATUS = {
  'EM ABERTO': '',
  'EM CONFERENCIA': 'selo-conferencia',
  'PRECISA CORRIGIR': 'selo-corrigir',
  'PRONTA': 'selo-pronta'
};

function classeSeloStatus(status) {
  var chave = String(status || '').toUpperCase().trim();
  return CLASSES_SELO_STATUS.hasOwnProperty(chave) ? CLASSES_SELO_STATUS[chave] : '';
}

/**
 * Traduz as mensagens de erro conhecidas da API para uma linguagem
 * simples e humana, adequada para pessoas sem conhecimento tecnico.
 * Mensagens nao mapeadas caem no texto genero padrao.
 *
 * O texto tecnico original e sempre preservado no console (chamado por
 * quem invoca esta funcao), nunca exibido na tela.
 */
function traduzirErroApi(mensagemOriginal) {
  var mensagem = String(mensagemOriginal || '');

  if (mensagem === 'ERRO_DE_REDE') {
    return 'Nao foi possivel falar com o sistema agora. Verifique sua conexao e tente novamente.';
  }
  if (mensagem.indexOf('Ja existe uma acao cadastrada') !== -1) {
    return 'Ja existe uma acao cadastrada com esses mesmos dados. Confira se essa acao nao foi lancada antes.';
  }
  if (mensagem.indexOf('Campo obrigatorio ausente') !== -1) {
    return 'Falta preencher um campo obrigatorio. Confira o formulario e tente novamente.';
  }
  if (mensagem.indexOf('OS invalida') !== -1 || mensagem.indexOf('Nucleo invalido') !== -1) {
    return 'Nucleo ou OS invalidos. Atualize a pagina e tente selecionar novamente.';
  }
  if (mensagem.indexOf('Sistema ocupado') !== -1) {
    return 'O sistema esta processando outro cadastro agora. Aguarde alguns segundos e tente de novo.';
  }
  if (mensagem.indexOf('Data invalida') !== -1) {
    return 'A data informada nao e valida. Confira o dia digitado.';
  }
  if (mensagem.indexOf('ja esta com o status') !== -1) {
    return 'Essa acao ja esta com esse status. Nada foi alterado.';
  }
  if (mensagem.indexOf('Status invalido') !== -1) {
    return 'Status invalido. Atualize a pagina e tente novamente.';
  }
  if (mensagem.indexOf('Acao nao encontrada') !== -1) {
    return 'Essa acao nao foi encontrada. Ela pode ter sido removida.';
  }

  return 'Nao foi possivel concluir a acao agora. Tente novamente. Se o problema continuar, entre em contato com o suporte tecnico.';
}
