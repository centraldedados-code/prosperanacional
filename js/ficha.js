/**
 * PROSPERA NACIONAL - FICHA DA ACAO
 *
 * Le o ID da acao pela URL (?id=...), busca os dados completos
 * (consultarAcaoPorId) e o checklist (consultarChecklist), exibe tudo
 * em blocos de leitura, e permite duas acoes de escrita nesta tela:
 * atualizar um documento do checklist (atualizarChecklist) e alterar o
 * status da acao (alterarStatus). Nenhuma outra edicao e feita aqui -
 * Identificacao, Execucao e Resultados sao somente leitura nesta etapa.
 */

var NOMES_EXIBICAO_OS_FICHA = {
  1: 'Diagnóstico', 2: 'Mapeamento', 3: 'Caderno', 4: 'Seminários',
  5: 'Oficinas', 6: 'Palestras', 7: 'Consultorias'
};

var TEXTOS_OBRIGATORIO = { 'SIM': 'Sim', 'NAO': 'Não', 'A VALIDAR': 'A validar' };
var CLASSES_OBRIGATORIO = { 'SIM': 'sim', 'NAO': 'nao', 'A VALIDAR': 'avalidar' };

var TEXTOS_STATUS_DOCUMENTO = {
  'PREVISTO': 'Previsto',
  'ENVIADO': 'Enviado',
  'FALTANTE': 'Faltante',
  'NAO APLICAVEL': 'Não aplicável',
  'A VALIDAR': 'A validar'
};

var idAcaoAtual = null;
var acaoAtual = null;

document.addEventListener('DOMContentLoaded', function () {
  idAcaoAtual = obterIdDaUrl();

  if (!idAcaoAtual) {
    mostrarErroFicha('Nenhuma ação foi informada. Volte para a lista e escolha uma ação.');
    return;
  }

  carregarFicha();
  configurarBotaoAbrirPasta();
  configurarAlteracaoDeStatus();
});

function obterIdDaUrl() {
  var parametros = new URLSearchParams(window.location.search);
  return parametros.get('id');
}

/* ============================================================
   CARREGAMENTO DA FICHA
   ============================================================ */

async function carregarFicha() {
  var respostaAcao = await consultarAcaoPorId(idAcaoAtual);

  if (!respostaAcao.sucesso) {
    console.error('Falha ao consultar acao:', respostaAcao.erro);
    mostrarErroFicha(traduzirErroApi(respostaAcao.erro));
    return;
  }

  if (!respostaAcao.dados) {
    mostrarErroFicha('Essa ação não foi encontrada. Ela pode ter sido removida.');
    return;
  }

  acaoAtual = respostaAcao.dados;
  preencherFicha(acaoAtual);

  var respostaChecklist = await consultarChecklist(idAcaoAtual);
  if (!respostaChecklist.sucesso) {
    console.error('Falha ao consultar checklist:', respostaChecklist.erro);
    document.getElementById('resumoChecklistFicha').textContent = 'Não foi possível carregar o checklist agora.';
  } else {
    renderizarChecklist(respostaChecklist.dados || []);
  }

  document.getElementById('conteudoFicha').classList.remove('oculto');
}

function mostrarErroFicha(mensagem) {
  var aviso = document.getElementById('avisoErroFicha');
  aviso.textContent = mensagem;
  aviso.classList.remove('oculto');
}

/* ============================================================
   PREENCHIMENTO DOS BLOCOS DE LEITURA
   ============================================================ */

function preencherFicha(acao) {
  document.getElementById('tituloFicha').textContent = 'Ficha da ação - ' + acao.ID_Acao;

  var seloStatus = document.getElementById('seloStatusAtual');
  seloStatus.textContent = textoStatusExibicao(acao.Status);
  seloStatus.className = 'selo-status ' + classeSeloStatus(acao.Status);

  definirTexto('valorId', acao.ID_Acao);
  definirTexto('valorNucleo', acao.Nucleo);
  definirTexto('valorEstado', acao.Estado);
  definirTexto('valorCidade', acao.Cidade);
  definirTexto('valorOS', acao.OS);
  definirTexto('valorTipoAcao', acao.Tipo_Acao);
  definirTexto('valorNomeAcao', acao.Nome_Acao);
  definirTexto('valorResponsavel', acao.Responsavel);

  definirTexto('valorData', formatarDataExibicaoApi(acao.Data));

  var horaInicial = formatarHoraExibicaoApi(acao.Hora_Inicial);
  var horaFinal = formatarHoraExibicaoApi(acao.Hora_Final);
  var horario = '-';
  if (horaInicial && horaFinal) {
    horario = horaInicial + ' às ' + horaFinal;
  } else if (horaInicial || horaFinal) {
    horario = horaInicial || horaFinal;
  }
  definirTexto('valorHorario', horario);

  definirTexto('valorLocal', acao.Local);
  definirTexto('valorChPrevista', acao.CH_Prevista ? acao.CH_Prevista + ' horas' : '-');
  definirTexto('valorChRealizada', acao.CH_Realizada ? acao.CH_Realizada + ' horas' : '-');

  definirTexto('valorMetaPrevista', acao.Meta_Prevista || '-');
  definirTexto('valorInscritos', acao.Inscritos || '-');
  definirTexto('valorParticipantesAtendidos', acao.Participantes_Atendidos || '-');

  var percentual = acao.Percentual_Alcancado !== '' && acao.Percentual_Alcancado !== undefined && acao.Percentual_Alcancado !== null
    ? acao.Percentual_Alcancado + '%'
    : '-';
  definirTexto('valorPercentual', percentual);

  var resultado = percentual !== '-'
    ? percentual + ' da meta alcançada.'
    : 'Sem meta ou participantes informados para calcular.';
  definirTexto('valorResultado', resultado);

  definirTexto('valorJustificativa', acao.Justificativa || '-');
}

function definirTexto(idElemento, valor) {
  document.getElementById(idElemento).textContent = (valor === undefined || valor === null || valor === '') ? '-' : valor;
}

/**
 * Formata um horario vindo da API para exibicao: HH:MM.
 *
 * O campo Hora_Inicial/Hora_Final chega do formulario de cadastro como
 * texto simples ("09:00"), mas o Google Sheets reconhece esse padrao e
 * converte a celula para um valor de hora de verdade. Isso faz a API
 * devolver um texto de data/hora completo, com uma data-base fixa
 * (1899-12-30, forma como o Sheets representa "so a hora"). Esta funcao
 * aceita os dois formatos:
 * - "09:00" (texto simples, caso venha assim de algum lugar)
 * - "1899-12-30T12:00:00.000Z" (valor de hora convertido pelo Sheets)
 * e sempre devolve "HH:MM" no horario local de quem esta usando o
 * sistema, revertendo a conversao de fuso horario da mesma forma como
 * ela foi aplicada na gravacao.
 */
function formatarHoraExibicaoApi(valor) {
  if (!valor) return '';

  var texto = String(valor);

  if (/^\d{2}:\d{2}$/.test(texto)) {
    return texto;
  }

  var dataHora = new Date(texto);
  if (isNaN(dataHora.getTime())) {
    return texto;
  }

  var horas = String(dataHora.getHours()).padStart(2, '0');
  var minutos = String(dataHora.getMinutes()).padStart(2, '0');
  return horas + ':' + minutos;
}

function configurarBotaoAbrirPasta() {
  document.getElementById('botaoAbrirPastaFicha').addEventListener('click', function () {
    if (acaoAtual && acaoAtual.URL_Pasta_Drive) {
      window.open(acaoAtual.URL_Pasta_Drive, '_blank');
    }
  });
}

/* ============================================================
   CHECKLIST DOCUMENTAL (leitura + atualizacao por linha)
   ============================================================ */

function renderizarChecklist(itens) {
  var corpo = document.getElementById('corpoTabelaChecklist');
  corpo.innerHTML = '';

  // Regra de classificacao do resumo:
  // PREVISTO e FALTANTE -> pendente (falta enviar um documento que ja se
  //   sabe que e exigido).
  // A VALIDAR -> nao concluido, mas por um motivo diferente: a propria
  //   lista de documentos obrigatorios dessa OS ainda nao foi definida
  //   pela coordenacao. Nunca deve contar como documentacao completa.
  // ENVIADO e NAO APLICAVEL -> concluido para fins deste resumo.
  var pendentes = itens.filter(function (item) {
    var status = String(item.Status).toUpperCase().trim();
    return status === 'PREVISTO' || status === 'FALTANTE';
  }).length;

  var aValidar = itens.filter(function (item) {
    return String(item.Status).toUpperCase().trim() === 'A VALIDAR';
  }).length;

  var resumo = document.getElementById('resumoChecklistFicha');
  resumo.classList.remove('completo');

  if (itens.length === 0) {
    resumo.textContent = 'Nenhum documento cadastrado no checklist desta ação.';
  } else if (pendentes === 0 && aValidar === 0) {
    resumo.textContent = 'Toda a documentação obrigatória foi conferida.';
    resumo.classList.add('completo');
  } else if (pendentes === 0 && aValidar > 0) {
    resumo.textContent = 'Há documentação que ainda precisa ser validada pela coordenação.';
  } else if (pendentes > 0 && aValidar === 0) {
    resumo.textContent = pendentes + ' de ' + itens.length + ' documentos pendentes.';
  } else {
    resumo.textContent = pendentes + ' de ' + itens.length + ' documentos pendentes, além de itens que ainda precisam ser validados pela coordenação.';
  }

  itens.forEach(function (item, indice) {
    corpo.appendChild(montarLinhaChecklist(item, indice));
  });
}

function montarLinhaChecklist(item, indice) {
  var linha = document.createElement('tr');

  var obrigatorioChave = String(item.Obrigatorio || '').toUpperCase().trim();
  var textoObrigatorio = TEXTOS_OBRIGATORIO[obrigatorioChave] || item.Obrigatorio || '-';
  var classeObrigatorio = CLASSES_OBRIGATORIO[obrigatorioChave] || 'avalidar';

  var idSelect = 'statusChecklist' + indice;
  var idLink = 'linkChecklist' + indice;
  var idObservacao = 'observacaoChecklist' + indice;
  var idMensagem = 'mensagemChecklist' + indice;

  var opcoesStatus = Object.keys(TEXTOS_STATUS_DOCUMENTO).map(function (chave) {
    var selecionado = String(item.Status).toUpperCase().trim() === chave ? ' selected' : '';
    return '<option value="' + chave + '"' + selecionado + '>' + TEXTOS_STATUS_DOCUMENTO[chave] + '</option>';
  }).join('');

  linha.innerHTML =
    '<td class="nome-documento">' + escaparHtmlFicha(item.Documento) + '</td>' +
    '<td><span class="selo-obrigatorio ' + classeObrigatorio + '">' + textoObrigatorio + '</span></td>' +
    '<td><select id="' + idSelect + '">' + opcoesStatus + '</select></td>' +
    '<td><input type="text" id="' + idLink + '" value="' + escaparHtmlFicha(item.Link || '') + '" placeholder="Link do documento"></td>' +
    '<td>' + (item.Data_Envio ? formatarDataExibicaoApi(item.Data_Envio) : '-') + '</td>' +
    '<td><input type="text" id="' + idObservacao + '" value="' + escaparHtmlFicha(item.Observacao || '') + '" placeholder="Observação"></td>' +
    '<td>' +
      '<div class="acoes-linha-checklist">' +
        '<button type="button" class="botao botao-secundario botao-salvar-linha" data-documento="' + escaparHtmlFicha(item.Documento) + '">Salvar</button>' +
        '<div class="mensagem-linha-salva" id="' + idMensagem + '"></div>' +
      '</div>' +
    '</td>';

  var botaoSalvar = linha.querySelector('.botao-salvar-linha');
  botaoSalvar.addEventListener('click', function () {
    salvarLinhaChecklist(item.Documento, idSelect, idLink, idObservacao, idMensagem, botaoSalvar);
  });

  return linha;
}

async function salvarLinhaChecklist(nomeDocumento, idSelect, idLink, idObservacao, idMensagem, botao) {
  var status = document.getElementById(idSelect).value;
  var link = document.getElementById(idLink).value.trim();
  var observacao = document.getElementById(idObservacao).value.trim();
  var mensagem = document.getElementById(idMensagem);

  var textoOriginal = botao.textContent;
  botao.disabled = true;
  botao.textContent = 'Salvando...';
  mensagem.classList.remove('visivel');

  try {
    var resposta = await atualizarChecklist(idAcaoAtual, nomeDocumento, status, link, observacao);

    if (!resposta.sucesso) {
      console.error('Falha ao atualizar checklist:', resposta.erro);
      mensagem.textContent = traduzirErroApi(resposta.erro);
      mensagem.style.color = 'var(--vermelho-erro)';
      mensagem.classList.add('visivel');
      return;
    }

    mensagem.textContent = 'Salvo.';
    mensagem.style.color = 'var(--verde-sucesso)';
    mensagem.classList.add('visivel');

    // recarrega o checklist inteiro, para refletir a Data_Envio que o
    // backend grava automaticamente quando o status muda para Enviado.
    var respostaChecklistAtualizado = await consultarChecklist(idAcaoAtual);
    if (respostaChecklistAtualizado.sucesso) {
      renderizarChecklist(respostaChecklistAtualizado.dados || []);
    }
  } finally {
    botao.disabled = false;
    botao.textContent = textoOriginal;
  }
}

/* ============================================================
   ALTERACAO DE STATUS DA ACAO
   ============================================================ */

function configurarAlteracaoDeStatus() {
  document.getElementById('botaoConfirmarStatus').addEventListener('click', confirmarAlteracaoStatus);
}

async function confirmarAlteracaoStatus() {
  var novoStatus = document.getElementById('selecaoNovoStatus').value;
  var campoResponsavel = document.getElementById('responsavelAlteracaoStatus');
  var responsavel = campoResponsavel.value.trim();
  var mensagem = document.getElementById('mensagemStatus');
  var botao = document.getElementById('botaoConfirmarStatus');

  mensagem.classList.remove('visivel');

  if (!responsavel) {
    campoResponsavel.style.borderColor = 'var(--vermelho-erro)';
    mensagem.textContent = 'Informe o nome de quem está alterando o status.';
    mensagem.style.color = 'var(--vermelho-erro)';
    mensagem.classList.add('visivel');
    return;
  }
  campoResponsavel.style.borderColor = '';

  var textoOriginal = botao.textContent;
  botao.disabled = true;
  botao.textContent = 'Salvando...';

  try {
    var resposta = await alterarStatus(idAcaoAtual, novoStatus, responsavel, '');

    if (!resposta.sucesso) {
      console.error('Falha ao alterar status:', resposta.erro);
      mensagem.textContent = traduzirErroApi(resposta.erro);
      mensagem.style.color = 'var(--vermelho-erro)';
      mensagem.classList.add('visivel');
      return;
    }

    var seloStatus = document.getElementById('seloStatusAtual');
    seloStatus.textContent = textoStatusExibicao(novoStatus);
    seloStatus.className = 'selo-status ' + classeSeloStatus(novoStatus);

    mensagem.textContent = 'Status alterado com sucesso.';
    mensagem.style.color = 'var(--verde-sucesso)';
    mensagem.classList.add('visivel');
  } finally {
    botao.disabled = false;
    botao.textContent = textoOriginal;
  }
}

function escaparHtmlFicha(texto) {
  var div = document.createElement('div');
  div.textContent = texto === undefined || texto === null ? '' : String(texto);
  return div.innerHTML;
}
