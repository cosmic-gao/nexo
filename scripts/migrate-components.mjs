import fs from 'fs'
import path from 'path'

const UI_DIR = 'templates/react/components/ui'
const COMPONENTS_DIR = 'components'

// 组件依赖映射
const componentDeps = {
  'accordion': { radix: ['@radix-ui/react-accordion'], lucide: true },
  'alert-dialog': { radix: ['@radix-ui/react-alert-dialog'] },
  'alert': { lucide: true },
  'aspect-ratio': { radix: ['@radix-ui/react-aspect-ratio'] },
  'avatar': { radix: ['@radix-ui/react-avatar'] },
  'badge': { cva: true },
  'breadcrumb': { radix: ['@radix-ui/react-slot'], lucide: true },
  'button-group': { radix: ['@radix-ui/react-toggle-group'], cva: true },
  'button': { radix: ['@radix-ui/react-slot'], cva: true },
  'calendar': { extra: ['react-day-picker'] },
  'card': {},
  'carousel': { extra: ['embla-carousel-react'], lucide: true },
  'chart': { extra: ['recharts'] },
  'checkbox': { radix: ['@radix-ui/react-checkbox'], lucide: true },
  'collapsible': { radix: ['@radix-ui/react-collapsible'] },
  'command': { extra: ['cmdk'], lucide: true },
  'context-menu': { radix: ['@radix-ui/react-context-menu'] },
  'dialog': { radix: ['@radix-ui/react-dialog'], lucide: true },
  'drawer': { extra: ['vaul'] },
  'dropdown-menu': { radix: ['@radix-ui/react-dropdown-menu'], lucide: true },
  'empty': {},
  'field': {},
  'form': { extra: ['react-hook-form', '@hookform/resolvers', 'zod'], radix: ['@radix-ui/react-slot', '@radix-ui/react-label'] },
  'hover-card': { radix: ['@radix-ui/react-hover-card'] },
  'input-group': {},
  'input-otp': { extra: ['input-otp'] },
  'input': {},
  'item': {},
  'kbd': {},
  'label': { radix: ['@radix-ui/react-label'] },
  'menubar': { radix: ['@radix-ui/react-menubar'], lucide: true },
  'navigation-menu': { radix: ['@radix-ui/react-navigation-menu'], lucide: true, cva: true },
  'pagination': { lucide: true },
  'popover': { radix: ['@radix-ui/react-popover'] },
  'progress': { radix: ['@radix-ui/react-progress'] },
  'radio-group': { radix: ['@radix-ui/react-radio-group'], lucide: true },
  'resizable': { extra: ['react-resizable-panels'] },
  'scroll-area': { radix: ['@radix-ui/react-scroll-area'] },
  'select': { radix: ['@radix-ui/react-select'], lucide: true },
  'separator': { radix: ['@radix-ui/react-separator'] },
  'sheet': { radix: ['@radix-ui/react-dialog'], lucide: true, cva: true },
  'sidebar': { radix: ['@radix-ui/react-slot'], lucide: true, nexo: ['@nexo/button', '@nexo/input', '@nexo/separator', '@nexo/sheet', '@nexo/skeleton', '@nexo/tooltip'] },
  'skeleton': {},
  'slider': { radix: ['@radix-ui/react-slider'] },
  'sonner': { extra: ['sonner', 'next-themes'] },
  'spinner': {},
  'switch': { radix: ['@radix-ui/react-switch'] },
  'table': {},
  'tabs': { radix: ['@radix-ui/react-tabs'] },
  'textarea': {},
  'toggle-group': { radix: ['@radix-ui/react-toggle-group'], cva: true },
  'toggle': { radix: ['@radix-ui/react-toggle'], cva: true },
  'tooltip': { radix: ['@radix-ui/react-tooltip'] },
}

function generatePackageJson(name, deps) {
  const peerDeps = {
    '@nexo/utils': 'workspace:*',
    'react': '^19.0.0',
  }

  if (deps.radix) {
    deps.radix.forEach(pkg => {
      peerDeps[pkg] = '^1.0.0'
    })
  }

  if (deps.cva) {
    peerDeps['class-variance-authority'] = '^0.7.1'
  }

  if (deps.lucide) {
    peerDeps['lucide-react'] = '^0.556.0'
  }

  if (deps.extra) {
    deps.extra.forEach(pkg => {
      peerDeps[pkg] = '*'
    })
  }

  if (deps.nexo) {
    deps.nexo.forEach(pkg => {
      peerDeps[pkg] = 'workspace:*'
    })
  }

  return {
    name: `@nexo/${name}`,
    version: '0.0.0',
    type: 'module',
    main: 'index.tsx',
    types: 'index.tsx',
    exports: {
      '.': './index.tsx',
    },
    peerDependencies: peerDeps,
  }
}

function transformSource(source) {
  // 替换 @/lib/utils 为 @nexo/utils
  return source.replace(/from ["']@\/lib\/utils["']/g, 'from "@nexo/utils"')
}

// 获取所有组件文件
const files = fs.readdirSync(UI_DIR).filter(f => f.endsWith('.tsx'))

for (const file of files) {
  const name = path.basename(file, '.tsx')
  const deps = componentDeps[name] || {}
  
  const componentDir = path.join(COMPONENTS_DIR, name)
  
  // 创建目录
  if (!fs.existsSync(componentDir)) {
    fs.mkdirSync(componentDir, { recursive: true })
  }
  
  // 生成 package.json
  const pkgJson = generatePackageJson(name, deps)
  fs.writeFileSync(
    path.join(componentDir, 'package.json'),
    JSON.stringify(pkgJson, null, 2) + '\n'
  )
  
  // 复制并转换源码
  const source = fs.readFileSync(path.join(UI_DIR, file), 'utf-8')
  const transformed = transformSource(source)
  fs.writeFileSync(path.join(componentDir, 'index.tsx'), transformed)
  
  console.log(`✓ ${name}`)
}

console.log(`\nMigrated ${files.length} components`)

