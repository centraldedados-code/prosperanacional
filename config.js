/**
 * PROSPERA NACIONAL - CONFIGURACAO DO FRONTEND
 *
 * Unico arquivo que conhece a URL do backend (Google Apps Script Web App).
 * Nenhum outro arquivo do frontend deve conter essa URL diretamente -
 * todos usam a constante API_URL definida aqui.
 *
 * Se a implantacao do Web App mudar no futuro (nova versao publicada com
 * uma URL diferente), este e o UNICO arquivo que precisa ser editado.
 *
 * Nao ha tokens, senhas ou credenciais neste arquivo nem em nenhum outro
 * arquivo do frontend - o Web App e publico (GET/POST simples) e nao
 * exige autenticacao nesta etapa.
 */

var API_URL = 'https://script.google.com/macros/s/AKfycbzYg_dSqMY0KIg_gDPIBeDSc5HUsDC9sNc8ifFbRGoaohEvgT69j-ZQZxZzPIux2pg/exec';
