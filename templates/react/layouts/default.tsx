import { Outlet } from 'react-router-dom'
import { Header } from './components/Header'
import { Nav } from './components/Nav'
import { Breadcrumb } from './components/Breadcrumb'
import type { MenuNode } from './components/MenuItem'
import {
  Home as HomeIcon
} from 'lucide-react'

const menuItems: MenuNode[] = [
  { label: 'Home', path: '/', icon: HomeIcon },
]

export function Default() {

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full bg-background border-b border-border/40 shadow-sm">
        <Header />
        <Nav menuItems={menuItems} />
      </header>

      {/* Breadcrumb bar */}
      <div className="w-full flex items-center py-3 bg-background">
        <div className="container mx-auto flex items-center justify-end px-6">
          <Breadcrumb menuItems={menuItems} />
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 bg-background px-6 pb-6">
        <Outlet />
      </main>
    </div>
  )
}

