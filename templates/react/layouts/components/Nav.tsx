import { MenuItem, type MenuNode } from './MenuItem'

interface NavProps {
  menuItems: MenuNode[]
}

export function Nav({ menuItems }: NavProps) {
  return (
    <div className="container mx-auto flex h-12 items-center px-6">
      <nav className="flex items-center space-x-1 text-sm text-muted-foreground">
        {menuItems.map((item) => (
          <MenuItem key={item.path || item.label} item={item} />
        ))}
      </nav>
    </div>
  )
}

