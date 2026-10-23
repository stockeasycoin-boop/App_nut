import { Component, type ReactNode } from 'react'

/** Keeps one broken screen from blanking the whole app; offers a reload instead. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error('NutriLens crashed:', error)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="crash" role="alert">
        <div className="crash-emoji">🥴</div>
        <h2 className="h2">Something went wrong</h2>
        <p className="muted">Your log is safe. Reload to carry on.</p>
        <button className="btn btn-dark" onClick={() => location.reload()}>
          Reload
        </button>
      </div>
    )
  }
}
