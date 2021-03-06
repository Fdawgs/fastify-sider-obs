/* eslint-disable jsdoc/require-param-description */
const fp = require("fastify-plugin");
const createError = require("http-errors");
const request = require("axios");
const queryString = require("querystring");

/**
 * @author Frazer Smith
 * @description Pre-handler plugin that retrieves Keycloak access token for passed user.
 * @param {Function} server - Fastify instance.
 * @param {object} options - Fastify config values.
 * @param {object} options.keycloak - Keycloak endpoint access options values.
 * @param {boolean} options.keycloak.enabled - Toggle to enable or disable use of Keycloak.
 * @param {object} options.keycloak.serviceAuthorisation
 * @param {object} options.keycloak.serviceAuthorisation.form
 * @param {string} options.keycloak.serviceAuthorisation.form.client_id
 * @param {string} options.keycloak.serviceAuthorisation.form.client_secret
 * @param {string} options.keycloak.serviceAuthorisation.form.grant_type
 * @param {string} options.keycloak.serviceAuthorisation.form.password
 * @param {string} options.keycloak.serviceAuthorisation.form.username
 * @param {string} options.keycloak.serviceAuthorisation.url
 * @param {object} options.keycloak.requestToken
 * @param {object} options.keycloak.requestToken.form
 * @param {string} options.keycloak.requestToken.form.audience
 * @param {string} options.keycloak.requestToken.form.client_id
 * @param {string} options.keycloak.requestToken.form.client_secret
 * @param {string} options.keycloak.requestToken.form.grant_type
 * @param {string} options.keycloak.requestToken.form.request_subject
 * @param {string} options.keycloak.requestToken.form.request_token_type
 * @param {string} options.keycloak.requestToken.url
 */
async function plugin(server, options) {
	// Don't add preHandler hook and attempt to retrieve access tokens if Keycloak not enabled
	if (options && options.keycloak && options.keycloak.enabled === true) {
		server.addHook("preHandler", async (req, res) => {
			try {
				const { requestToken, serviceAuthorisation } = options.keycloak;

				// Service authorisation to retrieve subject access token
				const serviceAuthResponse = await request.post(
					serviceAuthorisation.url,
					queryString.stringify(serviceAuthorisation.form)
				);

				requestToken.form.subject_token =
					serviceAuthResponse.data.access_token;

				// Expects the practitioner query to be in [system]|[code] format
				requestToken.form.requested_subject = req.query.practitioner.split(
					"|"
				)[1];

				// Request access token for user
				const userAccessResponse = await request.post(
					requestToken.url,
					queryString.stringify(requestToken.form)
				);
				req.query.access_token = userAccessResponse.data.access_token;
				return;
			} catch (err) {
				server.log.error(err);
				res.send(
					createError(
						500,
						"Unable to retrieve Keycloak access token(s)"
					)
				);
			}
		});
	}
}

module.exports = fp(plugin);
