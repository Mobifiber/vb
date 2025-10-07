import React, { useState, useCallback } from 'react';
import LoginPage from './components/LoginPage';
import MainLayout from './components/MainLayout';
import { User } from './types';
// Ghi chú: Chúng ta đã xóa dòng "import { userService } from './data/mockDB';" vì không còn dùng database giả nữa.

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  /**
   * Xử lý đăng nhập bằng cách gọi API route /api/login.
   */
  const handleLogin = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      // Gửi yêu cầu tới API route chúng ta đã tạo trên server
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      // Nếu xác thực thành công (status code 200-299)
      if (response.ok) {
        const user: User = await response.json();
        setCurrentUser(user); // Cập nhật state với thông tin người dùng thật từ database
        return true;
      } else {
        // Nếu sai mật khẩu hoặc có lỗi từ server
        console.error('Login failed with status:', response.status);
        return false;
      }
    } catch (error) {
      console.error('An error occurred during login:', error);
      return false;
    }
  }, []);

  /**
   * Xử lý đăng xuất bằng cách xóa state của người dùng hiện tại.
   */
  const handleLogout = useCallback(() => {
    setCurrentUser(null);
  }, []);

  /**
   * Xử lý cập nhật thông tin người dùng bằng cách gọi API route /api/updateUser.
   * Ghi chú: Bạn sẽ cần tạo file /api/updateUser.ts tương tự như file /api/login.ts.
   */
  const handleUpdateUser = useCallback(async (updatedUser: User) => {
     try {
        const response = await fetch('/api/updateUser', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedUser),
        });

        if (response.ok) {
            const user: User = await response.json();
            setCurrentUser(user);
        } else {
             console.error('Failed to update user');
        }
    } catch (error) {
        console.error('Update user failed:', error);
    }
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
