
import React from 'react';
import Card from './common/Card';
import Alert from './common/Alert';

interface DashboardProps {
  usage: number;
  totalQuota: number;
}

const Dashboard: React.FC<DashboardProps> = ({ usage, totalQuota }) => {
    const percentage = totalQuota > 0 ? (usage / totalQuota) * 100 : 0;

    const getProgressBarColor = () => {
        if (percentage >= 100) return 'bg-red-600';
        if (percentage > 90) return 'bg-red-500';
        if (percentage > 70) return 'bg-yellow-500';
        return 'bg-blue-500';
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">Bảng điều khiển</h1>

            {percentage >= 100 && (
                <Alert variant="error" title="Hạn mức đã hết">
                    <p>Bạn đã sử dụng hết hạn mức tháng này. Các tính năng AI sẽ được tạm khóa cho đến đầu tháng sau. Vui lòng liên hệ quản trị viên để biết thêm chi tiết.</p>
                </Alert>
            )}

            {percentage > 90 && percentage < 100 && (
                 <Alert variant="warning" title="Sắp hết hạn mức">
                    <p>Bạn đã sử dụng hơn 90% hạn mức tháng. Hãy sử dụng một cách hợp lý để tránh gián đoạn công việc.</p>
                </Alert>
            )}
            
            <Card title="Hạn mức sử dụng tháng này">
                <div className="space-y-3">
                    <p className="text-lg text-gray-700">
                        Đã sử dụng: <span className="font-bold text-blue-600">{usage}</span> / {totalQuota} văn bản
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                        <div
                            className={`h-4 rounded-full transition-all duration-500 ${getProgressBarColor()}`}
                            style={{ width: `${percentage > 100 ? 100 : percentage}%` }}
                        ></div>
                    </div>
                </div>
            </Card>

            <Card title="Bắt đầu công việc">
                <p className="text-gray-600">
                    Chào mừng bạn đến với Trợ lý Tham mưu Tinh gọn. Hãy chọn một trong các module bên thanh điều hướng để bắt đầu.
                </p>
                <ul className="list-disc list-inside mt-4 text-gray-700 space-y-2">
                    <li><span className="font-semibold">Phân tích Văn bản:</span> Dán văn bản dài để tóm tắt, trích xuất số liệu quan trọng.</li>
                    <li><span className="font-semibold">Soạn thảo Tham mưu:</span> Nhập ý chính để AI viết thành văn bản hoàn chỉnh theo đúng văn phong.</li>
                    <li><span className="font-semibold">Kiểm tra & Chuẩn hóa:</span> Rà soát lỗi chính tả, ngữ pháp và thể thức cho văn bản của bạn.</li>
                    <li><span className="font-semibold">Không gian Làm việc:</span> Lưu trữ, quản lý và theo dõi tiến độ các dự án của bạn.</li>
                </ul>
            </Card>
        </div>
    );
};

export default Dashboard;