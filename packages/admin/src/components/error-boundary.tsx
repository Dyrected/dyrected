import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in AdminUI:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="dy-flex-1 dy-flex dy-flex-col dy-items-center dy-justify-center dy-p-12 dy-bg-destructive/5 dy-text-destructive dy-min-h-[400px]">
          <h2 className="dy-text-xl dy-font-bold dy-mb-2">Something went wrong</h2>
          <p className="dy-text-sm dy-opacity-80 dy-mb-4">{this.state.error?.message}</p>
          <button 
            onClick={() => window.location.reload()}
            className="dy-px-4 dy-py-2 dy-bg-destructive dy-text-destructive-foreground dy-rounded-md dy-text-sm dy-font-medium hover:dy-bg-destructive/90 dy-transition-colors"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
