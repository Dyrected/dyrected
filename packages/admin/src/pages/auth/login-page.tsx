import React, { useState, useEffect } from "react";
import { useDyrected } from "../../providers/dyrected-context";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, KeyRound, Mail, CheckCircle2, UserPlus } from "lucide-react";

type ViewMode = "signIn" | "forgotPassword" | "resetPassword" | "acceptInvite";

export function LoginPage({ 
  collectionSlug, 
  onLogin 
}: { 
  collectionSlug: string; 
  onLogin: (data: unknown) => void 
}) {
  const { client } = useDyrected();
  const [viewMode, setViewMode] = useState<ViewMode>("signIn");
  
  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [inviteToken, setInviteToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Status states
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [tokenFromUrl, setTokenFromUrl] = useState(false);
  const [inviteTokenFromUrl, setInviteTokenFromUrl] = useState(false);

  // Check URL parameters for invite or reset tokens on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let urlInviteToken = params.get("inviteToken");
    let urlToken = params.get("token");

    // Fallback: Check hash params if HashRouter is used
    if ((!urlInviteToken || !urlToken) && window.location.hash.includes("?")) {
      const hashQuery = window.location.hash.split("?")[1];
      const hashParams = new URLSearchParams(hashQuery);
      urlInviteToken ||= hashParams.get("inviteToken");
      urlToken ||= hashParams.get("token");
    }

    if (urlInviteToken) {
      const detectedInviteToken = urlInviteToken;
      setTimeout(() => {
        setInviteToken(detectedInviteToken);
        setInviteTokenFromUrl(true);
        setViewMode("acceptInvite");
        toast.info("Invitation detected. Create your password to finish setting up your account.");
      }, 0);
    } else if (urlToken) {
      const detectedToken = urlToken;
      setTimeout(() => {
        setToken(detectedToken);
        setTokenFromUrl(true);
        setViewMode("resetPassword");
        toast.info("Reset token detected. Please choose a new password.");
      }, 0);
    }

    if (!urlInviteToken && !urlToken) return;

    // Clean the token query parameter from the URL bar to prevent leakage/reload reuse
    const cleanUrl = window.location.origin + window.location.pathname + window.location.hash.split("?")[0];
    window.history.replaceState({}, document.title, cleanUrl);
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await client!.collection(collectionSlug).login(email, password);
      toast.success("Welcome back!");
      onLogin(data);
    } catch (err: unknown) {
      const message = (err as Error).message || "Invalid email or password";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Pass the host page URL so the backend can build the clickable button
      const resetUrl = window.location.origin + window.location.pathname;
      const res = await client!.collection(collectionSlug).sendResetLink(email, resetUrl);
      toast.success(res.message || "Reset link sent!");
      setResetSent(true);
    } catch (err: unknown) {
      const message = (err as Error).message || "Failed to request reset token";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      const msg = "Passwords do not match.";
      setError(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);

    try {
      const res = await client!.collection(collectionSlug).resetPassword(token, newPassword);
      toast.success(res.message || "Password reset successfully!");
      // Reset form states and transition back to signIn
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setToken("");
      setError("");
      setTokenFromUrl(false);
      setViewMode("signIn");
      setResetSent(false);
    } catch (err: unknown) {
      const message = (err as Error).message || "Failed to reset password. Check your token.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      const msg = "Passwords do not match.";
      setError(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);

    try {
      const data = await client!.collection(collectionSlug).acceptInvite(inviteToken, newPassword);
      toast.success("Account created. You're now signed in.");
      setInviteToken("");
      setInviteTokenFromUrl(false);
      setNewPassword("");
      setConfirmPassword("");
      onLogin(data);
    } catch (err: unknown) {
      const message = (err as Error).message || "Failed to accept invitation. Check your link and try again.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dy-flex dy-min-h-screen dy-items-center dy-justify-center dy-bg-background dy-px-4">
      <div className="dy-w-full dy-max-w-sm dy-space-y-8">
        
        {/* Render Title/Header according to view mode */}
        {viewMode === "signIn" && (
          <div className="dy-space-y-2 dy-text-center">
            <h1 className="dy-text-2xl dy-font-semibold dy-tracking-tight">Welcome back</h1>
            <p className="dy-text-sm dy-text-muted-foreground">Enter your credentials to access the dashboard</p>
          </div>
        )}

        {viewMode === "forgotPassword" && (
          <div className="dy-space-y-2 dy-text-center">
            <h1 className="dy-text-2xl dy-font-semibold dy-tracking-tight">Reset Password</h1>
            <p className="dy-text-sm dy-text-muted-foreground">We'll send a password recovery link to your email</p>
          </div>
        )}

        {viewMode === "resetPassword" && (
          <div className="dy-space-y-2 dy-text-center">
            <h1 className="dy-text-2xl dy-font-semibold dy-tracking-tight">Create New Password</h1>
            <p className="dy-text-sm dy-text-muted-foreground">Enter your new credentials to reset your password</p>
          </div>
        )}

        {viewMode === "acceptInvite" && (
          <div className="dy-space-y-2 dy-text-center">
            <h1 className="dy-text-2xl dy-font-semibold dy-tracking-tight">Accept Invitation</h1>
            <p className="dy-text-sm dy-text-muted-foreground">Create your password to activate your Dyrected account</p>
          </div>
        )}

        {/* View Mode Forms */}
        {viewMode === "signIn" && (
          <form onSubmit={handleSignIn} className="dy-space-y-4">
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
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setViewMode("forgotPassword");
                  }}
                  className="dy-text-xs dy-text-primary hover:dy-underline dy-font-medium"
                >
                  Forgot password?
                </button>
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
        )}

        {viewMode === "forgotPassword" && (
          <div className="dy-space-y-4">
            {resetSent ? (
              <div className="dy-space-y-6 dy-text-center">
                <div className="dy-bg-emerald-500/10 dy-text-emerald-500 dy-p-4 dy-rounded-2xl dy-flex dy-flex-col dy-items-center dy-gap-3">
                  <CheckCircle2 className="dy-h-10 dy-w-10" />
                  <p className="dy-text-sm dy-font-medium">
                    If an account exists, a recovery link has been sent to your email.
                  </p>
                </div>
                
                <div className="dy-space-y-3">
                  <Button 
                    onClick={() => {
                      setError("");
                      setTokenFromUrl(false); // Enable manual entry
                      setViewMode("resetPassword");
                    }} 
                    className="dy-w-full"
                  >
                    <KeyRound className="dy-mr-2 dy-h-4 dy-w-4" />
                    Enter Recovery Token Manually
                  </Button>
                  
                  <Button 
                    variant="ghost" 
                    onClick={() => {
                      setError("");
                      setResetSent(false);
                      setViewMode("signIn");
                    }} 
                    className="dy-w-full"
                  >
                    Back to Sign In
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="dy-space-y-4">
                <div className="dy-space-y-2">
                  <Label htmlFor="reset-email">Email Address</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                  <Mail className="dy-mr-2 dy-h-4 dy-w-4" />
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setError("");
                    setViewMode("signIn");
                  }}
                  className="dy-w-full"
                >
                  <ArrowLeft className="dy-mr-2 dy-h-4 dy-w-4" />
                  Back to Sign In
                </Button>
              </form>
            )}
          </div>
        )}

        {viewMode === "resetPassword" && (
          <form onSubmit={handleResetPassword} className="dy-space-y-4">
            {!tokenFromUrl && (
              <div className="dy-space-y-2">
                <Label htmlFor="token">Recovery Token</Label>
                <Input
                  id="token"
                  type="text"
                  placeholder="Paste token from your email"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                  className="dy-bg-transparent"
                />
              </div>
            )}
            <div className="dy-space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
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
              {loading ? "Resetting..." : "Reset Password"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setError("");
                setTokenFromUrl(false);
                setViewMode("forgotPassword");
              }}
              className="dy-w-full"
            >
              <ArrowLeft className="dy-mr-2 dy-h-4 dy-w-4" />
              Request New Link
            </Button>
          </form>
        )}

        {viewMode === "acceptInvite" && (
          <form onSubmit={handleAcceptInvite} className="dy-space-y-4">
            {!inviteTokenFromUrl && (
              <div className="dy-space-y-2">
                <Label htmlFor="invite-token">Invitation Token</Label>
                <Input
                  id="invite-token"
                  type="text"
                  placeholder="Paste invitation token"
                  value={inviteToken}
                  onChange={(e) => setInviteToken(e.target.value)}
                  required
                  className="dy-bg-transparent"
                />
              </div>
            )}
            <div className="dy-space-y-2">
              <Label htmlFor="invite-password">Create Password</Label>
              <Input
                id="invite-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="dy-bg-transparent"
              />
            </div>
            <div className="dy-space-y-2">
              <Label htmlFor="invite-confirm-password">Confirm Password</Label>
              <Input
                id="invite-confirm-password"
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
              <UserPlus className="dy-mr-2 dy-h-4 dy-w-4" />
              {loading ? "Creating account..." : "Accept Invitation"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setError("");
                setInviteToken("");
                setInviteTokenFromUrl(false);
                setNewPassword("");
                setConfirmPassword("");
                setViewMode("signIn");
              }}
              className="dy-w-full"
            >
              <ArrowLeft className="dy-mr-2 dy-h-4 dy-w-4" />
              Back to Sign In
            </Button>
          </form>
        )}

        <p className="dy-text-center dy-text-xs dy-text-muted-foreground dy-uppercase dy-tracking-widest">
          Dyrected CMS
        </p>
      </div>
    </div>
  );
}
