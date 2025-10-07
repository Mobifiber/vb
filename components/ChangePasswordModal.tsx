import React, { useState } from 'react';
import Modal from './common/Modal';
import Button from './common/Button';

interface ChangePasswordModalProps {
  onClose: () => void;
  onSubmit: (oldPass: string, newPass: string) => Promise<boolean>;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ onClose, onSubmit }) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('Vui lòng điền đầy đủ các trường.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu mới không khớp.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    setIsLoading(true);
    const result = await onSubmit(oldPassword, newPassword);
    setIsLoading(false);

    if (result) {
        setSuccess('Đổi mật khẩu thành công!');
        setTimeout(onClose, 1500);
    } else {
        setError('Mật khẩu cũ không chính xác.');
    }
  };

  return (
    <Modal title="Đổi mật khẩu" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="old-password" className="block text-sm font-medium text-gray-700">Mật khẩu cũ</label>
          <input type="password" id="old-password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div>
          <label htmlFor="new-password"  className="block text-sm font-medium text-gray-700">Mật khẩu mới</label>
          <input type="password" id="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div>
          <label htmlFor="confirm-password"  className="block text-sm font-medium text-gray-700">Xác nhận mật khẩu mới</label>
          <input type="password" id="confirm-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" />
        </div>
        
        {error && <p className="text-red-500 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm">{success}</p>}

        <div className="flex justify-end gap-3 pt-4 border-t mt-6">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>Hủy</Button>
          <Button type="submit" isLoading={isLoading} disabled={!!success}>Lưu thay đổi</Button>
        </div>
      </form>
    </Modal>
  );
};

export default ChangePasswordModal;
