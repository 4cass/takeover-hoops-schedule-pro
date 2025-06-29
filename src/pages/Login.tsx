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

  setLoading(false);
  return;
}

    // Login Flow
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error("Login failed: " + error.message);
    } else {
      toast.success("Logged in successfully!");
      navigate("/index");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#faf0e8] to-[#fffefe] p-4">
      <Card className="w-full max-w-md shadow-lg border-2 border-orange-200 bg-white">
        <CardHeader>
          <CardTitle className="text-2xl text-center text-[#fc7416]">
            {isSignUp ? "Coach Sign Up" : "Coach Login"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">Name</Label>
                  <Input
                    type="text"
                    value={name}
                    required
                    onChange={(e) => setName(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">Phone</Label>
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
              <Label className="block text-sm font-medium text-gray-700 mb-1">Email</Label>
              <Input
                type="email"
                value={email}
                required
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <Label className="block text-sm font-medium text-gray-700 mb-1">Password</Label>
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
              className="w-full bg-[#fc7416] hover:bg-[#fe822d]"
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
                className="text-[#fc7416] hover:underline text-sm"
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
