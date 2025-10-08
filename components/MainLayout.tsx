import React, { useState, useCallback } from 'react';
import { Module, User, IUserService } from '../types';
import Sidebar from './Sidebar';
import Header from './Header';
import Dashboard from './Dashboard';
import SummarizeModule from './SummarizeModule';
import DraftingModule from './DraftingModule';
import ReviewModule from './ReviewModule';
import AdminModule from './AdminModule';
import WorkspaceModule from './WorkspaceModule';
import ChangePasswordModal from './ChangePasswordModal';

interface MainLayoutProps {
  user: User;
  onLogout: () => void;
  onUpdateUser: (user: User) => void;
  userService: IUserService;
}

const MainLayout: React.FC<MainLayoutProps> = ({ user, onLogout, onUpdateUser, userService }) => {
  const [activeModule, setActiveModule] = useState<Module>(Module.Dashboard);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [workflowData, setWorkflowData] = useState<string | null>(null);

  const handleModuleChange = useCallback((module: Module) => {
    setActiveModule(module);
  }, []);

  const incrementUsage = useCallback(async () => {
    if (userService.incrementUsage) {
      // This is the demo service, which handles local storage updates
      const updatedUser = await userService.incrementUsage();
      onUpdateUser(updatedUser);
    } else {
      // This is the real service. The backend handles the actual increment.
      // We just update the frontend state for a responsive UI.
      if (user.quota.used < user.quota.total) {
        const updatedUser = { ...user, quota: { ...user.quota, used: user.quota.used + 1 } };
        onUpdateUser(updatedUser);
      }
    }
  }, [user, onUpdateUser, userService]);

  const handlePasswordChange = async (oldPass: string, newPass: string): Promise<boolean> => {
      const success = await userService.changePassword(user.id, oldPass, newPass);
      if (success) {
          setIsPasswordModalOpen(false);
      }
      return success;
  };

  const handleSendToDrafting = (content: string) => {
    setWorkflowData(content);
    setActiveModule(Module.Drafting);
  };

  const handleSendToReview = (content: string) => {
    setWorkflowData(content);
    setActiveModule(Module.Review);
  };
  
  const clearWorkflowData = () => {
    setWorkflowData(null);
  };


  const renderModule = () => {
    const isQuotaExhausted = user.quota.used >= user.quota.total;
    switch (activeModule) {
      case Module.Dashboard:
        return <Dashboard usage={user.quota.used} totalQuota={user.quota.total} />;
      case Module.Workspace:
        return <WorkspaceModule user={user} userService={userService} />;
      case Module.Summarize:
        return <SummarizeModule 
                  onTaskComplete={incrementUsage} 
                  isQuotaExhausted={isQuotaExhausted} 
                  onSendToDrafting={handleSendToDrafting}
                  user={user}
                  userService={userService}
               />;
      case Module.Drafting:
        return <DraftingModule 
                  onTaskComplete={incrementUsage} 
                  isQuotaExhausted={isQuotaExhausted}
                  onSendToReview={handleSendToReview}
                  initialIdeas={workflowData}
                  onDataReceived={clearWorkflowData}
                  user={user}
                  userService={userService}
               />;
      case Module.Review:
        return <ReviewModule 
                  onTaskComplete={incrementUsage} 
                  isQuotaExhausted={isQuotaExhausted}
                  initialText={workflowData}
                  onDataReceived={clearWorkflowData}
                  user={user}
                  userService={userService}
               />;
      case Module.Admin:
        return user.role === 'superadmin' ? <AdminModule userService={userService} /> : <p>Bạn không có quyền truy cập vào mục này.</p>;
      default:
        return <Dashboard usage={user.quota.used} totalQuota={user.quota.total} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-100">
      <Sidebar userRole={user.role} activeModule={activeModule} onModuleChange={handleModuleChange} />
      <div className="flex flex-col flex-1">
        <Header 
          username={user.username} 
          onLogout={onLogout} 
          onChangePassword={() => setIsPasswordModalOpen(true)}
        />
        <main className="flex-1 p-6 overflow-y-auto">
          {renderModule()}
        </main>
      </div>
      {isPasswordModalOpen && (
          <ChangePasswordModal 
            onClose={() => setIsPasswordModalOpen(false)}
            onSubmit={handlePasswordChange}
          />
      )}
    </div>
  );
};

export default MainLayout;