import { Component } from 'react'

// Keeps a template rendering crash from white-screening the whole app.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Render error:', error, info)
  }

  componentDidUpdate(prevProps) {
    // Retry rendering when the inputs change (e.g. user switches template/doc)
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null })
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="render-error">
          <p>{this.props.message}</p>
          <button className="btn btn-small" onClick={() => this.setState({ error: null })}>
            {this.props.retryLabel}
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
