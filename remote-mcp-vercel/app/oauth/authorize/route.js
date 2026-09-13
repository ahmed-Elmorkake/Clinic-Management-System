import { config } from '../../../lib/config.js'
import { db, FieldValue } from '../../../lib/firebase.js'
import { decodeClient, issueAuthorizationCode, passwordMatches, tokenId } from '../../../lib/oauth.js'
import { formPage } from '../../../lib/response.js'

const paramsFrom = async (request) => request.method === 'POST' ? Object.fromEntries((await request.formData()).entries()) : Object.fromEntries(new URL(request.url).searchParams.entries())
const loginForm = (params, error = '') => formPage({ error, redirectUri: params.redirect_uri, state: params.state || '', clientId: params.client_id, codeChallenge: params.code_challenge, scope: params.scope || '' })
const requestedScopes = (scope) => String(scope || '').split(/\s+/).filter(Boolean)

const validate = async (params) => {
  if (params.response_type !== 'code' || !params.client_id || !params.redirect_uri || !params.code_challenge || params.code_challenge_method !== 'S256') throw new Error('طلب OAuth غير صالح.')
  const client = await decodeClient(params.client_id)
  if (!client.redirectUris.includes(params.redirect_uri)) throw new Error('رابط الرجوع غير مسموح لهذا العميل.')
  if (!requestedScopes(params.scope).includes('shefaa:manage')) throw new Error('النطاق المطلوب غير مسموح.')
}

export const GET = async (request) => {
  const params = await paramsFrom(request)
  try { await validate(params); return loginForm(params) } catch (error) { return formPage({ error: error.message }) }
}

export const POST = async (request) => {
  const params = await paramsFrom(request)
  try {
    await validate(params)
    if (String(params.email || '').trim().toLowerCase() !== config.adminEmail || !passwordMatches(String(params.password || ''))) return loginForm(params, 'بيانات دخول MCP غير صحيحة.')
    const code = await issueAuthorizationCode({ clientId: params.client_id, redirectUri: params.redirect_uri, codeChallenge: params.code_challenge, scope: 'shefaa:manage' })
    const id = tokenId(code)
    await db.doc(`mcpOAuthCodes/${id}`).set({ used: false, createdAt: FieldValue.serverTimestamp(), expiresAt: new Date(Date.now() + 5 * 60 * 1000) })
    const destination = new URL(params.redirect_uri)
    destination.searchParams.set('code', code)
    if (params.state) destination.searchParams.set('state', params.state)
    return Response.redirect(destination, 302)
  } catch (error) { return loginForm(params, error.message || 'تعذر إتمام الربط.') }
}
