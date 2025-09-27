import React from 'react';
import { Layout } from '@/components/layout/Layout';
import { BusinessSettings as BusinessSettingsComponent } from '@/components/BusinessSettings';
import { Settings } from 'lucide-react';

export default function BusinessSettings() {
  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-accent rounded-xl flex items-center justify-center">
            <Settings className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Business Settings</h1>
            <p className="text-muted-foreground">Configure your business operations and scheduling preferences</p>
          </div>
        </div>

        <BusinessSettingsComponent />
      </div>
    </Layout>
  );
}
