
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
        // Sign Up Flow
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          toast.error("Sign up failed: " + signUpError.message);
          setLoading(false);
          return;
        }

        // Insert into coaches table
        const userId = signUpData.user?.id;
        if (userId) {
          const { error: insertError } = await supabase.from("coaches").insert({
            id: userId,
            name,
            email,
            phone,
            role: 'coach', // Default role
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
        // Login Flow
        const { data, error } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        });

        if (error) {
          toast.error("Login failed: " + error.message);
        } else if (data.user) {
          toast.success("Logged in successfully!");
          // Navigate to dashboard instead of index
          navigate("/dashboard");
        }
      }
    } catch (error: any) {
      toast.error("An unexpected error occurred: " + error.message);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm sm:max-w-md shadow-lg border-2 border-border bg-card">
        <CardHeader className="text-center">
          <CardTitle className="responsive-subheading text-primary">
            {isSignUp ? "Coach Sign Up" : "Coach Login"}
          </CardTitle>
        </CardHeader>
        <CardContent className="responsive-padding">
          <form onSubmit={handleSubmit} className="responsive-spacing">
            {isSignUp && (
              <>
                <div>
                  <Label className="block responsive-small font-medium text-foreground mb-1">Name</Label>
                  <Input
                    type="text"
                    value={name}
                    required
                    onChange={(e) => setName(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label className="block responsive-small font-medium text-foreground mb-1">Phone</Label>
                  <Input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full"
                  />
                </div>
              </>
            )}

            <div>
              <Label className="block responsive-small font-medium text-foreground mb-1">Email</Label>
              <Input
                type="email"
                value={email}
                required
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <Label className="block responsive-small font-medium text-foreground mb-1">Password</Label>
              <Input
                type="password"
                value={password}
                required
                onChange={(e) => setPassword(e.target.value)}
                className="w-full"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground responsive-button"
              disabled={loading}
            >
              {loading
                ? isSignUp
                  ? "Signing up..."
                  : "Logging in..."
                : isSignUp
                ? "Sign Up"
                : "Login"}
            </Button>

            <div className="text-center mt-3">
              <button
                type="button"
                className="text-secondary hover:underline responsive-small"
                onClick={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp
                  ? "Already have an account? Log in"
                  : "Don't have an account? Sign up"}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
