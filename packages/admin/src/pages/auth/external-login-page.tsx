import { Button } from "../../components/ui/button";

export function ExternalLoginPage({
  providers,
  onStart,
  error,
}: {
  providers: Array<{ id: string; displayName: string }>;
  onStart: (providerId: string) => void;
  error?: string | null;
}) {
  return (
    <div className="dy-flex dy-min-h-screen dy-items-center dy-justify-center dy-bg-background dy-px-4">
      <div className="dy-w-full dy-max-w-sm dy-space-y-6">
        <div className="dy-space-y-2 dy-text-center">
          <h1 className="dy-text-2xl dy-font-semibold dy-tracking-tight">Sign in</h1>
          <p className="dy-text-sm dy-text-muted-foreground">Use your organization login to access the dashboard</p>
        </div>

        <div className="dy-space-y-3">
          {providers.map((provider) => (
            <Button
              key={provider.id}
              type="button"
              className="dy-w-full"
              onClick={() => onStart(provider.id)}
            >
              Continue with {provider.displayName}
            </Button>
          ))}
        </div>

        {error ? (
          <div className="dy-rounded-md dy-bg-destructive/10 dy-p-3 dy-text-xs dy-font-medium dy-text-destructive">
            {error}
          </div>
        ) : null}
      </div>
    </div>
  );
}
