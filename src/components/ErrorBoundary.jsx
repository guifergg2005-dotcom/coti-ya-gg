import React from 'react';
export class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null, errorInfo: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { this.setState({ errorInfo }); console.error("Error Atrapado:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: '#fee2e2', color: '#991b1b', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>Fallo Crítico en la Interfaz!</h2>
          <p style={{ marginTop: '10px', fontSize: '14px' }}>No se pudo mostrar esta pantalla. Tus cambios guardados se conservan.</p>
          <button style={{ padding: '12px', marginTop: '12px', background: 'white', borderRadius: '6px' }} onClick={() => {
            if (this.props.onReset) { this.setState({ hasError: false, error: null, errorInfo: null }); this.props.onReset(); }
            else window.location.reload();
          }}>{this.props.onReset ? 'Volver a Ventas' : 'Reiniciar la interfaz'}</button>
          <pre style={{ background: 'white', padding: '15px', marginTop: '15px', borderRadius: '5px', overflowX: 'auto', border: '1px solid #f87171' }}>
            {this.state.error && this.state.error.toString()}
            <br/><br/>
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
