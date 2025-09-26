import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building, Users, Mail, Phone } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';

export default function Login() {
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const { toast } = useToast();
  
  const [ownerLoginData, setOwnerLoginData] = useState({
    email: '',
    password: ''
  });
  
  const [staffLoginData, setStaffLoginData] = useState({
    emailOrPhone: '',
    password: ''
  });

  const handleOwnerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simulate login validation
    if (ownerLoginData.email && ownerLoginData.password) {
      dispatch({ 
        type: 'SET_CURRENT_USER', 
        payload: { id: 'owner-1', role: 'OWNER' }
      });
      
      toast({
        title: 'Welcome back!',
        description: 'Successfully logged in as business owner.',
      });
      
      navigate('/');
    } else {
      toast({
        title: 'Login failed',
        description: 'Please enter valid credentials.',
        variant: 'destructive',
      });
    }
  };

  const handleStaffLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Find staff member by email or phone
    const staff = state.staff.find(s => 
      s.email === staffLoginData.emailOrPhone || 
      s.phone === staffLoginData.emailOrPhone
    );
    
    if (staff && staffLoginData.password) {
      dispatch({ 
        type: 'SET_CURRENT_USER', 
        payload: { id: `user-${staff.id}`, role: 'STAFF', staffId: staff.id }
      });
      
      toast({
        title: `Welcome back, ${staff.name}!`,
        description: 'Successfully logged in.',
      });
      
      navigate('/staff-portal');
    } else {
      toast({
        title: 'Login failed',
        description: 'Invalid email/phone or password.',
        variant: 'destructive',
      });
    }
  };

  const handleDemoLogin = (role: 'OWNER' | 'STAFF') => {
    if (role === 'OWNER') {
      dispatch({ 
        type: 'SET_CURRENT_USER', 
        payload: { id: 'owner-1', role: 'OWNER' }
      });
      navigate('/');
    } else {
      // Login as first staff member for demo
      const firstStaff = state.staff[0];
      if (firstStaff) {
        dispatch({ 
          type: 'SET_CURRENT_USER', 
          payload: { id: `user-${firstStaff.id}`, role: 'STAFF', staffId: firstStaff.id }
        });
        navigate('/staff-portal');
      }
    }
    
    toast({
      title: 'Demo login successful!',
      description: `Logged in as ${role.toLowerCase()}.`,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <h1 className="text-3xl font-bold text-foreground">ShiftAI</h1>
          </div>
          <p className="text-muted-foreground">
            AI-powered workforce planning for small shops
          </p>
        </div>

        <Card className="shadow-elevated">
          <CardHeader className="text-center pb-4">
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="owner" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="owner" className="flex items-center space-x-2">
                  <Building className="h-4 w-4" />
                  <span>Owner</span>
                </TabsTrigger>
                <TabsTrigger value="staff" className="flex items-center space-x-2">
                  <Users className="h-4 w-4" />
                  <span>Staff</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="owner" className="mt-6">
                <form onSubmit={handleOwnerLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="owner-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="owner-email"
                        type="email"
                        placeholder="owner@business.com"
                        className="pl-10"
                        value={ownerLoginData.email}
                        onChange={(e) => setOwnerLoginData({
                          ...ownerLoginData,
                          email: e.target.value
                        })}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="owner-password">Password</Label>
                    <Input
                      id="owner-password"
                      type="password"
                      placeholder="Enter your password"
                      value={ownerLoginData.password}
                      onChange={(e) => setOwnerLoginData({
                        ...ownerLoginData,
                        password: e.target.value
                      })}
                    />
                  </div>
                  
                  <Button type="submit" className="w-full" variant="gradient">
                    Sign In as Owner
                  </Button>
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleDemoLogin('OWNER')}
                  >
                    Demo Login (Owner)
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="staff" className="mt-6">
                <form onSubmit={handleStaffLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="staff-contact">Email or Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="staff-contact"
                        placeholder="Email or phone number"
                        className="pl-10"
                        value={staffLoginData.emailOrPhone}
                        onChange={(e) => setStaffLoginData({
                          ...staffLoginData,
                          emailOrPhone: e.target.value
                        })}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="staff-password">Password</Label>
                    <Input
                      id="staff-password"
                      type="password"
                      placeholder="Enter your password"
                      value={staffLoginData.password}
                      onChange={(e) => setStaffLoginData({
                        ...staffLoginData,
                        password: e.target.value
                      })}
                    />
                  </div>
                  
                  <Button type="submit" className="w-full" variant="accent">
                    Sign In as Staff
                  </Button>
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleDemoLogin('STAFF')}
                  >
                    Demo Login (Staff)
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                First time? <span className="text-primary font-medium cursor-pointer">Contact your manager for account setup</span>
              </p>
            </div>
          </CardContent>
        </Card>
        
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Powered by AI • Secure • Mobile-friendly
          </p>
        </div>
      </div>
    </div>
  );
}