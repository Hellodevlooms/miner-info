import React, { useState } from 'react';
import { Login } from '@/components/Login';
import { DataExtractor } from '@/components/DataExtractor';

const Index = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const handleLogin = (email: string) => {
    setUserEmail(email);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserEmail('');
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <DataExtractor
      userEmail={userEmail}
      onLogout={handleLogout}
    />
  );
};

export default Index;
