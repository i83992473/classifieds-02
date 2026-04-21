import { describe, it, expect } from 'vitest'
import { env } from './env'

describe('env', () => {
  it('exposes an assetsOrigin string (default empty)', () => {
    expect(typeof env.assetsOrigin).toBe('string')
  })

  it('defaults devMainAppOrigin to the dev stub URL when unset', () => {
    expect(env.devMainAppOrigin).toBe('http://localhost:8787')
  })
})
