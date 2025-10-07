import React from 'react';
import Card from './Card';
import Loader from './Loader';
import { exportToDocx } from '../../utils/exportUtils';
import Button from './Button';

interface AIResponseDisplayProps {
  title: string;
  content: string;
  isLoading: boolean;
  actionButton?: React.ReactNode;
  onSaveToWorkspace?: (content: string) => void; 
}

const AIResponseDisplay: React.FC<AIResponseDisplayProps> = ({ title, content, isLoading, actionButton, onSaveToWorkspace }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
  };
  
  const handleExport = () => {
    const fileName = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/gi, '_').toLowerCase();
    exportToDocx(content, `${fileName}.docx`);
  };

  return (
    <Card className="mt-6">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-y-2">
            <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
            <div className="flex items-center gap-2">
                {actionButton}
                {onSaveToWorkspace && content && !isLoading && (
                     <Button onClick={() => onSaveToWorkspace(content)} variant="secondary">
                        Lưu vào KGLV
                    </Button>
                )}
                <button onClick={handleCopy} className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded-md transition-colors" disabled={!content || isLoading}>
                    Sao chép
                </button>
                <button onClick={handleExport} className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded-md transition-colors font-semibold" disabled={!content || isLoading}>
                    Xuất ra DOCX
                </button>
            </div>
        </div>
        {isLoading ? (
            <div className="flex justify-center items-center h-48 bg-slate-50 rounded-md">
                <div className="text-center">
                    <div className="w-8 h-8 mx-auto border-4 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
                    <p className="mt-2 text-gray-600">AI đang xử lý...</p>
                </div>
            </div>
        ) : (
            <>
                {content ? (
                    <div className="p-4 bg-slate-50 rounded-md whitespace-pre-wrap text-gray-800 max-h-96 overflow-y-auto">
                        {content}
                    </div>
                ) : (
                    <div className="flex justify-center items-center h-48 bg-slate-50 rounded-md">
                         <p className="text-gray-500">Kết quả sẽ được hiển thị ở đây.</p>
                    </div>
                )}
            </>
        )}
    </Card>
  );
};

export default AIResponseDisplay;