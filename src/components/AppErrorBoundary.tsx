import { Component, type ErrorInfo, type ReactNode } from "react";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  error?: Error;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {};

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Architecture Studio runtime error", error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="errorBoundary">
          <div>
            <strong>Architecture Studio hit a runtime issue.</strong>
            <p>{this.state.error.message}</p>
            <button onClick={() => window.location.reload()}>Reload</button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
