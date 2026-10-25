const PATHS = {
  search: 'M11 4a7 7 0 1 0 4.4 12.4l4.1 4.1 1.4-1.4-4.1-4.1A7 7 0 0 0 11 4Zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z',
  settings:
    'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm0 2a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM10.3 2h3.4l.5 2.6c.6.2 1.1.5 1.6.9l2.5-.9 1.7 2.9-2 1.8a6.6 6.6 0 0 1 0 1.8l2 1.8-1.7 2.9-2.5-.9c-.5.4-1 .7-1.6.9l-.5 2.6h-3.4l-.5-2.6c-.6-.2-1.1-.5-1.6-.9l-2.5.9-1.7-2.9 2-1.8a6.6 6.6 0 0 1 0-1.8l-2-1.8 1.7-2.9 2.5.9c.5-.4 1-.7 1.6-.9L10.3 2Z',
  bookmark: 'M6 3h12v18l-6-4-6 4V3Zm2 2v12.3l4-2.7 4 2.7V5H8Z',
  bookmarkFilled: 'M6 3h12v18l-6-4-6 4V3Z',
  chevronRight: 'M8.6 5.4 10 4l8 8-8 8-1.4-1.4 6.6-6.6-6.6-6.6Z',
  chevronLeft: 'M15.4 5.4 14 4l-8 8 8 8 1.4-1.4L8.8 12l6.6-6.6Z',
  close: 'm6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4 6.4 5Z',
  copy: 'M8 3h11v13h-2V5H8V3ZM5 7h10v14H5V7Zm2 2v10h6V9H7Z',
  share: 'M12 3 7 8l1.4 1.4L11 6.8V15h2V6.8l2.6 2.6L17 8l-5-5ZM5 13v8h14v-8h-2v6H7v-6H5Z',
  home: 'M12 3 3 10v11h7v-6h4v6h7V10l-9-7Zm0 2.5 7 5.5v8h-3v-6H8v6H5v-8l7-5.5Z',
} as const

export type IconName = keyof typeof PATHS

export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d={PATHS[name]} />
    </svg>
  )
}
