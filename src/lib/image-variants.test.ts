import { describe, expect, it } from 'vitest'

import { pickVariantWidth, variantPaths, withVariants } from './image-variants'

/**
 * The loader can only ask for copies that exist in storage, and deleting a
 * photo has to take every copy with it, so these two lists must agree with
 * what the upload routes and the backfill script write.
 */
describe('image variants', () => {
  it('writes a copy at every width, the thumbnail size included', () => {
    expect(variantPaths('vehicles/a/images/b.jpg')).toEqual([
      'vehicles/a/images/b.jpg.w192.webp',
      'vehicles/a/images/b.jpg.w384.webp',
      'vehicles/a/images/b.jpg.w768.webp',
      'vehicles/a/images/b.jpg.w1280.webp',
      'vehicles/a/images/b.jpg.w1920.webp',
    ])
  })

  it('deletes the original together with all of its copies', () => {
    expect(withVariants(['a.jpg'])).toEqual([
      'a.jpg',
      'a.jpg.w192.webp',
      'a.jpg.w384.webp',
      'a.jpg.w768.webp',
      'a.jpg.w1280.webp',
      'a.jpg.w1920.webp',
    ])
  })

  it('does not serve the thumbnail copy until existing photos have one', () => {
    expect(pickVariantWidth(96)).toBe(384)
    expect(pickVariantWidth(192)).toBe(384)
  })

  it('serves the smallest copy at least as wide as requested', () => {
    expect(pickVariantWidth(430)).toBe(768)
    expect(pickVariantWidth(1024)).toBe(1280)
    expect(pickVariantWidth(1536)).toBe(1920)
  })

  it('falls back to the largest copy for wider requests', () => {
    expect(pickVariantWidth(3840)).toBe(1920)
  })
})
