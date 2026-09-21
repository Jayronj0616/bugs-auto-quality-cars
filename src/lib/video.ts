/**
 * Video URL handling, shared by the public player and the admin form.
 *
 * Framework-agnostic on purpose: the admin Server Action needs `detectProvider`
 * when saving, and the client component needs `toEmbedUrl` when playing. Keeping
 * them here means a server module never has to import a `'use client'` file.
 */

import type { VideoProvider } from '@/types/database'

export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?[^#]*\bv=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match?.[1]) return match[1]
  }
  return null
}

export function extractVimeoId(url: string): string | null {
  return url.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1] ?? null
}

/** Works out where a pasted URL came from, so the admin never picks a provider. */
export function detectProvider(url: string): {
  provider: VideoProvider
  externalId: string | null
} {
  const youtubeId = extractYouTubeId(url)
  if (youtubeId) return { provider: 'youtube', externalId: youtubeId }

  const vimeoId = extractVimeoId(url)
  if (vimeoId) return { provider: 'vimeo', externalId: vimeoId }

  if (/facebook\.com|fb\.watch/i.test(url)) return { provider: 'facebook', externalId: null }
  if (/\.(mp4|webm)(\?|$)/i.test(url)) return { provider: 'file', externalId: null }

  return { provider: 'other', externalId: null }
}

/**
 * Embed URL for a saved video.
 *
 * `youtube-nocookie.com` avoids setting tracking cookies, which pairs with the
 * click-to-load facade: nothing third-party runs until the visitor presses play.
 * Returns null for providers we cannot embed, so the UI links out instead of
 * rendering a broken frame.
 */
export function toEmbedUrl(video: {
  provider: VideoProvider
  video_url: string
  external_id: string | null
}): string | null {
  if (video.provider === 'youtube') {
    const id = video.external_id ?? extractYouTubeId(video.video_url)
    return id ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0` : null
  }

  if (video.provider === 'vimeo') {
    const id = video.external_id ?? extractVimeoId(video.video_url)
    return id ? `https://player.vimeo.com/video/${id}?autoplay=1` : null
  }

  return null
}

export function youtubeThumbnail(video: {
  provider: VideoProvider
  video_url: string
  external_id: string | null
}): string | null {
  if (video.provider !== 'youtube') return null
  const id = video.external_id ?? extractYouTubeId(video.video_url)
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null
}
