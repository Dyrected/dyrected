import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** When set, renders a compact inline error scoped to the named field instead of the full-page fallback. */
  fieldName?: string;
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
    console.error(
      `[ErrorBoundary] Field "${this.props.fieldName ?? "unknown"}" threw:`,
      error,
      errorInfo,
    );
  }

  public render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    // Compact inline error for field-level boundaries
    if (this.props.fieldName !== undefined) {
      return (
        <div
          role="alert"
          className="dy-rounded-md dy-border dy-border-destructive/40 dy-bg-destructive/5 dy-px-3 dy-py-2 dy-text-sm dy-text-destructive"
        >
          <span className="dy-font-medium">
            Failed to render field &ldquo;{this.props.fieldName}&rdquo;:
          </span>{" "}
          {this.state.error?.message ?? "Unknown error"}
        </div>
      );
    }

    // Full-page fallback for top-level boundaries
    return (
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
}

