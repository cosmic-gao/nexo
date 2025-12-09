import { Code2, Package, FileCode, Layers } from 'lucide-react'

const techStack = [
  { 
    name: 'React 19', 
    description: 'JavaScript library for building user interfaces',
    icon: Code2,
  },
  { 
    name: 'TypeScript', 
    description: 'Type-safe superset of JavaScript',
    icon: FileCode,
  },
  { 
    name: 'Vite', 
    description: 'Next generation frontend build tool',
    icon: Package,
  },
  { 
    name: 'React Router', 
    description: 'Declarative routing solution',
    icon: Layers,
  },
  { 
    name: 'TailwindCSS', 
    description: 'Utility-first CSS framework',
    icon: Code2,
  },
]

export function About() {
  return (
    <div className="container px-4 py-16 md:py-24">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-16 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 px-4 py-1.5 text-sm text-primary backdrop-blur-sm">
            <Package className="h-4 w-4" />
            Project Info
          </div>
          <h1 className="mb-4 bg-gradient-to-r from-foreground via-primary to-primary/70 bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-5xl">
            About Project
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            A monorepo project template based on pnpm workspace
          </p>
        </div>

        {/* Tech Stack */}
        <section className="mb-20">
          <h2 className="mb-8 text-2xl font-semibold md:text-3xl">Tech Stack</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {techStack.map((tech, index) => {
              const Icon = tech.icon
              return (
                <div
                  key={tech.name}
                  className="group relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-card/50 p-6 shadow-sm backdrop-blur-sm transition-all duration-500 hover:scale-105 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/20"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Glassmorphism effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  
                  {/* Animated gradient border */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-50" />
                  
                  <div className="relative z-10 mb-4 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 text-primary shadow-lg shadow-primary/20 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-xl group-hover:shadow-primary/30">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold leading-tight">
                      {tech.name}
                    </h3>
                  </div>
                  <p className="relative z-10 text-sm text-muted-foreground">
                    {tech.description}
                  </p>
                </div>
              )
            })}
          </div>
        </section>

        {/* Project Structure */}
        <section>
          <h2 className="mb-8 text-2xl font-semibold md:text-3xl">Project Structure</h2>
          <div className="group overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-card via-card to-card/50 shadow-lg backdrop-blur-sm transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10">
            <div className="border-b border-border/50 bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 px-6 py-3 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500 shadow-sm" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500 shadow-sm" />
                  <div className="h-3 w-3 rounded-full bg-green-500 shadow-sm" />
                </div>
                <span className="ml-2 text-xs font-medium text-muted-foreground">
                  nexo/
                </span>
              </div>
            </div>
            <div className="p-6">
              <pre className="overflow-x-auto rounded-xl bg-gradient-to-br from-muted/50 via-muted/30 to-muted/50 p-4 text-sm leading-relaxed backdrop-blur-sm">
{`nexo/
├── templates/
│   └── react/          # React Template
│       ├── components/   # Components
│       ├── pages/        # Pages
│       ├── layouts/      # Layouts
│       ├── lib/          # Utilities
│       ├── hooks/        # Custom Hooks
│       └── ...
├── pnpm-workspace.yaml   # pnpm workspace config
└── package.json          # Root config file`}
              </pre>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

