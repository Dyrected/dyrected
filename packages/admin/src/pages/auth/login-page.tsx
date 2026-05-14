import React, { useState } from "react";
import { useDyrected } from "../../providers/dyrected-provider";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { toast } from "sonner";

export function LoginPage({ 
  collectionSlug, 
  onLogin 
}: { 
  collectionSlug: string; 
  onLogin: (data: any) => void 
}) {
  const { client } = useDyrected();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await client!.collection(collectionSlug).login(email, password);
      toast.success("Welcome back!");
      onLogin(data);
    } catch (err: any) {
      const message = err.message || "Invalid email or password";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dy-flex dy-min-h-screen dy-items-center dy-justify-center dy-bg-background dy-px-4">
      <div className="dy-w-full dy-max-w-sm dy-space-y-8">
        <div className="dy-space-y-2 dy-text-center">
          <h1 className="dy-text-2xl dy-font-semibold dy-tracking-tight">Welcome back</h1>
          <p className="dy-text-sm dy-text-muted-foreground">Enter your credentials to access the dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="dy-space-y-4">
          <div className="dy-space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="dy-bg-transparent"
            />
          </div>
          <div className="dy-space-y-2">
            <div className="dy-flex dy-items-center dy-justify-between">
              <Label htmlFor="password">Password</Label>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="dy-bg-transparent"
            />
          </div>

          {error && (
            <div className="dy-text-xs dy-text-destructive dy-font-medium dy-bg-destructive/10 dy-p-3 dy-rounded-md">
              {error}
            </div>
          )}

          <Button type="submit" className="dy-w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <p className="dy-text-center dy-text-xs dy-text-muted-foreground dy-uppercase dy-tracking-widest">
          Dyrected CMS
        </p>
      </div>
    </div>
  );
}
