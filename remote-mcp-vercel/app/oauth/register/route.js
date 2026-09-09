import { encodeClient } from '../../../lib/oauth.js'
import { json } from '../../../lib/response.js'

export const POST = async (request) => {
  try {
    const body = await request.json()
    const redirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris : []
    if (!redirectUris.length || redirectUris.some((uri) => typeof uri !== 'string' || !uri.startsWith('https://'))) return json({ error: 'invalid_client_metadata', error_description: 'At least one HTTPS redirect URI is required.' }, 400)
    const clientId = await encodeClient(redirectUris, typeof body.client_name === 'string' ? body.client_name : 'Claude')
    return json({ client_id: clientId, client_id_issued_at: Math.floor(Date.now() / 1000), redirect_uris: redirectUris, token_endpoint_auth_method: 'none', grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'], client_name: typeof body.client_name === 'string' ? body.client_name : 'Claude' }, 201)
  } catch { return json({ error: 'invalid_client_metadata' }, 400) }
}
