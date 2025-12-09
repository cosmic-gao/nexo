import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <div className="container flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center px-4">
      <div className="text-center">
        <h1 className="mb-2 text-9xl font-extrabold tracking-tight text-primary">
          404
        </h1>
        <h2 className="mb-4 text-2xl font-semibold">Page Not Found</h2>
        <p className="mb-8 text-muted-foreground">
          Sorry, the page you are looking for does not exist or has been removed
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <span>🏠</span>
          Back to Home
        </Link>
      </div>
    </div>
  )
}

