interface LogoProps {
  size?: number
  className?: string
}

export function Logo({ size = 40, className }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" className={className} aria-hidden="true">
      <rect width="512" height="512" rx="112" fill="#4CAF93" />
      <rect x="146" y="104" width="220" height="304" rx="28" fill="#FAFAF8" />
      <rect x="186" y="80" width="140" height="48" rx="16" fill="#3A8570" />
      <g fill="none" stroke="#3A8570" strokeWidth="14" strokeLinecap="round">
        <line x1="192" y1="220" x2="286" y2="220" />
        <line x1="192" y1="268" x2="286" y2="268" />
        <line x1="192" y1="316" x2="256" y2="316" />
      </g>
      <circle cx="200" cy="220" r="10" fill="#3A8570" />
      <circle cx="200" cy="268" r="10" fill="#3A8570" />
      <circle cx="200" cy="316" r="10" fill="#3A8570" />
      <g transform="translate(300,300)">
        <circle r="70" fill="#FF8A5B" />
        <path
          d="M -32 2 L -10 26 L 34 -26"
          fill="none"
          stroke="#FAFAF8"
          strokeWidth="16"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  )
}
