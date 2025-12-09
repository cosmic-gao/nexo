import { Link, useLocation } from 'react-router-dom'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export type MenuNode = {
  label: string
  path?: string
  children?: MenuNode[]
  icon?: React.ComponentType<{ className?: string }>
}

interface MenuItemProps {
  item: MenuNode
  level?: number
}

export function MenuItem({ item, level = 0 }: MenuItemProps) {
  const location = useLocation()
  const isLeaf = Boolean(item.path)
  const hasChildren = Array.isArray(item.children) && item.children.length > 0
  const Icon = item.icon

  if (isLeaf && !hasChildren) {
    if (level === 0) {
      return (
        <Link
          key={item.path}
          to={item.path!}
          className={cn(
            'group relative rounded-md px-4 py-2 transition-colors duration-200',
            'hover:bg-muted/40',
            location.pathname === item.path
              ? 'text-foreground font-medium bg-muted/40'
              : 'text-foreground/70 hover:text-foreground'
          )}
        >
          <span className="relative z-10 flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4" />}
            {item.label}
          </span>
          {location.pathname === item.path && (
            <span className="absolute bottom-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary" />
          )}
        </Link>
      )
    }

    return (
      <DropdownMenuItem
        key={item.path}
        asChild
        className="group rounded-md transition-colors duration-200 focus:bg-muted/50 hover:bg-muted/60 cursor-pointer"
      >
        <Link to={item.path!}>{item.label}</Link>
      </DropdownMenuItem>
    )
  }

  if (hasChildren) {
    if (level === 0) {
      return (
        <DropdownMenu key={item.label}>
          <DropdownMenuTrigger className="group flex items-center gap-1 rounded-md px-4 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-muted/40 hover:text-foreground data-[state=open]:bg-muted/30 data-[state=open]:text-foreground">
            <span className="flex items-center gap-2">
              {Icon && <Icon className="h-4 w-4" />}
              {item.label}
            </span>
            <ChevronDown className="h-4 w-4 transition-transform duration-200 data-[state=open]:rotate-180" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            sideOffset={8}
            className="w-52 rounded-lg border border-border/50 bg-popover shadow-lg"
          >
            {item.children!.map((child) => (
              <MenuItem key={child.path || child.label} item={child} level={level + 1} />
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }

    return (
      <DropdownMenuSub key={item.label}>
        <DropdownMenuSubTrigger className="group flex items-center justify-between rounded-md transition-colors duration-200 focus:bg-muted/50 hover:bg-muted/60 data-[state=open]:bg-muted/50 cursor-pointer">
          <span>{item.label}</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent
          sideOffset={10}
          alignOffset={-6}
          className="min-w-40 rounded-lg border border-border/50 bg-popover shadow-lg"
        >
          {item.children!.map((child) => (
            <MenuItem key={child.path || child.label} item={child} level={level + 1} />
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    )
  }

  return null
}

