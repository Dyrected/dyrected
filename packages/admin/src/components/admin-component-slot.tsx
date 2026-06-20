import { Component, createElement, type ComponentType, type ErrorInfo, type ReactNode } from "react";

const warnedMissingComponents = new Set<string>();

function warnMissingComponent(slot: string, componentKey: string) {
  if (!import.meta.env.DEV) return;

  const warningKey = `${slot}:${componentKey}`;
  if (warnedMissingComponents.has(warningKey)) return;

  warnedMissingComponents.add(warningKey);
  console.warn(`[Dyrected Admin] Component "${componentKey}" configured for "${slot}" is not registered.`);
}

class AdminComponentErrorBoundary extends Component<{
  children: ReactNode;
  componentKey: string;
  slot: string;
}, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      `[Dyrected Admin] Component "${this.props.componentKey}" failed in "${this.props.slot}".`,
      error,
      errorInfo,
    );
  }

  render() {
    return this.state.hasError ? null : this.props.children;
  }
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
      return null;
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
