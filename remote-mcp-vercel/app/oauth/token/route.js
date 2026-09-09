import { createHash } from 'node:crypto'
import { db } from '../../../lib/firebase.js'
import { asScopeList, issueAccessToken, issueRefreshToken, tokenId, verifyToken } from '../../../lib/oauth.js'
import { json } from '../../../lib/response.js'

const verifierChallenge = (verifier) => createHash('sha256').update(verifier).digest('base64url')

export const POST = async (request) => {
  try {
    const data = Object.fromEntries((await request.formData()).entries())
    if (data.grant_type === 'authorization_code') {
      const payload = await verifyToken(String(data.code || ''))
      if (payload.type !== 'authorization_code' || payload.clientId !== data.client_id || payload.redirectUri !== data.redirect_uri || verifierChallenge(String(data.code_verifier || '')) !== payload.codeChallenge) return json({ error: 'invalid_grant' }, 400)
      const codeRef = db.doc(`mcpOAuthCodes/${tokenId(data.code)}`)
      await db.runTransaction(async (transaction) => { const snapshot = await transaction.get(codeRef); if (!snapshot.exists || snapshot.data().used === true) throw new Error('used_code'); transaction.update(codeRef, { used: true }) })
      const accessToken = await issueAccessToken(payload.scope); const refreshToken = await issueRefreshToken(payload.scope)
      return json({ access_token: accessToken, token_type: 'Bearer', expires_in: 3600, refresh_token: refreshToken, scope: payload.scope })
    }
    if (data.grant_type === 'refresh_token') {
      const payload = await verifyToken(String(data.refresh_token || ''))
      if (payload.type !== 'refresh_token') return json({ error: 'invalid_grant' }, 400)
      const accessToken = await issueAccessToken(payload.scope)
      return json({ access_token: accessToken, token_type: 'Bearer', expires_in: 3600, scope: payload.scope })
    }
    return json({ error: 'unsupported_grant_type' }, 400)
  } catch { return json({ error: 'invalid_grant' }, 400) }
}
