import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  failed: boolean
}

// Si algo falla al dibujar, mostramos una salida clara en vez de una
// pantalla en blanco.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error inesperado en la interfaz:', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="empty" role="alert">
        <div className="empty-art">😵</div>
        <p className="empty-title">Algo salió mal</p>
        <p>Tus datos están a salvo. Recarga la app para continuar.</p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
          Recargar
        </button>
      </div>
    )
  }
}
