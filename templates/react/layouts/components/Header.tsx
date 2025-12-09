import { Logo } from './Logo'
import { SearchBox } from './SearchBox'
import { ThemeToggle } from './ThemeToggle'
import { UserAvatar } from './UserAvatar'

export function Header() {
  return (
    <div>
      {/* Top bar - Logo, Search, User */}
      <div className="border-b border-border/40">
        <div className="container mx-auto flex h-12 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Logo />
            <SearchBox />
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <UserAvatar />
          </div>
        </div>
      </div>
    </div>
  )
}

