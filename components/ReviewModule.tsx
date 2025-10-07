import React, { useState, useCallback, useMemo, useEffect } from 'react';
import mammoth from 'mammoth';
import { ReviewTask, Suggestion, SecurityWarning, Dictionary, ToneStyle, DetailLevel } from '../types';
import { processReviewTask, processSecurityCheck, evaluateEffectiveness, processSourceConsistencyCheck, extractTextFromFile, refineText } from '../services/geminiService';
import { userService } from '../data/mockDB';
import Card from './common/Card';
import Button from './common/Button';
import AIResponseDisplay from './common/AIResponseDisplay';
import { exportToDocx } from '../../utils/exportUtils';

// --- Helper Components defined in the same file ---

const SuggestionCard: React.FC<{
  suggestion: Suggestion;
  onAccept: (id: number) => void;
  onReject: (id: number) => void;
}> = ({ suggestion, onAccept, onReject }) => {
    const isPending = suggestion.status === 'pending';
    return (
        <div className={`p-4 rounded-lg border ${isPending ? 'bg-white' : 'bg-slate-50'}`}>
            <p className="text-sm font-semibold text-gray-500 mb-2">Đề xuất chỉnh sửa</p>
            <div className="space-y-3">
                <div>
                    <span className="text-xs font-bold text-red-600">GỐC:</span>
                    <p className="line-through text-red-800 bg-red-50 p-2 rounded-md">{suggestion.original}</p>
                </div>
                <div>
                    <span className="text-xs font-bold text-green-600">SỬA:</span>
                    <p className="text-green-800 bg-green-50 p-2 rounded-md">{suggestion.suggestion}</p>
                </div>
                 <div>
                    <span className="text-xs font-bold text-blue-600">LÝ DO:</span>
                    <p className="text-blue-800 p-2">{suggestion.reason}</p>
                </div>
            </div>
            {isPending && (
                <div className="flex justify-end gap-3 mt-4">
                    <button onClick={() => onReject(suggestion.id)} className="px-3 py-1 text-sm font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Bỏ qua</button>
                    <button onClick={() => onAccept(suggestion.id)} className="px-3 py-1 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700">Chấp nhận</button>
                </div>
            )}
        </div>
    );
};

const DiffViewer: React.FC<{ originalText: string; modifiedText: string; }> = ({ originalText, modifiedText }) => {
    const diff = useMemo(() => {
        const originalLines = originalText.split('\n');
        const modifiedLines = modifiedText.split('\n');
        const n = originalLines.length;
        const m = modifiedLines.length;

        // DP table for LCS
        const dp = Array(n + 1).fill(null).map(() => Array(m + 1).fill(0));
        for (let i = 1; i <= n; i++) {
            for (let j = 1; j <= m; j++) {
                if (originalLines[i - 1] === modifiedLines[j - 1]) {
                    dp[i][j] = 1 + dp[i - 1][j - 1];
                } else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }

        // Backtrack to find the diff
        const result: { type: 'common' | 'deleted' | 'added'; line: string }[] = [];
        let i = n, j = m;
        while (i > 0 || j > 0) {
            if (i > 0 && j > 0 && originalLines[i - 1] === modifiedLines[j - 1]) {
                result.unshift({ type: 'common', line: originalLines[i - 1] });
                i--;
                j--;
            } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
                result.unshift({ type: 'added', line: modifiedLines[j - 1] });
                j--;
            } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
                result.unshift({ type: 'deleted', line: originalLines[i - 1] });
                i--;
            } else {
                 break;
            }
        }
        return result;
    }, [originalText, modifiedText]);

    return (
        <div className="grid grid-cols-2 gap-4 font-mono text-sm">
            <div>
                <h3 className="text-lg font-semibold mb-2 font-sans text-center">Văn bản gốc</h3>
                <div className="p-2 bg-slate-50 text-slate-800 rounded-lg whitespace-pre-wrap w-full h-full min-h-[200px]">
                    {diff.map((change, index) => {
                        if (change.type === 'deleted') {
                            return <div key={index} className="bg-red-100"><span className="text-red-500 mr-2">-</span>{change.line || ' '}</div>;
                        }
                        if (change.type === 'common') {
                            return <div key={index}><span className="text-gray-400 mr-2"> </span>{change.line || ' '}</div>;
                        }
                        return <div key={index} className="bg-gray-100 h-[20px]"></div>;
                    })}
                </div>
            </div>
            <div>
                <h3 className="text-lg font-semibold mb-2 font-sans text-center">Văn bản đã hoàn thiện</h3>
                <div className="p-2 bg-slate-50 text-slate-800 rounded-lg whitespace-pre-wrap w-full h-full min-h-[200px]">
                     {diff.map((change, index) => {
                        if (change.type === 'added') {
                            return <div key={index} className="bg-green-100"><span className="text-green-500 mr-2">+</span>{change.line || ' '}</div>;
                        }
                        if (change.type === 'common') {
                            return <div key={index}><span className="text-gray-400 mr-2"> </span>{change.line || ' '}</div>;
                        }
                        return <div key={index} className="bg-gray-100 h-[20px]"></div>;
                    })}
                </div>
            </div>
        </div>
    );
};

const SecurityWarningDisplay: React.FC<{ warnings: SecurityWarning[] }> = ({ warnings }) => (
    <Card title="Cảnh báo Bảo mật" className="border-l-4 border-yellow-500">
        <p className="text-sm text-gray-600 mb-4">AI đã phát hiện các thông tin có khả năng nhạy cảm. Đề nghị đồng chí kiểm tra và cân nhắc làm mờ hoặc loại bỏ trước khi phát hành.</p>
        <ul className="space-y-3">
            {warnings.map(warning => (
                <li key={warning.id} className="p-3 bg-yellow-50 rounded-md">
                    <p className="font-semibold text-yellow-800">"{warning.text}"</p>
                    <p className="text-sm text-yellow-700 mt-1">Lý do: {warning.reason}</p>
                </li>
            ))}
        </ul>
    </Card>
);

// --- Main Module Component ---

interface ReviewModuleProps {
    onTaskComplete: () => void;
    isQuotaExhausted: boolean;
    initialText: string | null;
    onDataReceived: () => void;
}

const ReviewModule: React.FC<ReviewModuleProps> = ({ onTaskComplete, isQuotaExhausted, initialText, onDataReceived }) => {
    const [inputText, setInputText] = useState('');
    const [sourceText, setSourceText] = useState('');
    const [modifiedText, setModifiedText] = useState('');
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [securityWarnings, setSecurityWarnings] = useState<SecurityWarning[]>([]);
    const [effectivenessReport, setEffectivenessReport] = useState<string>('');
    const [consistencyReport, setConsistencyReport] = useState<string>('');
    const [dictionaries, setDictionaries] = useState<Dictionary[]>([]);
    const [selectedDictId, setSelectedDictId] = useState<string>('');
    const [desiredTone, setDesiredTone] = useState<ToneStyle | ''>('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState('');
    const [view, setView] = useState<'input' | 'review' | 'diff'>('input');
    
    const [isReviewTextLoading, setIsReviewTextLoading] = useState(false);
    const [isSourceTextLoading, setIsSourceTextLoading] = useState(false);
    const [reviewFileName, setReviewFileName] = useState('');
    const [sourceFileName, setSourceFileName] = useState('');

    const [isRefining, setIsRefining] = useState(false);
    const [refineTone, setRefineTone] = useState<ToneStyle | ''>('');
    const [refineDetailLevel, setRefineDetailLevel] = useState<DetailLevel | ''>('');

    useEffect(() => {
        userService.getDictionaries().then(setDictionaries);
    }, []);

    useEffect(() => {
        if (initialText) {
            setInputText(initialText);
            onDataReceived(); // Clear the data in the parent
        }
    }, [initialText, onDataReceived]);
    
    const pendingCount = useMemo(() => suggestions.filter(s => s.status === 'pending').length, [suggestions]);
    const isFileProcessing = useMemo(() => isReviewTextLoading || isSourceTextLoading, [isReviewTextLoading, isSourceTextLoading]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, target: 'review' | 'source') => {
        const file = event.target.files?.[0];
        if (!file) return;

        const setLoading = target === 'review' ? setIsReviewTextLoading : setIsSourceTextLoading;
        const setFileName = target === 'review' ? setReviewFileName : setSourceFileName;
        const setText = target === 'review' ? setInputText : setSourceText;

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

    const handleTask = useCallback(async (task: ReviewTask) => {
        if (!inputText.trim() || isQuotaExhausted) return;
        setIsLoading(true);
        setError('');
        setSuggestions([]);
        setSecurityWarnings([]);
        setEffectivenessReport('');
        setConsistencyReport('');
        
        try {
            if (task === ReviewTask.CHECK_ALL) {
                setLoadingMessage('AI đang phân tích và rà soát văn bản...');
                setView('review');
                const selectedDict = dictionaries.find(d => d.id === selectedDictId);
                const response = await processReviewTask(ReviewTask.CHECK_ALL, inputText, selectedDict, desiredTone || undefined);
                setSuggestions(response);
                setModifiedText(inputText);
                if (response.length === 0) {
                    setError("Không tìm thấy đề xuất nào. Văn bản đã rất tốt!");
                }
            } else if (task === ReviewTask.SENSITIVITY_CHECK) {
                setLoadingMessage('AI đang quét các thông tin nhạy cảm...');
                const warnings = await processSecurityCheck(inputText);
                setSecurityWarnings(warnings);
                 if (warnings.length === 0) {
                    alert("Không phát hiện thông tin nhạy cảm nào.");
                }
            } else if (task === ReviewTask.EVALUATE_EFFECTIVENESS) {
                setLoadingMessage('AI đang đánh giá hiệu quả văn bản...');
                const report = await evaluateEffectiveness(inputText);
                setEffectivenessReport(report);
            }
            onTaskComplete();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra.');
            if (task === ReviewTask.CHECK_ALL) setView('input');
        } finally {
            setIsLoading(false);
        }
    }, [inputText, onTaskComplete, isQuotaExhausted, dictionaries, selectedDictId, desiredTone]);
    
    const handleSourceCheck = useCallback(async () => {
        if (!inputText.trim() || !sourceText.trim() || isQuotaExhausted) return;
        setIsLoading(true);
        setLoadingMessage('AI đang đối chiếu văn bản với nguồn...');
        setError('');
        setEffectivenessReport('');
        setSecurityWarnings([]);
        setConsistencyReport('');
        try {
            const report = await processSourceConsistencyCheck(inputText, sourceText);
            setConsistencyReport(report);
            onTaskComplete();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra khi đối chiếu nguồn.');
        } finally {
            setIsLoading(false);
        }
    }, [inputText, sourceText, onTaskComplete, isQuotaExhausted]);

    const handleAccept = (id: number) => {
        const suggestion = suggestions.find(s => s.id === id);
        if (suggestion) {
            setModifiedText(prev => prev.replace(suggestion.original, suggestion.suggestion));
            setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: 'accepted' } : s));
        }
    };
    
    const handleReject = (id: number) => {
        setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: 'rejected' } : s));
    };

    const handleAcceptAll = () => {
        const pendingSuggestions = suggestions.filter(s => s.status === 'pending');
        if (pendingSuggestions.length === 0) return;

        let newText = modifiedText;
        pendingSuggestions.forEach(suggestion => {
            newText = newText.replace(suggestion.original, suggestion.suggestion);
        });
        setModifiedText(newText);

        setSuggestions(prev => 
            prev.map(s => 
                s.status === 'pending' ? { ...s, status: 'accepted' } : s
            )
        );
    };

    const handleSaveToWorkspace = async () => {
        const contentToSave = modifiedText;
        if (!contentToSave) return;
        
        const projectName = window.prompt("Nhập tên dự án để lưu văn bản đã hoàn thiện:", "");
        if (projectName && projectName.trim()) {
            try {
                await userService.saveResultToWorkspace(projectName.trim(), 'review', contentToSave);
                alert(`Đã lưu kết quả vào dự án "${projectName.trim()}" thành công!`);
            } catch (error) {
                alert("Đã xảy ra lỗi khi lưu vào Không gian làm việc.");
                console.error(error);
            }
        }
    };

    const handleRefine = async () => {
        if (!refineTone || !refineDetailLevel || !modifiedText.trim() || isQuotaExhausted) return;

        setIsRefining(true);
        setError('');
        try {
            const refinedContent = await refineText(modifiedText, refineTone, refineDetailLevel);
            setModifiedText(refinedContent);
            onTaskComplete(); // Count this as one usage
            // Reset dropdowns after use to indicate completion and prevent accidental re-clicks
            setRefineTone('');
            setRefineDetailLevel('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra khi tinh chỉnh văn bản.');
        } finally {
            setIsRefining(false);
        }
    };
    
    const handleReset = () => {
        setInputText('');
        setSourceText('');
        setModifiedText('');
        setSuggestions([]);
        setSecurityWarnings([]);
        setEffectivenessReport('');
        setConsistencyReport('');
        setError('');
        setView('input');
        setReviewFileName('');
        setSourceFileName('');
        setRefineTone('');
        setRefineDetailLevel('');
    };

    const renderContent = () => {
        if (isLoading) {
             return (
                <div className="flex justify-center items-center h-64">
                    <div className="text-center">
                        <div className="w-10 h-10 mx-auto border-4 border-blue-500 rounded-full animate-spin border-t-transparent"></div>
                        <p className="mt-3 text-gray-700">{loadingMessage}</p>
                    </div>
                </div>
            );
        }

        switch(view) {
            case 'review':
                return (
                    <div>
                         <div className="flex justify-between items-center mb-4 sticky top-0 bg-slate-100 py-2 z-10">
                            <h2 className="text-xl font-semibold">Kết quả Rà soát ({pendingCount} đề xuất đang chờ)</h2>
                             <div className="flex items-center gap-4">
                                <Button onClick={handleAcceptAll} variant="secondary" disabled={pendingCount === 0}>
                                    Chấp nhận tất cả
                                </Button>
                                <Button onClick={() => setView('diff')} disabled={pendingCount > 0} >
                                    Hoàn thành & So sánh
                                </Button>
                            </div>
                        </div>
                        {error && <p className="text-center text-gray-600 bg-yellow-100 p-3 rounded-md">{error}</p>}
                        <div className="space-y-4">
                            {suggestions.map(s => (
                                <SuggestionCard key={s.id} suggestion={s} onAccept={handleAccept} onReject={handleReject} />
                            ))}
                        </div>
                    </div>
                );
            
            case 'diff':
                 return (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">So sánh Thay đổi</h2>
                             <div className="flex gap-4">
                                 <Button onClick={handleSaveToWorkspace} variant="secondary" disabled={!modifiedText}>
                                    Lưu vào KGLV
                                </Button>
                                <Button
                                    onClick={() => exportToDocx(modifiedText, 'van_ban_da_hoan_thien.docx')}
                                    disabled={!modifiedText}
                                >
                                    Xuất ra DOCX
                                </Button>
                                <Button onClick={handleReset} variant="secondary">Bắt đầu lại</Button>
                            </div>
                        </div>
                        <DiffViewer originalText={inputText} modifiedText={modifiedText} />
                        <Card className="mt-6" title="Bước 2: Tinh chỉnh Nâng cao (Tùy chọn)">
                            <p className="text-sm text-gray-600 mb-4">
                                Sau khi đã sửa lỗi, bạn có thể yêu cầu AI viết lại toàn bộ văn bản theo giọng điệu và mức độ chi tiết mong muốn.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                <div className="md:col-span-1">
                                    <label htmlFor="refine-tone-select" className="block text-sm font-medium text-gray-700">Giọng điệu</label>
                                    <select
                                        id="refine-tone-select"
                                        className="w-full p-2 border border-gray-300 rounded-md mt-1"
                                        value={refineTone}
                                        onChange={(e) => setRefineTone(e.target.value as ToneStyle | '')}
                                        disabled={isRefining}
                                    >
                                        <option value="">-- Chọn giọng điệu --</option>
                                        {Object.values(ToneStyle).map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="md:col-span-1">
                                    <label htmlFor="refine-detail-level-select" className="block text-sm font-medium text-gray-700">Mức độ chi tiết</label>
                                    <select
                                        id="refine-detail-level-select"
                                        className="w-full p-2 border border-gray-300 rounded-md mt-1"
                                        value={refineDetailLevel}
                                        onChange={(e) => setRefineDetailLevel(e.target.value as DetailLevel | '')}
                                        disabled={isRefining}
                                    >
                                        <option value="">-- Chọn mức độ chi tiết --</option>
                                        {Object.values(DetailLevel).map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="md:col-span-1">
                                    <Button
                                        onClick={handleRefine}
                                        isLoading={isRefining}
                                        disabled={!refineTone || !refineDetailLevel || isQuotaExhausted}
                                    >
                                        Áp dụng Tinh chỉnh
                                    </Button>
                                </div>
                            </div>
                            {isQuotaExhausted && !isRefining && <p className="text-sm text-red-500 mt-2">Hạn mức đã hết. Không thể thực hiện tác vụ.</p>}
                            {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
                        </Card>
                    </div>
                 );

            case 'input':
            default:
                 return (
                     <Card>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2 space-y-6">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label htmlFor="review-input" className="block text-lg font-medium text-gray-700">
                                            Văn bản cần rà soát & hoàn thiện
                                        </label>
                                        <input
                                            type="file"
                                            id="review-file-upload"
                                            className="hidden"
                                            onChange={(e) => handleFileChange(e, 'review')}
                                            accept="image/*,.pdf,.docx,.xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                            disabled={isLoading || isFileProcessing}
                                        />
                                        <label
                                            htmlFor="review-file-upload"
                                            className={`cursor-pointer px-3 py-1 text-sm font-semibold rounded-md transition-colors ${(isLoading || isFileProcessing) ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-slate-500 text-white hover:bg-slate-600'}`}
                                        >
                                            Tải tệp
                                        </label>
                                    </div>
                                    {reviewFileName && <p className="text-sm text-gray-500 mb-2">Tệp đã chọn: {reviewFileName}</p>}
                                    {isReviewTextLoading && <p className="text-sm text-blue-600 animate-pulse mb-2">Đang trích xuất văn bản...</p>}
                                    <textarea
                                        id="review-input"
                                        rows={10}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                        placeholder="Dán văn bản (tự viết hoặc do AI tạo) hoặc tải tệp lên..."
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        disabled={isLoading || isFileProcessing}
                                    ></textarea>
                                </div>
                                 <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label htmlFor="source-input" className="block text-lg font-medium text-gray-700">
                                            Văn bản Gốc/Nguồn để đối chiếu (Tùy chọn)
                                        </label>
                                        <input
                                            type="file"
                                            id="source-file-upload"
                                            className="hidden"
                                            onChange={(e) => handleFileChange(e, 'source')}
                                            accept="image/*,.pdf,.docx,.xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                            disabled={isLoading || isFileProcessing}
                                        />
                                        <label
                                            htmlFor="source-file-upload"
                                            className={`cursor-pointer px-3 py-1 text-sm font-semibold rounded-md transition-colors ${(isLoading || isFileProcessing) ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-slate-500 text-white hover:bg-slate-600'}`}
                                        >
                                            Tải tệp
                                        </label>
                                    </div>
                                    {sourceFileName && <p className="text-sm text-gray-500 mb-2">Tệp đã chọn: {sourceFileName}</p>}
                                    {isSourceTextLoading && <p className="text-sm text-blue-600 animate-pulse mb-2">Đang trích xuất văn bản...</p>}
                                    <textarea
                                        id="source-input"
                                        rows={8}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                        placeholder="Dán văn bản gốc (ví dụ: công văn chỉ đạo) hoặc tải tệp lên để kiểm tra tính nhất quán..."
                                        value={sourceText}
                                        onChange={(e) => setSourceText(e.target.value)}
                                        disabled={isLoading || isFileProcessing}
                                    />
                                </div>
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-lg font-medium text-gray-700 mb-2">
                                    Tùy chọn
                                </label>
                                <div className="space-y-4 p-4 bg-slate-50 rounded-md">
                                    <div>
                                        <label htmlFor="dictionary-select" className="block text-sm font-medium text-gray-600">
                                            Áp dụng Từ điển Nghiệp vụ
                                        </label>
                                        <select
                                            id="dictionary-select"
                                            className="w-full p-2 border border-gray-300 rounded-md mt-1"
                                            value={selectedDictId}
                                            onChange={(e) => setSelectedDictId(e.target.value)}
                                            disabled={isLoading || isFileProcessing}
                                        >
                                            <option value="">Không áp dụng</option>
                                            {dictionaries.map(d => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="tone-select" className="block text-sm font-medium text-gray-600">
                                            Giọng điệu mong muốn
                                        </label>
                                        <select
                                            id="tone-select"
                                            className="w-full p-2 border border-gray-300 rounded-md mt-1"
                                            value={desiredTone}
                                            onChange={(e) => setDesiredTone(e.target.value as ToneStyle | '')}
                                            disabled={isLoading || isFileProcessing}
                                        >
                                            <option value="">Không áp dụng</option>
                                            {Object.values(ToneStyle).map(t => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-6 flex flex-wrap gap-4">
                            <Button 
                                onClick={() => handleTask(ReviewTask.CHECK_ALL)}
                                disabled={!inputText.trim() || isQuotaExhausted || isLoading || isFileProcessing}
                            >
                                Rà soát Toàn diện
                            </Button>
                             <Button 
                                onClick={() => handleTask(ReviewTask.EVALUATE_EFFECTIVENESS)}
                                disabled={!inputText.trim() || isQuotaExhausted || isLoading || isFileProcessing}
                                variant="secondary"
                            >
                                Đánh giá Hiệu quả
                            </Button>
                             <Button 
                                onClick={handleSourceCheck}
                                disabled={!inputText.trim() || !sourceText.trim() || isQuotaExhausted || isLoading || isFileProcessing}
                                variant="secondary"
                            >
                                Đối chiếu Nguồn
                            </Button>
                             <Button 
                                onClick={() => handleTask(ReviewTask.SENSITIVITY_CHECK)}
                                disabled={!inputText.trim() || isQuotaExhausted || isLoading || isFileProcessing}
                                variant="secondary"
                            >
                                Rà soát Bảo mật
                            </Button>
                        </div>
                        {error && <p className="text-sm text-red-500 mt-4">{error}</p>}
                        {isQuotaExhausted && <p className="text-sm text-red-500 mt-4">Hạn mức đã hết. Không thể thực hiện tác vụ.</p>}
                        {consistencyReport && (
                            <div className="mt-6">
                                <AIResponseDisplay title="Báo cáo Đối chiếu Nguồn" content={consistencyReport} isLoading={false} />
                            </div>
                        )}
                         {effectivenessReport && (
                            <div className="mt-6">
                                <AIResponseDisplay title="Báo cáo Đánh giá Hiệu quả" content={effectivenessReport} isLoading={false} />
                            </div>
                        )}
                        {securityWarnings.length > 0 && (
                            <div className="mt-6">
                                <SecurityWarningDisplay warnings={securityWarnings} />
                            </div>
                        )}
                    </Card>
                 );
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Kiểm tra & Chuẩn hóa (Nâng cao)</h1>
            {renderContent()}
        </div>
    );
};

export default ReviewModule;