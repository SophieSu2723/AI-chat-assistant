// Lucide icons (stroke 1.5), inlined to avoid a dependency.
type IconProps = { size?: number; color?: string }
const base = (size: number, color = 'currentColor') => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true })

export const ChevronLeft = ({ size = 22, color }: IconProps) => <svg {...base(size, color)}><path d="m15 18-6-6 6-6" /></svg>
export const Close = ({ size = 22, color }: IconProps) => <svg {...base(size, color)}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
export const Sparkle = ({ size = 16, color }: IconProps) => <svg {...base(size, color)}><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" /></svg>
export const AlertTriangle = ({ size = 18, color }: IconProps) => <svg {...base(size, color)}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
export const Lock = ({ size = 18, color }: IconProps) => <svg {...base(size, color)}><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
