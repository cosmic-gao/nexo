import fs from 'fs'
import path from 'path'

const COMPONENTS_DIR = 'components'

// 这些应该是 peerDependencies（由消费者提供）
const peerDepsOnly = [
  'react',
  'react-dom',
  '@nexo/utils',
  // nexo 组件互相依赖时也用 peer
]

const dirs = fs.readdirSync(COMPONENTS_DIR).filter(d => {
  return fs.statSync(path.join(COMPONENTS_DIR, d)).isDirectory()
})

for (const dir of dirs) {
  const pkgPath = path.join(COMPONENTS_DIR, dir, 'package.json')
  if (!fs.existsSync(pkgPath)) continue
  
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  
  if (pkg.peerDependencies) {
    const newPeerDeps = {}
    const newDeps = {}
    
    for (const [dep, ver] of Object.entries(pkg.peerDependencies)) {
      if (peerDepsOnly.includes(dep) || dep.startsWith('@nexo/')) {
        newPeerDeps[dep] = ver
      } else {
        // radix, lucide, cva 等移到 dependencies
        newDeps[dep] = ver
      }
    }
    
    pkg.peerDependencies = newPeerDeps
    
    if (Object.keys(newDeps).length > 0) {
      pkg.dependencies = { ...pkg.dependencies, ...newDeps }
    }
    
    // 清理空对象
    if (Object.keys(pkg.peerDependencies).length === 0) {
      delete pkg.peerDependencies
    }
  }
  
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
  console.log(`✓ ${dir}`)
}

console.log('\nDone!')

