import React, { useState, useCallback, useMemo } from 'react';
import mammoth from 'mammoth';
import { SummarizeTask, MultiDocumentInput, User, IUserService } from '../types';
import { processSummarizeTask, extractTextFromFile } from '../services/geminiService';
import Card from './common/Card';
import Button from './common/Button';
import AIResponseDisplay from './common/AIResponseDisplay';

interface SummarizeModuleProps {
    onTaskComplete: () => void;
    isQuotaExhausted: boolean;
    onSendToDrafting: (content: string) => void;
    user: User;
    userService: IUserService;
}

const createNewDocument = (): MultiDocumentInput => ({
    id: Date.now(),
    source: '',
    content: '',
    fileName: '',
});

const SummarizeModule: React.FC<SummarizeModuleProps> = ({ onTaskComplete, isQuotaExhausted, onSendToDrafting, user, userService }) => {
    const [documents, setDocuments] = useState<MultiDocumentInput[]>([
        { ...createNewDocument(), source: 'Nguồn 1' }
    ]);
    const [customRequest, setCustomRequest] = useState('');
    const [result, setResult] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [ocrStates, setOcrStates] = useState<Record<number, boolean>>({});
    
    const isDemo = useMemo(() => user.username === 'demo', [user.username]);

    const setOcrLoading = (id: number, isLoading: boolean) => {
        setOcrStates(prev => ({ ...prev, [id]: isLoading }));
    };
    const isAnyOcrLoading = useMemo(() => Object.values(ocrStates).some(Boolean), [ocrStates]);
    
    const handleAddDocument = () => {
        setDocuments(prev => [...prev, { ...createNewDocument(), source: `Nguồn ${prev.length + 1}` }]);
    };

    const handleRemoveDocument = (id: number) => {
        setDocuments(prev => prev.filter(doc => doc.id !== id));
    };

    const handleDocumentChange = (id: number, field: 'source' | 'content' | 'fileName', value: string) => {
        setDocuments(prev => prev.map(doc => doc.id === id ? { ...doc, [field]: value } : doc));
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, id: number) => {
        const file = event.target.files?.[0];
        if (!file) return;

        handleDocumentChange(id, 'fileName', file.name);

        const isImage = file.type.startsWith('image/');
        const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx');
        const isPdf = file.type === 'application/pdf';

        if (isImage || isPdf) {
            handleDocumentChange(id, 'content', '');
            setOcrLoading(id, true);

            const reader = new FileReader();
            reader.onloadend = async () => {
                try {
                    const base64String = (reader.result as string).split(',')[1];
                    const mimeType = file.type;
                    const filePart = { inlineData: { mimeType, data: base64String } };
                    const extractedText = await extractTextFromFile(user.id, isDemo, filePart);
                    handleDocumentChange(id, 'content', extractedText);
                } catch (e: any) {
                    handleDocumentChange(id, 'content', `Lỗi: ${e.message || 'không thể xử lý tệp'}`);
                } finally {
                    setOcrLoading(id, false);
                }
            };
            reader.readAsDataURL(file);
        } else if (isDocx) {
            handleDocumentChange(id, 'content', `Đang trích xuất văn bản từ tệp DOCX: ${file.name}...`);
            setOcrLoading(id, true);

            const reader = new FileReader();
            reader.onloadend = async () => {
                const arrayBuffer = reader.result as ArrayBuffer;
                try {
                    const result = await mammoth.extractRawText({ arrayBuffer });
                    handleDocumentChange(id, 'content', result.value);
                } catch (error) {
                    console.error("Error extracting text from DOCX:", error);
                    handleDocumentChange(id, 'content', `Lỗi: không thể xử lý tệp DOCX ${file.name}.`);
                } finally {
                    setOcrLoading(id, false);
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            handleDocumentChange(id, 'content', `Đã nhận tệp "${file.name}".\nĐịnh dạng này chưa hỗ trợ trích xuất tự động (hỗ trợ DOCX, PDF và hình ảnh).\nVui lòng sao chép và dán nội dung vào đây để AI phân tích.`);
        }

        event.target.value = '';
    };
    
    const handleSingleDocTask = useCallback(async (task: SummarizeTask) => {
        const firstDocContent = documents[0]?.content.trim();
        if (!firstDocContent || isQuotaExhausted) return;
        setIsLoading(true);
        setResult('');
        try {
            const response = await processSummarizeTask(user.id, isDemo, task, firstDocContent);
            setResult(response);
            onTaskComplete();
        } catch (error: any) {
            setResult(`Đã có lỗi xảy ra: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [documents, onTaskComplete, isQuotaExhausted, user.id, isDemo]);

    const handleMultiDocTask = useCallback(async (task: SummarizeTask.MULTI_DOC_SUMMARY | SummarizeTask.ANALYZE_AND_SUGGEST) => {
        const docsWithContent = documents.filter(d => d.content.trim());
        if (docsWithContent.length < 2 || isQuotaExhausted) return;
        setIsLoading(true);
        setResult('');
        try {
            const response = await processSummarizeTask(user.id, isDemo, task, docsWithContent);
            setResult(response);
            onTaskComplete();
        } catch (error: any) {
            setResult(`Đã có lỗi xảy ra: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [documents, onTaskComplete, isQuotaExhausted, user.id, isDemo]);

    const handleCustomRequest = useCallback(async () => {
        const docsWithContent = documents.filter(d => d.content.trim());
        if (docsWithContent.length === 0 || !customRequest.trim() || isQuotaExhausted) return;

        setIsLoading(true);
        setResult('');
        try {
            const dataForApi = documents.length > 1 ? docsWithContent : documents[0].content;
            const response = await processSummarizeTask(user.id, isDemo, SummarizeTask.CUSTOM_REQUEST, dataForApi, customRequest);
            setResult(response);
            onTaskComplete();
        } catch (error: any) {
            setResult(`Đã có lỗi xảy ra: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [documents, customRequest, onTaskComplete, isQuotaExhausted, user.id, isDemo]);

    const handleSaveToWorkspace = async (content: string) => {
        const projectName = window.prompt("Nhập tên dự án để lưu kết quả phân tích:", "");
        if (projectName && projectName.trim()) {
            try {
                await userService.saveResultToWorkspace(user.id, projectName.trim(), 'analysis', content);
                alert(`Đã lưu kết quả vào dự án "${projectName.trim()}" thành công!`);
            } catch (error) {
                alert("Đã xảy ra lỗi khi lưu vào Không gian làm việc.");
                console.error(error);
            }
        }
    };

    const hasContent = useMemo(() => documents.some(d => d.content.trim()), [documents]);
    
    const actionButton = useMemo(() => (
        result && !isLoading ? (
            <Button onClick={() => onSendToDrafting(result)} variant="secondary">
                Gửi đến Soạn thảo &rarr;
            </Button>
        ) : null
    ), [result, isLoading, onSendToDrafting]);

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Phân tích Văn bản</h1>
            <Card>
                <div className="space-y-6">
                    {documents.map((doc) => (
                        <div key={doc.id} className="p-4 border rounded-lg bg-slate-50 relative">
                             {documents.length > 1 && (
                                <button
                                    onClick={() => handleRemoveDocument(doc.id)}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                                    aria-label="Xóa nguồn"
                                    disabled={isLoading || isAnyOcrLoading}
                                >
                                    &times;
                                </button>
                            )}
                            <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                                <input
                                    type="text"
                                    placeholder="Tên nguồn (ví dụ: Báo cáo Đơn vị A)"
                                    className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 flex-grow"
                                    value={doc.source}
                                    onChange={(e) => handleDocumentChange(doc.id, 'source', e.target.value)}
                                    disabled={isLoading || isAnyOcrLoading}
                                />
                                <input
                                    type="file"
                                    id={`file-upload-${doc.id}`}
                                    className="hidden"
                                    onChange={(e) => handleFileChange(e, doc.id)}
                                    accept="image/*,.pdf,.docx,.xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                    disabled={isLoading || isAnyOcrLoading}
                                />
                                <label
                                    htmlFor={`file-upload-${doc.id}`}
                                    className={`cursor-pointer px-4 py-2 text-sm font-semibold rounded-md transition-colors ${(isLoading || isAnyOcrLoading) ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-slate-600 text-white hover:bg-slate-700'}`}
                                >
                                    Tải tệp
                                </label>
                            </div>
                            {doc.fileName && <p className="text-sm text-gray-500 mb-2">Tệp đã chọn: {doc.fileName}</p>}
                             {ocrStates[doc.id] && (
                                <div className="text-center p-2 bg-blue-50 border border-blue-200 rounded-md mb-2">
                                    <p className="text-blue-700 text-sm font-semibold animate-pulse">Đang trích xuất văn bản...</p>
                                </div>
                            )}
                            <textarea
                                rows={8}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                placeholder="Dán văn bản hoặc tải tệp lên..."
                                value={doc.content}
                                onChange={(e) => handleDocumentChange(doc.id, 'content', e.target.value)}
                                disabled={isLoading || isAnyOcrLoading}
                            ></textarea>
                        </div>
                    ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-4 items-center">
                    {documents.length === 1 && (
                        <>
                            <Button onClick={() => handleSingleDocTask(SummarizeTask.SUMMARY)} isLoading={isLoading} disabled={!hasContent || isQuotaExhausted || isAnyOcrLoading}>
                                Tóm tắt
                            </Button>
                            <Button onClick={() => handleSingleDocTask(SummarizeTask.EXTRACT_DATA)} isLoading={isLoading} variant="secondary" disabled={!hasContent || isQuotaExhausted || isAnyOcrLoading}>
                                Trích xuất Số liệu
                            </Button>
                             <Button onClick={() => handleSingleDocTask(SummarizeTask.ANALYZE_DATA)} isLoading={isLoading} variant="secondary" disabled={!hasContent || isQuotaExhausted || isAnyOcrLoading}>
                                Phân tích Dữ liệu
                            </Button>
                            <Button onClick={() => handleSingleDocTask(SummarizeTask.ANALYZE_AND_SUGGEST)} isLoading={isLoading} disabled={!hasContent || isQuotaExhausted || isAnyOcrLoading}>
                                Phân tích & Đề xuất
                            </Button>
                        </>
                    )}
                    {documents.length > 1 && (
                         <>
                            <Button onClick={() => handleMultiDocTask(SummarizeTask.MULTI_DOC_SUMMARY)} isLoading={isLoading} disabled={documents.filter(d => d.content.trim()).length < 2 || isQuotaExhausted || isAnyOcrLoading}>
                                Tổng hợp Liên văn bản
                            </Button>
                             <Button onClick={() => handleMultiDocTask(SummarizeTask.ANALYZE_AND_SUGGEST)} isLoading={isLoading} disabled={documents.filter(d => d.content.trim()).length < 2 || isQuotaExhausted || isAnyOcrLoading}>
                                Phân tích & Đề xuất
                            </Button>
                        </>
                    )}
                    <Button onClick={handleAddDocument} variant="secondary" disabled={isLoading || isAnyOcrLoading}>
                        + Thêm nguồn
                    </Button>
                </div>
                
                <div className="mt-6 pt-6 border-t">
                    <label htmlFor="custom-request-input" className="block text-lg font-medium text-gray-700 mb-2">
                        Yêu cầu Tùy chỉnh
                    </label>
                    <textarea
                        id="custom-request-input"
                        rows={3}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                        placeholder="Nhập yêu cầu cụ thể (ví dụ: đánh giá tính hiệu quả, góp ý để hoàn thiện, chuyển thành dạng gạch đầu dòng...)"
                        value={customRequest}
                        onChange={(e) => setCustomRequest(e.target.value)}
                        disabled={isLoading || isAnyOcrLoading}
                    />
                    <div className="mt-2">
                        <Button
                            onClick={handleCustomRequest}
                            isLoading={isLoading}
                            disabled={!hasContent || !customRequest.trim() || isQuotaExhausted || isAnyOcrLoading}
                        >
                            Thực hiện Yêu cầu
                        </Button>
                    </div>
                </div>

                 {isQuotaExhausted && <p className="text-sm text-red-500 mt-4">Hạn mức đã hết. Không thể thực hiện tác vụ.</p>}
            </Card>

            <AIResponseDisplay 
                title="Kết quả xử lý" 
                content={result} 
                isLoading={isLoading}
                actionButton={actionButton}
                onSaveToWorkspace={handleSaveToWorkspace}
            />
        </div>
    );
};

export default SummarizeModule;