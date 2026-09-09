import { config } from '../../../lib/config.js'
import { json } from '../../../lib/response.js'

export const GET = () => json({ issuer: config.origin, authorization_endpoint: `${config.origin}/oauth/authorize`, token_endpoint: `${config.origin}/oauth/token`, registration_endpoint: `${config.origin}/oauth/register`, response_types_supported: ['code'], grant_types_supported: ['authorization_code', 'refresh_token'], code_challenge_methods_supported: ['S256'], scopes_supported: ['shefaa:manage'], token_endpoint_auth_methods_supported: ['none'], client_id_metadata_document_supported: false })
