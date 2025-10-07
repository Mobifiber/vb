import React, { useState, useEffect, useCallback } from 'react';
import { User, Dictionary } from '../types';
import { userService } from '../data/mockDB';
import Card from './common/Card';
import Button from './common/Button';
import EditQuotaModal from './EditQuotaModal';

const AdminModule: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [dictionaries, setDictionaries] = useState<Dictionary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [notification, setNotification] = useState('');

  const [newDictName, setNewDictName] = useState('');
  const [newDictContent, setNewDictContent] = useState('');


  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const userList = await userService.getAllUsers();
    const dictList = await userService.getDictionaries();
    setUsers(userList.filter(u => u.role !== 'superadmin'));
    setDictionaries(dictList);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleResetPassword = async (userId: number) => {
    if (window.confirm('Bạn có chắc muốn đặt lại mật khẩu cho người dùng này?')) {
        const newPassword = await userService.resetPassword(userId);
        setNotification(`Mật khẩu mới là: ${newPassword}. Vui lòng sao chép và gửi cho người dùng.`);
        setTimeout(() => setNotification(''), 15000); // Clear notification after 15s
    }
  };
  
  const handleUpdateQuota = async (user: User) => {
    await userService.updateUser(user);
    setEditingUser(null);
    fetchData(); // Refresh the list
  };

  const handleAddNewDictionary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newDictName.trim() && newDictContent.trim()) {
        await userService.addDictionary(newDictName, newDictContent);
        setNewDictName('');
        setNewDictContent('');
        fetchData(); // This will refresh the list from the service
        setNotification(`Đã thêm từ điển "${newDictName}" thành công.`);
        setTimeout(() => setNotification(''), 5000);
    }
};

  if (isLoading) {
    return <p>Đang tải dữ liệu quản trị...</p>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Quản trị Viên</h1>
      {notification && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Thành công! </strong>
          <span className="block sm:inline">{notification}</span>
        </div>
      )}
      <div className="space-y-6">
        <Card title="Danh sách Người dùng">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên người dùng</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vai trò</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hạn mức (Đã dùng / Tổng)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map(user => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{user.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{user.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{user.quota.used} / {user.quota.total}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <Button onClick={() => setEditingUser(user)} variant="secondary">Sửa hạn mức</Button>
                      <Button onClick={() => handleResetPassword(user.id)} variant="secondary">Reset Mật khẩu</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Quản lý Từ điển Nghiệp vụ">
            <p className="text-sm text-gray-600 mb-4">Đây là danh sách các từ điển đang được sử dụng trong Module "Kiểm tra & Chuẩn hóa".</p>
            <ul className="space-y-2">
                {dictionaries.map(dict => (
                    <li key={dict.id} className="p-3 bg-slate-100 rounded-md flex justify-between items-center">
                        <p className="font-semibold text-slate-800">{dict.name}</p>
                        <button className="text-xs text-red-500 hover:text-red-700" onClick={() => alert('Chức năng xóa đang được phát triển.')}>Xóa</button>
                    </li>
                ))}
            </ul>

            <form onSubmit={handleAddNewDictionary} className="mt-6 pt-6 border-t">
                <h3 className="text-lg font-semibold mb-3 text-gray-700">Thêm Từ điển Mới</h3>
                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="Tên từ điển (ví dụ: Hải quân)"
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        value={newDictName}
                        onChange={e => setNewDictName(e.target.value)}
                        required
                    />
                    <textarea
                        placeholder="Nội dung từ điển (mỗi dòng một mục, ví dụ: HQ - Hải quân)"
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        rows={6}
                        value={newDictContent}
                        onChange={e => setNewDictContent(e.target.value)}
                        required
                    />
                    <Button type="submit">Thêm Từ điển</Button>
                </div>
            </form>
        </Card>
      </div>

      {editingUser && (
          <EditQuotaModal 
            user={editingUser}
            onClose={() => setEditingUser(null)}
            onSave={handleUpdateQuota}
          />
      )}
    </div>
  );
};

export default AdminModule;
