import React, { useState } from 'react';
import { User } from '../types';
import Modal from './common/Modal';
import Button from './common/Button';

interface EditQuotaModalProps {
  user: User;
  onClose: () => void;
  onSave: (user: User) => void;
}

const EditQuotaModal: React.FC<EditQuotaModalProps> = ({ user, onClose, onSave }) => {
  const [used, setUsed] = useState(user.quota.used);
  const [total, setTotal] = useState(user.quota.total);
  
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...user, quota: { used: Number(used), total: Number(total) } });
  };
  
  return (
    <Modal title={`Chỉnh sửa hạn mức cho ${user.username}`} onClose={onClose}>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label htmlFor="used-quota" className="block text-sm font-medium text-gray-700">Đã sử dụng</label>
          <input type="number" id="used-quota" value={used} onChange={e => setUsed(Number(e.target.value))} required className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm" min="0" />
        </div>
        <div>
          <label htmlFor="total-quota" className="block text-sm font-medium text-gray-700">Tổng hạn mức</label>
          <input type="number" id="total-quota" value={total} onChange={e => setTotal(Number(e.target.value))} required className="mt-1 w-full p-2 border border-gray-300 rounded-md shadow-sm" min="0" />
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t mt-6">
          <Button type="button" variant="secondary" onClick={onClose}>Hủy</Button>
          <Button type="submit">Lưu</Button>
        </div>
      </form>
    </Modal>
  );
};

export default EditQuotaModal;
