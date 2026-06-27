import React, { useState } from "react";
import { useDyrected } from "../../providers/dyrected-context";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { toast } from "sonner";

export function FirstUserPage({ 
  collectionSlug, 
  onComplete 
}: { 
  collectionSlug: string; 
  onComplete: (data: any) => void 
}) {
  const { client } = useDyrected();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const data = await client!.collection(collectionSlug).registerFirstUser({
        email,
        password,
      });
      toast.success("Admin account created successfully");
      onComplete(data);
    } catch (err: any) {
      const message = err.message || "Failed to create initial user";
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
          <div className="dy-mx-auto dy-h-12 dy-w-12 dy-rounded-full dy-bg-primary/5 dy-flex dy-items-center dy-justify-center dy-mb-4">
            <div className="dy-h-6 dy-w-6 dy-rounded-full dy-border-2 dy-border-primary dy-border-t-transparent dy-animate-pulse" />
          </div>
          <h1 className="dy-text-2xl dy-font-semibold dy-tracking-tight">Setup Admin Account</h1>
          <p className="dy-text-sm dy-text-muted-foreground">Create the first administrative user to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="dy-space-y-4">
          <div className="dy-space-y-2">
            <Label htmlFor="email">Admin Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="dy-bg-transparent"
            />
          </div>
          <div className="dy-space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="dy-bg-transparent"
            />
          </div>
          <div className="dy-space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {loading ? "Creating account..." : "Create Admin Account"}
          </Button>
        </form>

        <div className="dy-pt-4 dy-border-t dy-text-center dy-space-y-2">
          <p className="dy-text-[10px] dy-text-muted-foreground dy-uppercase dy-tracking-widest">
            Dyrected CMS · Initial Setup
          </p>
        </div>
      </div>
    </div>
  );
}
