import React, { useState } from "react";
import { useDyrected } from "../../providers/dyrected-provider";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

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
      onComplete(data);
    } catch (err: any) {
      setError(err.message || "Failed to create initial user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/5 flex items-center justify-center mb-4">
            <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-pulse" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Setup Admin Account</h1>
          <p className="text-sm text-muted-foreground">Create the first administrative user to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Admin Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-transparent"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-transparent"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="bg-transparent"
            />
          </div>

          {error && (
            <div className="text-xs text-destructive font-medium bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Create Admin Account"}
          </Button>
        </form>

        <div className="pt-4 border-t text-center space-y-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
            Dyrected CMS · Initial Setup
          </p>
        </div>
      </div>
    </div>
  );
}
