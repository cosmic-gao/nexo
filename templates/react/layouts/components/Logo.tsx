import { Link } from 'react-router-dom'

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white text-xs font-bold shadow-sm">
        N
      </div>
      <span className="font-semibold text-foreground">Nexo</span>
    </Link>
  )
}

