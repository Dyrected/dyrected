import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AdminComponentSlot } from '../admin-component-slot.js';

// Silence console.warn and console.error during tests
const originalWarn = console.warn;
const originalError = console.error;

describe('AdminComponentSlot', () => {
  beforeEach(() => {
    console.warn = vi.fn();
    console.error = vi.fn();
  });

  afterEach(() => {
    console.warn = originalWarn;
    console.error = originalError;
  });

  it('renders nothing when componentKeys is undefined or empty', () => {
    const { container } = render(
      <AdminComponentSlot
        slot="beforeDashboard"
        componentKeys={undefined}
        componentProps={{}}
      />
    );
    expect(container.innerHTML).toBe('');

    const { container: container2 } = render(
      <AdminComponentSlot
        slot="beforeDashboard"
        componentKeys={[]}
        componentProps={{}}
      />
    );
    expect(container2.innerHTML).toBe('');
  });

  it('renders components in configuration order', () => {
    const ComponentA = () => <div data-testid="comp-a">A</div>;
    const ComponentB = () => <div data-testid="comp-b">B</div>;

    const registry = {
      'comp-a': ComponentA,
      'comp-b': ComponentB,
    };

    render(
      <AdminComponentSlot
        slot="beforeDashboard"
        componentKeys={['comp-b', 'comp-a']}
        registry={registry}
        componentProps={{}}
      />
    );

    const elements = screen.getAllByTestId(/comp-/);
    expect(elements).toHaveLength(2);
    expect(elements[0].textContent).toBe('B');
    expect(elements[1].textContent).toBe('A');
  });

  it('passes componentProps to the rendered components', () => {
    const ComponentWithProps = (props: any) => <div data-testid="props-comp">{props.title}</div>;

    const registry = {
      'with-props': ComponentWithProps,
    };

    render(
      <AdminComponentSlot
        slot="beforeDashboard"
        componentKeys={['with-props']}
        registry={registry}
        componentProps={{ title: 'Hello World' }}
      />
    );

    expect(screen.getByTestId('props-comp').textContent).toBe('Hello World');
  });

  it('renders missing component placeholder and emits deduplicated warning', () => {
    const ValidComponent = () => <div data-testid="valid">Valid</div>;

    const registry = {
      'valid-comp': ValidComponent,
    };

    render(
      <AdminComponentSlot
        slot="beforeDashboard"
        componentKeys={['missing-comp', 'valid-comp', 'missing-comp']}
        registry={registry}
        componentProps={{}}
      />
    );

    // The valid component still renders
    expect(screen.getByTestId('valid')).toBeDefined();

    // Dev warnings are emitted, but deduplicated by key
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('[Dyrected Admin] Component "missing-comp" configured for "beforeDashboard" is not registered.')
    );

    // Missing component placeholder rendered
    const placeholders = screen.getAllByRole('status');
    expect(placeholders.length).toBeGreaterThan(0);
    expect(placeholders[0].textContent).toContain('missing-comp');
  });

  it('catches render errors in error boundary, rendering an error card with retry', () => {
    let shouldThrow = true;
    const ThrowingComponent = () => {
      if (shouldThrow) {
        throw new Error('Crash!');
      }
      return <div data-testid="recovered">Recovered</div>;
    };
    const SafeComponent = () => <div data-testid="safe">Safe</div>;

    const registry = {
      'throwing-comp': ThrowingComponent,
      'safe-comp': SafeComponent,
    };

    render(
      <AdminComponentSlot
        slot="beforeDashboard"
        componentKeys={['throwing-comp', 'safe-comp']}
        registry={registry}
        componentProps={{}}
      />
    );

    // The safe component still renders
    expect(screen.getByTestId('safe')).toBeDefined();

    // Error boundary caught the crash and rendered error card
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByRole('alert').textContent).toContain('Crash!');
    expect(screen.getByRole('button', { name: /retry/i })).toBeDefined();

    // Now fix the error and click retry
    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    // Should recover and render the component content
    expect(screen.getByTestId('recovered').textContent).toBe('Recovered');
  });
});
