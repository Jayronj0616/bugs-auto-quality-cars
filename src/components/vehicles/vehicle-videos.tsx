'use client'

import * as React from 'react'
import Image from 'next/image'
import { ExternalLink, Play } from 'lucide-react'

import { labelFor } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { VehicleVideoRow } from '@/types/database'

/**
 * Video section.
 *
 * Renders a thumbnail facade and only creates the iframe after the visitor
 * clicks. Embedding several YouTube players directly would pull in roughly a
 * megabyte of third-party JavaScript per player on page load, for videos most
 * visitors never play.
 */
export function VehicleVideos({
  videos,
  vehicleTitle,
}: {
  videos: VehicleVideoRow[]
  vehicleTitle: string
}) {
  const [playingId, setPlayingId] = React.useState<string | null>(null)

  if (videos.length === 0) return null

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {videos.map((video) => (
        <VideoCard
          key={video.id}
          video={video}
          vehicleTitle={vehicleTitle}
          isPlaying={playingId === video.id}
          onPlay={() => setPlayingId(video.id)}
        />
      ))}
    </div>
  )
}

function VideoCard({
  video,
  vehicleTitle,
  isPlaying,
  onPlay,
}: {
  video: VehicleVideoRow
  vehicleTitle: string
  isPlaying: boolean
  onPlay: () => void
}) {
  const embedUrl = toEmbedUrl(video)
  const thumbnail = video.thumbnail_url ?? youtubeThumbnail(video)

  return (
    <figure className="overflow-hidden rounded-card border border-ink-200 bg-white shadow-card">
      <div className="relative aspect-video bg-ink-900">
        {isPlaying && embedUrl ? (
          <iframe
            src={embedUrl}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            className="absolute inset-0 size-full"
          />
        ) : embedUrl ? (
          <button
            type="button"
            onClick={onPlay}
            className="group absolute inset-0 size-full cursor-pointer"
            aria-label={`Play video: ${video.title}`}
          >
            {thumbnail ? (
              <Image
                src={thumbnail}
                alt=""
                fill
                loading="lazy"
                sizes="(min-width: 640px) 50vw, 100vw"
                className="object-cover opacity-85 transition-opacity group-hover:opacity-100"
              />
            ) : null}
            <span
              className={cn(
                'absolute top-1/2 left-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full',
                'bg-accent-600 text-white shadow-panel transition-transform duration-200 group-hover:scale-105',
              )}
            >
              <Play className="ml-0.5 size-7 fill-current" aria-hidden="true" />
            </span>
          </button>
        ) : (
          // Unknown provider: link out rather than guess at an embed URL.
          <a
            href={video.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 flex items-center justify-center gap-2 text-sm font-medium text-white"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            Watch video
          </a>
        )}
      </div>

      <figcaption className="px-4 py-3">
        <p className="text-sm font-semibold text-ink-900">{video.title}</p>
        <p className="mt-0.5 text-xs text-ink-500">
          {labelFor('videoType', video.video_type)} · {vehicleTitle}
        </p>
      </figcaption>
    </figure>
  )
}

/**
 * Builds a privacy-friendly embed URL.
 *
 * youtube-nocookie.com avoids setting tracking cookies until the visitor
 * actually plays something, which pairs with the click-to-load facade.
 */
function toEmbedUrl(video: VehicleVideoRow): string | null {
  if (video.provider === 'youtube') {
    const id = video.external_id ?? extractYouTubeId(video.video_url)
    return id ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0` : null
  }

  if (video.provider === 'vimeo') {
    const id = video.external_id ?? video.video_url.match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1]
    return id ? `https://player.vimeo.com/video/${id}?autoplay=1` : null
  }

  if (video.provider === 'file') return null

  return null
}

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

function youtubeThumbnail(video: VehicleVideoRow): string | null {
  if (video.provider !== 'youtube') return null
  const id = video.external_id ?? extractYouTubeId(video.video_url)
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null
}
