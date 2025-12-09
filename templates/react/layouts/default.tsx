import { Outlet } from 'react-router-dom'
import { Header } from './components/Header'
import { Nav } from './components/Nav'
import { Breadcrumb } from './components/Breadcrumb'
import type { MenuNode } from './components/MenuItem'
import {
  Home as HomeIcon,
  Info,
  Users,
  Layers,
  Shield,
  Clock,
  Tag,
  AlertTriangle,
} from 'lucide-react'

const menuItems: MenuNode[] = [
  { label: 'Home', path: '/', icon: HomeIcon },
  { label: 'About', path: '/about', icon: Info },
  {
    label: 'User Details',
    icon: Users,
    children: [
      { path: '/user/profile', label: 'Profile' },
      { path: '/user/add', label: 'Add User' },
      { path: '/user/list', label: 'User List' },
    ],
  },
  {
    label: 'UI Elements',
    icon: Layers,
    children: [
      { path: '/ui/buttons', label: 'Buttons' },
      {
        label: 'Forms',
        children: [
          { path: '/ui/forms/basic', label: 'Basic' },
          { path: '/ui/forms/advanced', label: 'Advanced' },
        ],
      },
      { path: '/ui/cards', label: 'Cards' },
    ],
  },
  {
    label: 'Authentication',
    icon: Shield,
    children: [
      { path: '/auth/login', label: 'Login' },
      { path: '/auth/register', label: 'Register' },
      { path: '/auth/forgot', label: 'Forgot Password' },
    ],
  },
  { label: 'Timeline', path: '/timeline', icon: Clock },
  { label: 'Pricing', path: '/pricing', icon: Tag },
  {
    label: 'Error Pages',
    icon: AlertTriangle,
    children: [
      { path: '/error/404', label: '404' },
      {
        label: 'Server',
        children: [
          { path: '/error/500', label: '500' },
          { path: '/error/503', label: '503' },
        ],
      },
    ],
  },
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

