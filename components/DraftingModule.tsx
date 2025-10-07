import React, { useState, useCallback, useMemo, useEffect } from 'react';
import mammoth from 'mammoth';
import { DraftTask, DOCUMENT_TYPES, ToneStyle, DetailLevel, DraftTemplateField } from '../types';
import { processDraftTask, extractTextFromFile } from '../services/geminiService';
import { userService } from '../data/mockDB';
import Card from './common/Card';
import Button from './common/Button';
import AIResponseDisplay from './common/AIResponseDisplay';

interface DraftingModuleProps {
    onTaskComplete: () => void;
    isQuotaExhausted: boolean;
    onSendToReview: (content: string) => void;
    initialIdeas: string | null;
    onDataReceived: () => void;
}

const DRAFT_TEMPLATES: Record<string, DraftTemplateField[]> = {
    "Kế hoạch triển khai": [
        { id: "muc_dich_yeu_cau", label: "I. MỤC ĐÍCH - YÊU CẦU", placeholder: "Nêu rõ mục tiêu cần đạt được và các yêu cầu cốt lõi..." },
        { id: "noi_dung_thuc_hien", label: "II. NỘI DUNG THỰC HIỆN", placeholder: "Liệt kê các nội dung, công việc cụ thể cần triển khai..." },
        { id: "phan_cong_nhiem_vu", label: "III. PHÂN CÔNG NHIỆM VỤ", placeholder: "Giao nhiệm vụ cụ thể cho từng đơn vị, cá nhân, kèm theo thời gian hoàn thành..." },
        { id: "bao_dam_cong_tac", label: "IV. BẢO ĐẢM CÔNG TÁC", placeholder: "Nêu rõ về công tác bảo đảm hậu cần, kỹ thuật, tài chính..." },
        { id: "chi_huy_dieu_hanh", label: "V. TỔ CHỨC CHỈ HUY, ĐIỀU HÀNH", placeholder: "Quy định về cơ cấu chỉ huy, chế độ báo cáo..." },
    ]
};

const CUSTOM_DOC_TYPE_REQUEST = "Yêu cầu soạn thảo khác...";

const DraftingModule: React.FC<DraftingModuleProps> = ({ onTaskComplete, isQuotaExhausted, onSendToReview, initialIdeas, onDataReceived }) => {
    const [ideas, setIdeas] = useState('');
    const [templateData, setTemplateData] = useState<Record<string, string>>({});
    const [referenceText, setReferenceText] = useState('');
    const [docType, setDocType] = useState(DOCUMENT_TYPES[0]);
    const [style, setStyle] = useState<ToneStyle>(ToneStyle.NEUTRAL);
    const [detailLevel, setDetailLevel] = useState<DetailLevel>(DetailLevel.CONCISE);
    const [customDraftRequest, setCustomDraftRequest] = useState('');
    const [result, setResult] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // OCR loading states for different inputs
    const [isRefOcrLoading, setIsRefOcrLoading] = useState(false);
    const [isIdeasOcrLoading, setIsIdeasOcrLoading] = useState(false);

    const [referenceFileName, setReferenceFileName] = useState('');
    const [ideasFileName, setIdeasFileName] = useState('');
    
    useEffect(() => {
        if (initialIdeas) {
            setIdeas(initialIdeas);
            onDataReceived(); // Clear the data in the parent to prevent re-populating
        }
    }, [initialIdeas, onDataReceived]);

    const isProcessing = useMemo(() => isLoading || isRefOcrLoading || isIdeasOcrLoading, [isLoading, isRefOcrLoading, isIdeasOcrLoading]);

    const activeTemplate = useMemo(() => DRAFT_TEMPLATES[docType] || null, [docType]);
    
    // Only show template view if a template exists for the doc type AND the main ideas textarea is empty.
    const showTemplate = useMemo(() => activeTemplate && !ideas.trim(), [activeTemplate, ideas]);

    const handleTemplateDataChange = (id: string, value: string) => {
        setTemplateData(prev => ({ ...prev, [id]: value }));
    };
    
    const isInputEmpty = useMemo(() => {
        if (showTemplate && activeTemplate) {
            // Fix: Property 'trim' does not exist on type 'unknown'. Add a type check.
            return Object.values(templateData).every(val => typeof val === 'string' && val.trim() === '');
        }
        return ideas.trim() === '';
    }, [showTemplate, activeTemplate, templateData, ideas]);

    const handleTask = useCallback(async (task: DraftTask) => {
        if (isInputEmpty || isQuotaExhausted) return;
        setIsLoading(true);
        setResult('');
        try {
            let inputData: string | Record<string, string>;
            if (showTemplate && activeTemplate) {
                const structuredData: Record<string, string> = {};
                for (const field of activeTemplate) {
                    if (templateData[field.id] && templateData[field.id].trim() !== '') {
                        structuredData[field.label] = templateData[field.id];
                    }
                }
                inputData = structuredData;
            } else {
                inputData = ideas;
            }

            const finalDocType = docType === CUSTOM_DOC_TYPE_REQUEST ? "văn bản theo yêu cầu" : docType;
            const response = await processDraftTask(task, inputData, finalDocType, style, detailLevel, referenceText, customDraftRequest);
            setResult(response);
            onTaskComplete();
        } catch (error) {
            setResult('Đã có lỗi xảy ra. Vui lòng thử lại.');
        } finally {
            setIsLoading(false);
        }
    }, [ideas, docType, style, detailLevel, onTaskComplete, isQuotaExhausted, isInputEmpty, showTemplate, activeTemplate, templateData, referenceText, customDraftRequest]);
    
    const handleDocTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newDocType = e.target.value;
        setDocType(newDocType);
        if (newDocType !== CUSTOM_DOC_TYPE_REQUEST) {
            setCustomDraftRequest(''); // Clear custom request if a standard type is chosen
        }
        setTemplateData({});
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, target: 'ideas' | 'reference') => {
        const file = event.target.files?.[0];
        if (!file) return;

        const setLoading = target === 'ideas' ? setIsIdeasOcrLoading : setIsRefOcrLoading;
        const setFileName = target === 'ideas' ? setIdeasFileName : setReferenceFileName;
        const setText = target === 'ideas' ? setIdeas : setReferenceText;

        setFileName(file.name);

        const isImage = file.type.startsWith('image/');
        const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx');
        const isPdf = file.type === 'application/pdf';

        if (isImage || isPdf) {
            setLoading(true);
            setText(`Đang trích xuất văn bản từ tệp: ${file.name}...`);
            const reader = new FileReader();
            reader.onloadend = async () => {
                try {
                    const base64String = (reader.result as string).split(',')[1];
                    const mimeType = file.type;
                    const filePart = { inlineData: { mimeType, data: base64String } };
                    const extractedText = await extractTextFromFile(filePart);
                    setText(extractedText);
                } catch (e) {
                    setText(`Lỗi: không thể xử lý tệp ${file.name}.`);
                } finally {
                    setLoading(false);
                }
            };
            reader.readAsDataURL(file);
        } else if (isDocx) {
            setLoading(true);
            setText(`Đang trích xuất văn bản từ tệp DOCX: ${file.name}...`);
            const reader = new FileReader();
            reader.onloadend = async () => {
                const arrayBuffer = reader.result as ArrayBuffer;
                try {
                    const result = await mammoth.extractRawText({ arrayBuffer });
                    setText(result.value);
                } catch (error) {
                    console.error("Error extracting text from DOCX:", error);
                    setText(`Lỗi: không thể xử lý tệp DOCX ${file.name}.`);
                } finally {
                    setLoading(false);
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            setText(`Đã nhận tệp "${file.name}".\nĐịnh dạng này chưa hỗ trợ trích xuất tự động (hỗ trợ DOCX, PDF và hình ảnh).\nVui lòng sao chép và dán nội dung vào đây.`);
        }

        event.target.value = '';
    };

    const handleSaveToWorkspace = async (content: string) => {
        const projectName = window.prompt("Nhập tên dự án để lưu văn bản soạn thảo:", "");
        if (projectName && projectName.trim()) {
            try {
                await userService.saveResultToWorkspace(projectName.trim(), 'drafting', content);
                alert(`Đã lưu kết quả vào dự án "${projectName.trim()}" thành công!`);
            } catch (error) {
                alert("Đã xảy ra lỗi khi lưu vào Không gian làm việc.");
                console.error(error);
            }
        }
    };

    const actionButton = useMemo(() => (
        result && !isLoading ? (
            <Button onClick={() => onSendToReview(result)} variant="secondary">
                Gửi đến Kiểm tra &rarr;
            </Button>
        ) : null
    ), [result, isLoading, onSendToReview]);

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Soạn thảo Tham mưu</h1>
            <Card>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-4">
                         <div>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-lg font-medium text-gray-700">
                                    {showTemplate ? `Nhập nội dung theo Mẫu "${docType}"` : "Nhập ý chính / số liệu"}
                                </label>
                                <input
                                    type="file"
                                    id="ideas-file-upload"
                                    className="hidden"
                                    onChange={(e) => handleFileChange(e, 'ideas')}
                                    accept="image/*,.pdf,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.xls,application/vnd.ms-excel,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                    disabled={isProcessing}
                                />
                                <label
                                    htmlFor="ideas-file-upload"
                                    className={`cursor-pointer px-3 py-1 text-sm font-semibold rounded-md transition-colors ${isProcessing ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-slate-500 text-white hover:bg-slate-600'}`}
                                >
                                    Tải tệp ý chính
                                </label>
                            </div>
                             {ideasFileName && <p className="text-sm text-gray-500 mb-2">Tệp ý chính: {ideasFileName}</p>}

                            {showTemplate ? (
                                <div className="space-y-4">
                                    {activeTemplate.map(field => (
                                        <div key={field.id}>
                                            <label htmlFor={field.id} className="block text-sm font-semibold text-gray-600">{field.label}</label>
                                            <textarea
                                                id={field.id}
                                                rows={3}
                                                className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                                placeholder={field.placeholder}
                                                value={templateData[field.id] || ''}
                                                onChange={(e) => handleTemplateDataChange(field.id, e.target.value)}
                                                disabled={isProcessing}
                                            ></textarea>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <textarea
                                    id="draft-input"
                                    rows={12}
                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                    placeholder="Nhập các ý chính, gạch đầu dòng, số liệu đã được tổng hợp, hoặc tải tệp..."
                                    value={ideas}
                                    onChange={(e) => setIdeas(e.target.value)}
                                    disabled={isProcessing}
                                ></textarea>
                            )}
                        </div>
                        <div>
                             <div className="flex justify-between items-center mb-2">
                                <label htmlFor="reference-text" className="block text-base font-medium text-gray-700">
                                    Văn bản/Chỉ đạo Tham chiếu (Tùy chọn)
                                </label>
                                <input
                                    type="file"
                                    id="reference-file-upload"
                                    className="hidden"
                                    onChange={(e) => handleFileChange(e, 'reference')}
                                    accept="image/*,.pdf,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.xls,application/vnd.ms-excel,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                    disabled={isProcessing}
                                />
                                <label
                                    htmlFor="reference-file-upload"
                                    className={`cursor-pointer px-3 py-1 text-sm font-semibold rounded-md transition-colors ${isProcessing ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-slate-500 text-white hover:bg-slate-600'}`}
                                >
                                    Tải tệp tham chiếu
                                </label>
                            </div>
                            {referenceFileName && <p className="text-sm text-gray-500 mb-2">Tệp tham chiếu: {referenceFileName}</p>}
                            <textarea
                                id="reference-text"
                                rows={5}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                placeholder="Dán nội dung văn bản liên quan hoặc tải tệp để AI đảm bảo tính nhất quán..."
                                value={referenceText}
                                onChange={(e) => setReferenceText(e.target.value)}
                                disabled={isProcessing}
                            ></textarea>
                        </div>
                    </div>
                     <div className="md:col-span-1 space-y-4">
                        <div>
                            <label htmlFor="doc-type" className="block text-base font-medium text-gray-700 mb-2">
                                1. Chọn Loại hình Văn bản
                            </label>
                            <select
                                id="doc-type"
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                value={docType}
                                onChange={handleDocTypeChange}
                                disabled={isProcessing}
                            >
                                {DOCUMENT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                            </select>
                             {docType === CUSTOM_DOC_TYPE_REQUEST && (
                                <div className="mt-4">
                                    <label htmlFor="custom-draft-request" className="block text-sm font-medium text-gray-600">
                                        Nhập yêu cầu soạn thảo cụ thể
                                    </label>
                                    <textarea
                                        id="custom-draft-request"
                                        rows={4}
                                        className="mt-1 w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                        placeholder="Ví dụ: Soạn một công văn hỏa tốc yêu cầu các đơn vị báo cáo tình hình quân số trước 17h00 hôm nay..."
                                        value={customDraftRequest}
                                        onChange={(e) => setCustomDraftRequest(e.target.value)}
                                        disabled={isProcessing}
                                    />
                                </div>
                            )}
                        </div>
                        <div>
                            <label htmlFor="tone-style" className="block text-base font-medium text-gray-700 mb-2">
                                2. Chọn Giọng điệu
                            </label>
                            <select
                                id="tone-style"
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                value={style}
                                onChange={(e) => setStyle(e.target.value as ToneStyle)}
                                disabled={isProcessing}
                            >
                                {Object.values(ToneStyle).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="detail-level" className="block text-base font-medium text-gray-700 mb-2">
                                3. Chọn Mức độ chi tiết
                            </label>
                            <select
                                id="detail-level"
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                value={detailLevel}
                                onChange={(e) => setDetailLevel(e.target.value as DetailLevel)}
                                disabled={isProcessing}
                            >
                                {Object.values(DetailLevel).map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
               
                <div className="mt-6 flex flex-wrap gap-4">
                    <Button 
                        onClick={() => handleTask(DraftTask.DRAFT_DOCUMENT)}
                        isLoading={isLoading}
                        disabled={isInputEmpty || isQuotaExhausted || isProcessing}
                    >
                        Soạn thảo Toàn văn
                    </Button>
                    <Button 
                        onClick={() => handleTask(DraftTask.SUGGEST_TITLES)}
                        isLoading={isLoading}
                        variant="secondary"
                        disabled={isInputEmpty || isQuotaExhausted || isProcessing}
                    >
                        Đề xuất Tiêu đề
                    </Button>
                </div>
                {isQuotaExhausted && <p className="text-sm text-red-500 mt-4">Hạn mức đã hết. Không thể thực hiện tác vụ.</p>}
            </Card>

            <AIResponseDisplay 
                title="Văn bản soạn thảo" 
                content={result} 
                isLoading={isLoading}
                actionButton={actionButton}
                onSaveToWorkspace={handleSaveToWorkspace}
            />
        </div>
    );
};

export default DraftingModule;
