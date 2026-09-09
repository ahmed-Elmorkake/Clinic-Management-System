import { createSecretKey } from 'node:crypto'

const required = (key) => {
  const value = process.env[key]
  if (!value) throw new Error(`${key} is required.`)
  return value
}

export const config = {
  origin: required('MCP_PUBLIC_ORIGIN').replace(/\/$/, ''),
  adminEmail: required('MCP_ADMIN_EMAIL').trim().toLowerCase(),
  adminPasswordHash: required('MCP_ADMIN_PASSWORD_HASH'),
  signingKey: createSecretKey(Buffer.from(required('MCP_OAUTH_SIGNING_SECRET'))),
}
