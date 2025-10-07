import React, { useState } from 'react';

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<boolean>;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('user');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginAttempt = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (username && password) {
        setIsLoading(true);
        const success = await onLogin(username, password);
        setIsLoading(false);
        if (!success) {
            setError('Tên đăng nhập hoặc mật khẩu không chính xác.');
        }
    } else {
      setError('Vui lòng nhập tên người dùng và mật khẩu.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-2xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800">Trợ lý Tham mưu Tổng hợp</h1>
          <p className="mt-2 text-sm text-gray-600">Nền tảng AI chuyên dụng cho nghiệp vụ</p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLoginAttempt}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">Tên người dùng</label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="relative block w-full px-3 py-2 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-none appearance-none rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Tên người dùng"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="password-input" className="sr-only">Mật khẩu</label>
              <input
                id="password-input"
                name="password"
                type="password"
                required
                className="relative block w-full px-3 py-2 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-none appearance-none rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
          
          {error && <p className="text-sm text-center text-red-500">{error}</p>}

          <div>
            <button type="submit" className="relative flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md group hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400" disabled={isLoading}>
              {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;