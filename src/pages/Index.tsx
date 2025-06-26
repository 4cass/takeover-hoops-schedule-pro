
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, MapPin, UserCheck, BarChart3, Clock } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  const features = [
    {
      title: "Session Scheduling",
      description: "Schedule training sessions with coaches and manage availability",
      icon: Calendar,
      color: "text-blue-600"
    },
    {
      title: "Student Management",
      description: "Track student information and session quotas",
      icon: Users,
      color: "text-green-600"
    },
    {
      title: "Attendance Tracking",
      description: "Mark attendance and automatically update session counts",
      icon: UserCheck,
      color: "text-purple-600"
    },
    {
      title: "Branch Management",
      description: "Manage multiple training locations and facilities",
      icon: MapPin,
      color: "text-orange-600"
    },
    {
      title: "Coach Scheduling",
      description: "Manage coach availability and session assignments",
      icon: Clock,
      color: "text-indigo-600"
    },
    {
      title: "Reports & Analytics",
      description: "View detailed reports and performance analytics",
      icon: BarChart3,
      color: "text-red-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
            Takeover Basketball
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Complete training management system for scheduling, attendance tracking, and administrative tasks
          </p>
          <Link to="/dashboard">
            <Button size="lg" className="px-8 py-3 text-lg">
              Access Dashboard
            </Button>
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <IconComponent className={`h-6 w-6 ${feature.color}`} />
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* CTA Section */}
        <div className="text-center bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to streamline your basketball training management?
          </h2>
          <p className="text-gray-600 mb-6">
            Get started with our comprehensive management system and take control of your training sessions.
          </p>
          <Link to="/dashboard">
            <Button size="lg" variant="outline" className="mr-4">
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Index;
