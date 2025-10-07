import React from 'react';
import { Module } from '../types';

interface SidebarProps {
  userRole: 'user' | 'superadmin';
  activeModule: Module;
  onModuleChange: (module: Module) => void;
}

const SidebarIcon: React.FC<{ icon: string, name: string }> = ({ icon, name }) => (
    <span title={name} className="text-2xl">{icon}</span>
);

const Sidebar: React.FC<SidebarProps> = ({ userRole, activeModule, onModuleChange }) => {
  const baseNavItems = [
    { id: Module.Dashboard, name: 'Dashboard', icon: '📊' },
    { id: Module.Workspace, name: 'Không gian Làm việc', icon: '🚀' },
    { id: Module.Summarize, name: 'Phân tích', icon: '📑' },
    { id: Module.Drafting, name: 'Soạn thảo', icon: '✍️' },
    { id: Module.Review, name: 'Kiểm tra', icon: '🔎' },
  ];

  const adminNavItem = { id: Module.Admin, name: 'Quản trị', icon: '⚙️' };

  const navItems = userRole === 'superadmin' ? [...baseNavItems, adminNavItem] : baseNavItems;

  return (
    <nav className="bg-slate-800 text-white w-64 p-4 flex flex-col">
      <div className="text-center mb-10">
        <div className="bg-slate-900 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
            <span className="text-3xl">⭐</span>
        </div>
        <h2 className="text-lg font-semibold mt-4">TMTH</h2>
      </div>
      <ul className="space-y-2">
        {navItems.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => onModuleChange(item.id)}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors duration-200 ${
                activeModule === item.id
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-slate-700'
              }`}
            >
              <SidebarIcon icon={item.icon} name={item.name} />
              <span className="font-medium">{item.id}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Sidebar;