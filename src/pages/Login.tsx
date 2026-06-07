import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Lock, Mail, AlertCircle, User, ArrowLeft } from "lucide-react";
import smEliteLogo from "@/assets/sm-elite-hajj-logo.jpeg";
import { PASSWORD_POLICY_HINT, validatePassword } from "@/lib/passwordPolicy";

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
   const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [authErrorCode, setAuthErrorCode] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  const { login, signup, resendConfirmationEmail, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/";

  const isEmailNotConfirmed = authErrorCode === "email_not_confirmed";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setAuthErrorCode(null);
    setIsLoading(true);

    if (isForgotPassword) {
      const result = await resetPassword(email);
      if (result.success) {
        setSuccess("Password reset email sent! Check your inbox for the reset link.");
      } else {
        setError(result.error || "Failed to send reset email");
      }
    } else if (isSignUp) {
      const passwordError = validatePassword(password);
      if (passwordError) {
        setError(passwordError);
        setIsLoading(false);
        return;
      }
      const result = await signup(email, password, fullName);
      if (result.success) {
        setSuccess("Account created! Please check your email to verify your account before signing in.");
        setIsSignUp(false);
        setPassword("");
      } else {
        setError(result.error || "Sign up failed");
      }
    } else {
      const result = await login(email, password);
      if (result.success) {
        navigate(from, { replace: true });
      } else {
        setError(result.error || "Login failed");
        setAuthErrorCode(result.code ?? null);
      }
    }

    setIsLoading(false);
  };

  const handleResendVerification = async () => {
    if (!email) return;

    setError("");
    setSuccess("");
    setIsResending(true);
    const result = await resendConfirmationEmail(email);
    if (result.success) {
      setSuccess("Verification email sent. Please check your inbox (and spam/junk).");
    } else {
      setError(result.error || "Could not resend verification email");
    }
    setIsResending(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8">
          <img 
            src={smEliteLogo} 
            alt="SM Elite Hajj Logo" 
            className="h-20 w-20 rounded-2xl shadow-lg mb-4 object-cover"
          />
          <h1 className="text-2xl font-bold text-foreground">S M Invoice Software</h1>
          <p className="text-sm text-muted-foreground mt-1">Invoice Management System</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-xl border-border/50">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center">
              {isSignUp ? "Create Account" : "Sign In"}
            </CardTitle>
            <CardDescription className="text-center">
              {isSignUp 
                ? "Enter your details to create a new account" 
                : "Enter your credentials to access the admin panel"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="py-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {error && isEmailNotConfirmed && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    This account must be verified before you can sign in.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleResendVerification}
                    disabled={isLoading || isResending || !email}
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending verification email...
                      </>
                    ) : (
                      "Resend verification email"
                    )}
                  </Button>
                </div>
              )}

              {success && (
                <Alert className="py-3 border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              {isSignUp && !isForgotPassword && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Enter your full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-10"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {!isForgotPassword && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {!isSignUp && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(true);
                          setError("");
                          setSuccess("");
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                      disabled={isLoading}
                      minLength={8}
                    />
                  </div>
                  {isSignUp && (
                    <p className="text-xs text-muted-foreground">{PASSWORD_POLICY_HINT}</p>
                  )}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isForgotPassword ? "Sending reset email..." : isSignUp ? "Creating account..." : "Signing in..."}
                  </>
                ) : (
                  isForgotPassword ? "Send Reset Email" : isSignUp ? "Create Account" : "Sign In"
                )}
              </Button>

              {isForgotPassword && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setError("");
                    setSuccess("");
                  }}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Sign In
                </Button>
              )}
 
              {!isForgotPassword && (
                <div className="text-center text-sm">
                {isSignUp ? (
                  <span className="text-muted-foreground">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUp(false);
                        setError("");
                        setSuccess("");
                        setAuthErrorCode(null);
                      }}
                      className="text-primary hover:underline font-medium"
                    >
                      Sign in
                    </button>
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setIsSignUp(true);
                        setError("");
                        setSuccess("");
                        setAuthErrorCode(null);
                      }}
                      className="text-primary hover:underline font-medium"
                    >
                      Create one
                    </button>
                  </span>
                )}
              </div>
              )}
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Protected admin panel. Unauthorized access is prohibited.
        </p>
      </div>
    </div>
  );
}
