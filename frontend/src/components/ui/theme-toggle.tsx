import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/hooks/use-theme'
import { cn } from '@/lib/utils'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent',
        'transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isDark ? 'bg-slate-700' : 'bg-slate-200'
      )}
    >
      {/* Thumb */}
      <span
        className={cn(
          'pointer-events-none flex h-5 w-5 items-center justify-center rounded-full shadow-sm ring-0',
          'transition-transform duration-200',
          isDark ? 'translate-x-5 bg-slate-900' : 'translate-x-0 bg-white'
        )}
      >
        {isDark
          ? <Moon className="h-3 w-3 text-slate-300" />
          : <Sun className="h-3 w-3 text-amber-500" />
        }
      </span>
    </button>
  )
}
