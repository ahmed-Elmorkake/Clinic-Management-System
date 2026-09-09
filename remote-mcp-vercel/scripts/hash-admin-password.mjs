import { randomBytes, scryptSync } from 'node:crypto'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'

const prompt = createInterface({ input: stdin, output: stdout })
try {
  const password = await prompt.question('MCP administrator password: ')
  if (password.length < 12) throw new Error('Use at least 12 characters.')
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  console.log(`scrypt$${salt}$${hash}`)
} finally {
  prompt.close()
}
