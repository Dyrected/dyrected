import { Component, createElement, type ComponentType, type ErrorInfo, type ReactNode } from "react";

const warnedMissingComponents = new Set<string>();

export function warnMissingComponent(slot: string, componentKey: string) {
  const warningKey = `${slot}:${componentKey}`;
  if (warnedMissingComponents.has(warningKey)) return;

  warnedMissingComponents.add(warningKey);

  if (import.meta.env.DEV) {
    console.warn(`[Dyrected Admin] Component "${componentKey}" configured for "${slot}" is not registered.`);
  }
}

export interface AdminComponentErrorBoundaryProps {
  children: ReactNode;
  componentKey: string;
  slot: string;
  onRetry?: () => void;
}

export interface AdminComponentErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

export class AdminComponentErrorBoundary extends Component<
  AdminComponentErrorBoundaryProps,
  AdminComponentErrorBoundaryState
> {
  state: AdminComponentErrorBoundaryState = {
    hasError: false,
    error: null,
    retryCount: 0,
  };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      `[Dyrected Admin] Component "${this.props.componentKey}" failed in "${this.props.slot}".`,
      error,
      errorInfo
    );
  }

  handleRetry = () => {
    this.props.onRetry?.();
    this.setState((prev) => ({
      hasError: false,
      error: null,
      retryCount: prev.retryCount + 1,
    }));
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        role="alert"
        className="dy-my-2 dy-rounded-lg dy-border dy-border-destructive/40 dy-bg-destructive/5 dy-p-3 dy-text-sm dy-text-destructive"
      >
        <div className="dy-flex dy-items-start dy-justify-between dy-gap-3">
          <div className="dy-space-y-1">
            <p className="dy-font-medium">
              Component &ldquo;{this.props.componentKey}&rdquo; crashed in {this.props.slot}
            </p>
            <p className="dy-text-xs dy-opacity-90">
              {this.state.error?.message || "An unexpected error occurred while rendering this component."}
            </p>
          </div>
          <button
            type="button"
            onClick={this.handleRetry}
            className="dy-shrink-0 dy-rounded-md dy-border dy-border-destructive/30 dy-bg-background dy-px-2.5 dy-py-1 dy-text-xs dy-font-semibold dy-text-foreground hover:dy-bg-destructive/10 dy-transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
}

export function AdminMissingComponentPlaceholder({
  slot,
  componentKey,
}: {
  slot: string;
  componentKey: string;
}) {
  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <div
      role="status"
      className="dy-my-2 dy-rounded-lg dy-border dy-border-dashed dy-border-amber-500/40 dy-bg-amber-500/5 dy-p-3 dy-text-xs dy-text-amber-800 dark:dy-text-amber-300"
    >
      <span className="dy-font-semibold">Unresolved Component:</span> Component{" "}
      <code className="dy-font-mono dy-font-bold">{componentKey}</code> configured for{" "}
      <code className="dy-font-mono">{slot}</code> is not registered.
    </div>
  );
}

export function AdminComponentSlot<Props extends object>({
  componentKeys,
  registry,
  slot,
  componentProps,
}: {
  componentKeys?: string[];
  registry?: Record<string, ComponentType<Props>>;
  slot: string;
  componentProps: Props;
}) {
  if (!componentKeys?.length) return null;

  return componentKeys.map((componentKey) => {
    const CustomComponent = registry?.[componentKey];
    if (!CustomComponent) {
      warnMissingComponent(slot, componentKey);
      return (
        <AdminMissingComponentPlaceholder
          key={`missing:${slot}:${componentKey}`}
          slot={slot}
          componentKey={componentKey}
        />
      );
    }

    return (
      <AdminComponentErrorBoundary
        key={`${slot}:${componentKey}`}
        componentKey={componentKey}
        slot={slot}
      >
        {createElement(CustomComponent, componentProps)}
      </AdminComponentErrorBoundary>
    );
  });
}
