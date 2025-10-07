import React, { useState, useCallback } from 'react';
import LoginPage from './components/LoginPage';
import MainLayout from './components/MainLayout';
import { User } from './types';
import { userService } from './data/mockDB';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const handleLogin = useCallback(async (username: string, password: string): Promise<boolean> => {
    const user = await userService.authenticate(username, password);
    if (user) {
      setCurrentUser(user);
      return true;
    }
    return false;
  }, []);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
  }, []);

  const handleUpdateUser = useCallback(async (updatedUser: User) => {
    const user = await userService.updateUser(updatedUser);
    setCurrentUser(user);
  }, []);

  return (
    <div className="min-h-screen">
      {currentUser ? (
        <MainLayout 
          user={currentUser} 
          onLogout={handleLogout} 
          onUpdateUser={handleUpdateUser}
        />
      ) : (
        <LoginPage onLogin={handleLogin} />
      )}
    </div>
  );
};

export default App;
