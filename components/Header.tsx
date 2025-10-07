import React from 'react';

interface HeaderProps {
  username: string;
  onLogout: () => void;
  onChangePassword: () => void;
}

const Header: React.FC<HeaderProps> = ({ username, onLogout, onChangePassword }) => {
  return (
    <header className="bg-white shadow-sm p-4 flex justify-between items-center">
      <h1 className="text-xl font-semibold text-gray-800">Trợ lý Tham mưu Tổng hợp (TMTH)</h1>
      <div className="flex items-center space-x-4">
        <span className="text-gray-600">Xin chào, {username}</span>
        <button
          onClick={onChangePassword}
          className="px-3 py-1 text-sm text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
        >
          Đổi mật khẩu
        </button>
        <button
          onClick={onLogout}
          className="px-3 py-1 text-sm text-white bg-red-500 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          Đăng xuất
        </button>
      </div>
    </header>
  );
};

export default Header;