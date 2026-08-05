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

  return 'Nao foi possivel concluir a acao agora. Tente novamente. Se o problema continuar, entre em contato com o suporte tecnico.';
}
