import { useLocation } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { MenuNode } from './MenuItem'

interface BreadcrumbProps {
  menuItems: MenuNode[]
}

// 在菜单树中查找路径对应的所有父级和当前 label
function findBreadcrumbPath(menuItems: MenuNode[], targetPath: string, parentLabels: string[] = []): string[] | null {
  for (const item of menuItems) {
    // 检查当前项是否匹配
    if (item.path === targetPath) {
      return [...parentLabels, item.label]
    }
    // 递归检查子项
    if (item.children) {
      const found = findBreadcrumbPath(item.children, targetPath, [...parentLabels, item.label])
      if (found) {
        return found
      }
    }
  }
  return null
}

// 根据路径构建面包屑路径数组
function buildBreadcrumbPath(menuItems: MenuNode[], currentPath: string): string[] {
  // 首页特殊处理
  if (currentPath === '/') {
    return ['Dashboard']
  }

  // 查找面包屑路径
  const breadcrumbLabels = findBreadcrumbPath(menuItems, currentPath)
  
  if (breadcrumbLabels && breadcrumbLabels.length > 0) {
    return breadcrumbLabels
  }

  // 如果找不到，使用路径名
  const pathSegments = currentPath.split('/').filter(Boolean)
  return pathSegments.map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
}

export function Breadcrumb({ menuItems }: BreadcrumbProps) {
  const location = useLocation()
  const breadcrumbLabels = buildBreadcrumbPath(menuItems, location.pathname)

  return (
    <div className="flex items-center gap-1 text-sm text-muted-foreground">
      {breadcrumbLabels.map((label, index) => {
        const isLast = index === breadcrumbLabels.length - 1
        return (
          <span key={`${label}-${index}`} className="flex items-center gap-1">
            {index > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            <span className={isLast ? 'text-foreground font-medium' : 'text-muted-foreground'}>{label}</span>
          </span>
        )
      })}
    </div>
  )
}

