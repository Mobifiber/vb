import React, { useState, useCallback } from 'react';
import LoginPage from './components/LoginPage';
import MainLayout from './components/MainLayout';
import { User, IUserService } from './types';
import { userService } from './data/userService';
import { demoUserService } from './data/demoUserService';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeUserService, setActiveUserService] = useState<IUserService>(userService);

  const handleLogin = useCallback(async (username: string, password: string): Promise<boolean> => {
    let user: User | null = null;
    let service: IUserService;

    if (username.toLowerCase() === 'demo') {
        service = demoUserService;
        user = await service.authenticate(username, password);
    } else {
        service = userService;
        user = await service.authenticate(username, password);
    }
    
    if (user) {
      setCurrentUser(user);
      setActiveUserService(service);
      return true;
    }
    return false;
  }, []);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    setActiveUserService(userService); // Reset to default on logout
  }, []);

  const handleUpdateUser = useCallback(async (updatedUser: User) => {
    const user = await activeUserService.updateUser(updatedUser);
    setCurrentUser(user);
  }, [activeUserService]);

  return (
    <div className="min-h-screen">
      {currentUser ? (
        <MainLayout 
          user={currentUser} 
          onLogout={handleLogout} 
          onUpdateUser={handleUpdateUser}
          userService={activeUserService}
        />
      ) : (
        <LoginPage onLogin={handleLogin} />
      )}
    </div>
  );
};

export default App;