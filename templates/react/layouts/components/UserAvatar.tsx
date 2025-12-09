import { User } from 'lucide-react'

export function UserAvatar() {
  return (
    <div className="flex items-center gap-2">
      <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
        <User className="h-4 w-4" />
      </div>
      <span className="hidden sm:inline text-sm text-foreground">User</span>
    </div>
  )
}

