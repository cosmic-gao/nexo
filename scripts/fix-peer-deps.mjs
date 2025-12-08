import fs from 'fs'
import path from 'path'

const COMPONENTS_DIR = 'components'

// 正确的 radix 版本映射
const radixVersions = {
  '@radix-ui/react-accordion': '^1.2.12',
  '@radix-ui/react-alert-dialog': '^1.1.15',
  '@radix-ui/react-aspect-ratio': '^1.1.8',
  '@radix-ui/react-avatar': '^1.1.11',
  '@radix-ui/react-checkbox': '^1.3.3',
  '@radix-ui/react-collapsible': '^1.1.12',
  '@radix-ui/react-context-menu': '^2.2.16',
  '@radix-ui/react-dialog': '^1.1.15',
  '@radix-ui/react-dropdown-menu': '^2.1.16',
  '@radix-ui/react-hover-card': '^1.1.15',
  '@radix-ui/react-label': '^2.1.8',
  '@radix-ui/react-menubar': '^1.1.16',
  '@radix-ui/react-navigation-menu': '^1.2.14',
  '@radix-ui/react-popover': '^1.1.15',
  '@radix-ui/react-progress': '^1.1.8',
  '@radix-ui/react-radio-group': '^1.3.8',
  '@radix-ui/react-scroll-area': '^1.2.10',
  '@radix-ui/react-select': '^2.2.6',
  '@radix-ui/react-separator': '^1.1.8',
  '@radix-ui/react-slider': '^1.3.6',
  '@radix-ui/react-slot': '^1.2.4',
  '@radix-ui/react-switch': '^1.2.6',
  '@radix-ui/react-tabs': '^1.1.13',
  '@radix-ui/react-toggle': '^1.1.10',
  '@radix-ui/react-toggle-group': '^1.1.11',
  '@radix-ui/react-tooltip': '^1.2.8',
}

const extraVersions = {
  'react-day-picker': '^9.12.0',
  'embla-carousel-react': '^8.6.0',
  'recharts': '^2.15.4',
  'cmdk': '^1.1.1',
  'vaul': '^1.1.2',
  'react-hook-form': '^7.68.0',
  '@hookform/resolvers': '^5.2.2',
  'zod': '^4.1.13',
  'input-otp': '^1.4.2',
  'react-resizable-panels': '^3.0.6',
  'sonner': '^2.0.7',
  'next-themes': '^0.4.6',
}

const dirs = fs.readdirSync(COMPONENTS_DIR).filter(d => {
  return fs.statSync(path.join(COMPONENTS_DIR, d)).isDirectory()
})

for (const dir of dirs) {
  const pkgPath = path.join(COMPONENTS_DIR, dir, 'package.json')
  if (!fs.existsSync(pkgPath)) continue
  
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  
  if (pkg.peerDependencies) {
    for (const [dep, ver] of Object.entries(pkg.peerDependencies)) {
      if (radixVersions[dep]) {
        pkg.peerDependencies[dep] = radixVersions[dep]
      } else if (extraVersions[dep]) {
        pkg.peerDependencies[dep] = extraVersions[dep]
      } else if (ver === '*') {
        // 保持 workspace:* 不变
      }
    }
  }
  
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
  console.log(`✓ ${dir}`)
}

console.log('\nDone!')

