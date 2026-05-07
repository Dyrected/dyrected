import React, { useState } from "react";
import { useDyrected } from "../../providers/dyrected-provider";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";
import { Label } from "../../components/ui/label";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, setAuth } = useDyrected();
  const [url, setUrl] = useState("http://localhost:3000/api/dyrected");
  const [key, setKey] = useState("");

  if (isAuthenticated) {
    return <>{children}</>;
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (url && key) {
      setAuth(url, key);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Connect to Dyrected</CardTitle>
          <CardDescription>
            Enter your instance URL and API key to manage your content.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Instance URL</Label>
              <Input 
                id="url" 
                placeholder="https://cms.yourdomain.com/api/dyrected" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="key">API Key</Label>
              <Input 
                id="key" 
                type="password" 
                placeholder="Enter your site API key" 
                value={key}
                onChange={(e) => setKey(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full">Login</Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
