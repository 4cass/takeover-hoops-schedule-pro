
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, Lock } from "lucide-react";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Check if this is a password reset (has access_token in URL)
  const accessToken = searchParams.get('access_token');
  const isResettingPassword = !!accessToken;

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/forgot-password`,
      });

      if (error) {
        toast.error("Error: " + error.message);
      } else {
        toast.success("Password reset email sent! Check your inbox.");
        setEmail("");
      }
    } catch (error: any) {
      toast.error("An unexpected error occurred: " + error.message);
    }

    setLoading(false);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        toast.error("Error updating password: " + error.message);
      } else {
        toast.success("Password updated successfully!");
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast.error("An unexpected error occurred: " + error.message);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background responsive-padding">
      <Card className="w-full max-w-sm sm:max-w-md shadow-lg border-2 border-border bg-card">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg">
              {isResettingPassword ? (
                <Lock className="h-8 w-8 text-white" />
              ) : (
                <Mail className="h-8 w-8 text-white" />
              )}
            </div>
          </div>
          <CardTitle className="responsive-subheading text-primary">
            {isResettingPassword ? "Reset Your Password" : "Forgot Password"}
          </CardTitle>
          <p className="responsive-small text-muted-foreground mt-2">
            {isResettingPassword 
              ? "Enter your new password below" 
              : "Enter your email address and we'll send you a reset link"
            }
          </p>
        </CardHeader>
        <CardContent className="responsive-padding">
          {isResettingPassword ? (
            <form onSubmit={handlePasswordReset} className="responsive-spacing">
              <div>
                <Label className="block responsive-small font-medium text-foreground mb-1">
                  New Password
                </Label>
                <Input
                  type="password"
                  value={newPassword}
                  required
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full"
                  placeholder="Enter new password"
                />
              </div>
              <div>
                <Label className="block responsive-small font-medium text-foreground mb-1">
                  Confirm New Password
                </Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  required
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full"
                  placeholder="Confirm new password"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-accent hover:bg-secondary text-accent-foreground responsive-button"
                disabled={loading}
              >
                {loading ? "Updating Password..." : "Update Password"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleForgotPassword} className="responsive-spacing">
              <div>
                <Label className="block responsive-small font-medium text-foreground mb-1">
                  Email Address
                </Label>
                <Input
                  type="email"
                  value={email}
                  required
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full"
                  placeholder="Enter your email address"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-accent hover:bg-secondary text-accent-foreground responsive-button"
                disabled={loading}
              >
                {loading ? "Sending Reset Link..." : "Send Reset Link"}
              </Button>
            </form>
          )}

          <div className="flex items-center justify-center mt-6 pt-4 border-t border-border">
            <Button
              variant="ghost"
              onClick={() => navigate("/login")}
              className="flex items-center gap-2 text-secondary hover:text-accent hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
