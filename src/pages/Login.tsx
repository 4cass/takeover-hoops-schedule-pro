
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          toast.error("Sign up failed: " + signUpError.message);
          setLoading(false);
          return;
        }

        const userId = signUpData.user?.id;
        if (userId) {
          const { error: insertError } = await supabase.from("coaches").insert({
            id: userId,
            name,
            email,
            phone,
            role: 'coach',
            auth_id: userId,
          });

          if (insertError) {
            toast.error("Account created but failed to save profile: " + insertError.message);
          } else {
            toast.success("Account created successfully! Please log in.");
            setIsSignUp(false);
            setName("");
            setPhone("");
          }
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
          toast.error("Login failed: " + error.message);
        } else if (data.user) {
          toast.success("Logged in successfully!");
          navigate("/dashboard");
        }
      }
    } catch (error: any) {
      toast.error("An unexpected error occurred: " + error.message);
    }

    setLoading(false);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background">
      {/* 🔹 Blurred Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center blur-sm brightness-75"
        style={{ backgroundColor: "#000" }}
        aria-hidden="true"
      />

      {/* 🔹 Overlay to darken a bit (optional) */}
      <div className="absolute inset-0 bg-black/40 z-0" />

      {/* 🔹 Login Card */}
      <div className="relative z-10 w-full max-w-sm sm:max-w-md p-4">
        <Card className="shadow-xl border-2 border-border bg-card/80 backdrop-blur-md">
          <CardHeader className="text-center">
            {/* Logo */}
            <div className="flex justify-center mb-4">
              <img
                src="/lovable-uploads/599e456c-7d01-4d0c-a68c-b753300de7de.png"
                alt="Coach Logo"
                className="w-24 h-24 object-contain"
              />
            </div>
            <CardTitle className="text-primary text-2xl font-bold">
              {isSignUp ? "Create Account" : "Welcome Back"}
            </CardTitle>
            <p className="text-muted-foreground mt-2">
              {isSignUp ? "Join our coaching platform" : "Sign in to your account"}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <>
                  <div>
                    <Label>Name</Label>
                    <Input
                      type="text"
                      value={name}
                      required
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </>
              )}
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  required
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  value={password}
                  required
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-accent hover:bg-secondary text-accent-foreground mt-6"
                disabled={loading}
              >
                {loading
                  ? isSignUp
                    ? "Creating Account..."
                    : "Signing In..."
                  : isSignUp
                  ? "Create Account"
                  : "Sign In"}
              </Button>

              {!isSignUp && (
                <div className="text-center text-sm mt-4">
                  <button
                    type="button"
                    className="text-secondary hover:underline"
                    onClick={() => navigate("/forgot-password")}
                  >
                    Forgot your password?
                  </button>
                </div>
              )}

              <div className="text-center text-sm mt-4 pt-4 border-t border-border">
                <button
                  type="button"
                  className="text-secondary hover:underline"
                  onClick={() => setIsSignUp(!isSignUp)}
                >
                  {isSignUp
                    ? "Already have an account? Sign in"
                    : "Don't have an account? Sign up"}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
