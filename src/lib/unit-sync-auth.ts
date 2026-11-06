import { createHash, timingSafeEqual } from 'node:crypto'

/** A shorter secret could be guessed, so the endpoints stay closed until a real one is configured. */
const MIN_SECRET_LENGTH = 32

const digest = (value: string) => createHash('sha256').update(value).digest()

/**
 * Checks the bearer token sent by the leads app. Both sides are hashed first so
 * the comparison takes the same time whatever the token's length.
 */
export function isAuthorizedSync(header: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < MIN_SECRET_LENGTH || !header?.startsWith('Bearer ')) return false
  return timingSafeEqual(digest(header.slice('Bearer '.length)), digest(secret))
}
