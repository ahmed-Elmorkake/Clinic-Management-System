import { randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import { calculateJwkThumbprint, decodeJwt, jwtVerify, SignJWT } from 'jose'
import { config } from './config.js'

const issuer = () => config.origin

export const passwordMatches = (password) => {
  const [algorithm, salt, expected] = config.adminPasswordHash.split('$')
  if (algorithm !== 'scrypt' || !salt || !expected) return false
  const actual = scryptSync(password, salt, 64).toString('hex')
  return actual.length === expected.length && timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
}

export const signToken = async (payload, expiresIn) => new SignJWT(payload)
  .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
  .setIssuer(issuer())
  .setIssuedAt()
  .setExpirationTime(expiresIn)
  .setJti(randomUUID())
  .sign(config.signingKey)

export const verifyToken = async (token) => {
  const { payload } = await jwtVerify(token, config.signingKey, { issuer: issuer() })
  return payload
}

export const encodeClient = (redirectUris, clientName = 'Claude') => signToken({ type: 'client', redirectUris, clientName }, '365d')
export const decodeClient = async (clientId) => {
  const payload = await verifyToken(clientId)
  if (payload.type !== 'client' || !Array.isArray(payload.redirectUris)) throw new Error('Invalid OAuth client.')
  return payload
}

export const issueAuthorizationCode = ({ clientId, redirectUri, codeChallenge, scope }) => signToken({ type: 'authorization_code', clientId, redirectUri, codeChallenge, scope, user: config.adminEmail }, '5m')
export const issueAccessToken = (scope) => signToken({ type: 'access_token', scope, sub: config.adminEmail }, '1h')
export const issueRefreshToken = (scope) => signToken({ type: 'refresh_token', scope, sub: config.adminEmail }, '30d')

export const asScopeList = (scope) => String(scope || '').split(' ').filter(Boolean)
export const tokenId = (token) => decodeJwt(token).jti
