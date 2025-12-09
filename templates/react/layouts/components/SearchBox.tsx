import { Search } from 'lucide-react'

export function SearchBox() {
  return (
    <div className="flex items-center gap-1 rounded-md border border-border/60 px-3 py-1.5 bg-card shadow-sm">
      <Search className="h-4 w-4 text-muted-foreground" />
      <input
        type="text"
        placeholder="Search..."
        className="w-40 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
      />
    </div>
  )
}

