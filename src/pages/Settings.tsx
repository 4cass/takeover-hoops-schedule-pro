import { ChangePassword } from "@/components/ChangePassword";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, User, Shield, LogOut, Mail, Hash, Settings as SettingsIcon, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-black"></div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl"></div>
      
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        {/* Header Section */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2 text-slate-400 hover:text-white hover:bg-slate-800/50 border border-slate-800 transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Button>
          </div>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg">
              <SettingsIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Account Settings</h1>
              <p className="text-slate-400 text-lg">Manage your account, security, and preferences</p>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Primary Content */}
          <div className="lg:col-span-8 space-y-8">
            {/* Account Overview */}
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm shadow-2xl">
              <CardHeader className="pb-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3 text-2xl font-bold text-white">
                    <div className="p-2 bg-green-600/20 rounded-lg">
                      <User className="h-6 w-6 text-green-400" />
                    </div>
                    Account Information
                  </CardTitle>
                  <div className="px-3 py-1 bg-green-600/20 border border-green-600/30 rounded-full">
                    <span className="text-green-400 text-sm font-medium">Active</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6">
                  <div className="group">
                    <div className="flex items-center justify-between p-6 bg-slate-800/30 border border-slate-700 rounded-xl hover:bg-slate-800/50 transition-all duration-200">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-600/20 rounded-lg">
                          <Mail className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-slate-300 font-medium mb-1">Email Address</p>
                          <p className="text-white text-lg font-semibold">{user?.email}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-slate-400 transition-colors" />
                    </div>
                  </div>
                  
                  <div className="group">
                    <div className="flex items-center justify-between p-6 bg-slate-800/30 border border-slate-700 rounded-xl hover:bg-slate-800/50 transition-all duration-200">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-600/20 rounded-lg">
                          <Hash className="h-5 w-5 text-purple-400" />
                        </div>
                        <div>
                          <p className="text-slate-300 font-medium mb-1">User ID</p>
                          <p className="text-white text-lg font-mono">{user?.id}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-slate-400 transition-colors" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Section */}
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm shadow-2xl">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-3 text-2xl font-bold text-white">
                  <div className="p-2 bg-orange-600/20 rounded-lg">
                    <Shield className="h-6 w-6 text-orange-400" />
                  </div>
                  Security & Privacy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-6 bg-slate-800/30 border border-slate-700 rounded-xl">
                  <ChangePassword />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Quick Actions */}
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm shadow-2xl">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-xl font-bold text-white">
                  <div className="p-2 bg-red-600/20 rounded-lg">
                    <LogOut className="h-5 w-5 text-red-400" />
                  </div>
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  variant="destructive" 
                  onClick={logout}
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 border-0 font-semibold py-4 text-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  Sign Out
                </Button>
                
                <div className="pt-4 border-t border-slate-700">
                  <p className="text-slate-400 text-sm text-center">
                    Need help? <span className="text-blue-400 cursor-pointer hover:underline">Contact Support</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Account Status */}
            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 shadow-2xl">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full shadow-lg">
                    <User className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Account Status</h3>
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-green-400 font-medium">All Systems Operational</span>
                    </div>
                    <p className="text-slate-400 text-sm">Your account is secure and fully verified</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Overview */}
            <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm shadow-2xl">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-white mb-4">Account Overview</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Last Login</span>
                    <span className="text-white font-medium">Today</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Account Created</span>
                    <span className="text-white font-medium">2024</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Security Level</span>
                    <span className="text-green-400 font-medium">High</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}