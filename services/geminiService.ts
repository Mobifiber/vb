import { GoogleGenAI, Type, Part } from "@google/genai";
import { SummarizeTask, DraftTask, ReviewTask, Suggestion, ToneStyle, DetailLevel, SecurityWarning, Dictionary, MultiDocumentInput } from '../types';

const API_KEY = import.meta.env.VITE_API_KEY;

if (!API_KEY) {
  console.warn("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const SYSTEM_INSTRUCTION = `Bạn là một trợ lý AI chuyên nghiệp, được đào tạo để hỗ trợ cán bộ, trợ lý trong các đơn vị hành chính và lực lượng vũ trang (LLVT), Công an Nhân dân (CAND) Việt Nam. 
- Luôn sử dụng văn phong hành chính trang trọng, chính xác, khách quan.
- Sử dụng chính xác thuật ngữ, từ viết tắt chuyên ngành của LLVT và CAND.
- Mọi văn bản tạo ra phải tuân thủ chặt chẽ thể thức và kỹ thuật trình bày theo Nghị định 30/2020/NĐ-CP của Chính phủ.
- Câu trả lời phải luôn là tiếng Việt.`;

const generateContent = async (prompt: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        return "Đã xảy ra lỗi khi kết nối với dịch vụ AI. Vui lòng thử lại sau.";
    }
};

export const extractTextFromFile = async (filePart: Part): Promise<string> => {
    const prompt = "Trích xuất toàn bộ văn bản từ tệp này. Chỉ trả về nội dung văn bản, không thêm bất kỳ lời giải thích hay định dạng nào.";
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [filePart, { text: prompt }] },
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error calling Gemini API for file extraction:", error);
        return "Đã xảy ra lỗi khi trích xuất văn bản từ tệp.";
    }
};

export const processSummarizeTask = async (task: SummarizeTask, data: string | MultiDocumentInput[], customRequest?: string): Promise<string> => {
    let prompt = "";
    const text = typeof data === 'string' ? data : '';

    switch(task) {
        case SummarizeTask.SUMMARY:
            prompt = `Tóm tắt văn bản sau đây thành 5-10 gạch đầu dòng quan trọng nhất, tập trung vào các sự kiện, kết quả, và vấn đề chính. Văn bản:\n\n"${text}"`;
            break;
        case SummarizeTask.EXTRACT_DATA:
            prompt = `Trích xuất tất cả các số liệu cụ thể (ví dụ: số lượng, phần trăm), các mốc thời gian (ngày, tháng, năm), và địa điểm được đề cập trong văn bản sau. Liệt kê chúng một cách rõ ràng theo từng danh mục. Văn bản:\n\n"${text}"`;
            break;
        case SummarizeTask.DETECT_ISSUES:
            prompt = `Phân tích và chỉ ra các vấn đề nổi cộm, các cụm từ mang tính cấp bách, tiêu cực hoặc các vấn đề cần giải quyết ngay lập tức trong văn bản sau. Trình bày dưới dạng danh sách. Văn bản:\n\n"${text}"`;
            break;
        case SummarizeTask.ANALYZE_DATA:
            prompt = `Thực hiện phân tích sâu dữ liệu trong văn bản/số liệu sau. Nhiệm vụ của bạn là:
1. Xác định các xu hướng chính, các quy luật hoặc điểm bất thường.
2. Chỉ ra những số liệu, thông tin quan trọng và có ý nghĩa nhất.
3. Đưa ra các kết luận hoặc nhận định tổng quan dựa trên phân tích.
Trình bày kết quả một cách có cấu trúc, rõ ràng, dễ hiểu. Dữ liệu:\n\n"${text}"`;
            break;
        case SummarizeTask.ANALYZE_AND_SUGGEST: {
            let contentToAnalyze = '';
            if (typeof data === 'string') {
                contentToAnalyze = data;
            } else if (Array.isArray(data)) {
                contentToAnalyze = data.map(doc => `--- NGUỒN: ${doc.source.trim() || 'Không có tên'} ---\n${doc.content}\n--- HẾT NGUỒN ---`).join('\n\n');
            }

            prompt = `Bạn là một chuyên gia tham mưu tổng hợp dày dặn kinh nghiệm. Hãy phân tích sâu (các) văn bản dưới đây và trả về kết quả có cấu trúc 2 phần rõ ràng:

**Phần 1: Các Chủ đề/Vấn đề chính**
- Thay vì chỉ tóm tắt, hãy nhóm các thông tin và xác định các chủ đề, vấn đề trọng tâm được đề cập (ví dụ: "Công tác huấn luyện", "Tình hình vật tư", "Vấn đề chấp hành kỷ luật").

**Phần 2: Kiến nghị/Đề xuất hành động**
- Dựa trên các vấn đề đã phân tích ở trên, hãy chủ động đưa ra 2-3 gợi ý hành động cụ thể, khả thi, theo đúng văn phong tham mưu.
- Mỗi đề xuất phải giải quyết một vấn đề đã xác định. (Ví dụ: Vấn đề: "Tỷ lệ hỏng hóc vật tư cao." -> Kiến nghị: "Thành lập đoàn kiểm tra, đánh giá lại chất lượng và quy trình bảo quản vật tư tại các đơn vị.").

(Các) văn bản cần phân tích:
\n\n"${contentToAnalyze}"`;
            break;
        }
        case SummarizeTask.MULTI_DOC_SUMMARY:
            if (!Array.isArray(data)) return "Dữ liệu đầu vào cho tác vụ 'Tổng hợp Liên văn bản' không hợp lệ.";
            
            const formattedDocs = data.map(doc => `--- NGUỒN: ${doc.source.trim() || 'Không có tên'} ---\n${doc.content}\n--- HẾT NGUỒN ---`).join('\n\n');
            
            prompt = `Bạn là một chuyên gia tổng hợp thông tin. Phân tích các văn bản từ nhiều nguồn được cung cấp dưới đây.
Nhiệm vụ của bạn là tạo ra một báo cáo tổng hợp duy nhất có cấu trúc 3 phần rõ ràng:

**Phần 1: Tóm tắt Tình hình chung**
Tổng hợp các thông tin cốt lõi, trùng khớp, có tính hệ thống từ tất cả các nguồn.

**Phần 2: Các thông tin bổ sung, đáng chú ý**
Liệt kê các chi tiết, dữ liệu quan trọng chỉ xuất hiện ở một hoặc một vài nguồn mà không có ở các nguồn khác.

**Phần 3: Các điểm Mâu thuẫn hoặc Khác biệt**
Đây là phần quan trọng nhất. So sánh kỹ lưỡng và chỉ ra các điểm không nhất quán, các số liệu sai lệch, hoặc các thông tin trái ngược nhau giữa các báo cáo. Ghi rõ mâu thuẫn đến từ nguồn nào (ví dụ: "Cảnh báo: Số liệu về quân số ở báo cáo của Đơn vị A là 500, trong khi của Đơn vị B là 450").

Dưới đây là các văn bản cần phân tích:
${formattedDocs}`;
            break;
        case SummarizeTask.CUSTOM_REQUEST: {
            if (!customRequest) return "Vui lòng nhập yêu cầu tùy chỉnh.";
            let contentToAnalyze = '';
            if (typeof data === 'string') {
                contentToAnalyze = data;
            } else if (Array.isArray(data)) {
                contentToAnalyze = data.map(doc => `--- NGUỒN: ${doc.source.trim() || 'Không có tên'} ---\n${doc.content}\n--- HẾT NGUỒN ---`).join('\n\n');
            }
            prompt = `Thực hiện yêu cầu sau đây trên (các) văn bản được cung cấp.
Yêu cầu của người dùng: "${customRequest}"

(Các) văn bản cần phân tích:
\n\n"${contentToAnalyze}"`;
            break;
        }
    }
    return generateContent(prompt);
};

export const processDraftTask = async (
    task: DraftTask, 
    ideas: string | Record<string, string>, 
    docType: string, 
    style: ToneStyle, 
    detailLevel: DetailLevel,
    referenceText?: string,
    customRequest?: string
): Promise<string> => {
    let prompt = "";
    const styleContext = `\n\nYêu cầu bổ sung:\n- Giọng điệu: ${style}\n- Mức độ chi tiết: ${detailLevel}`;
    const referenceContext = referenceText ? `\n\nBối cảnh tham chiếu (quan trọng): Đảm bảo nội dung và thuật ngữ trong văn bản mới phải nhất quán và phù hợp với văn bản tham chiếu sau đây:\n---VĂN BẢN THAM CHIẾU---\n${referenceText}\n---HẾT VĂN BẢN THAM CHIẾU---` : "";
    const customRequestContext = customRequest ? `\n\nChỉ thị soạn thảo cụ thể của người dùng: "${customRequest}"` : "";
    
    let ideasContent = "";
    if (typeof ideas === 'string') {
        ideasContent = `Các ý chính:\n${ideas}`;
    } else {
        ideasContent = "Nội dung chi tiết theo từng đề mục chuẩn của mẫu:\n" + Object.entries(ideas)
            .map(([label, value]) => `\n--- ${label} ---\n${value}`)
            .join('\n');
    }

    switch(task) {
        case DraftTask.DRAFT_DOCUMENT:
            prompt = `Dựa trên các nội dung sau đây và chọn loại văn bản là "${docType}", hãy soạn thảo một văn bản hoàn chỉnh. Văn bản phải có cấu trúc chặt chẽ, luận điểm rõ ràng, và sử dụng thuật ngữ chuyên ngành phù hợp với văn phong hành chính - quân đội Việt Nam.${customRequestContext}${styleContext}${referenceContext}\n\n${ideasContent}`;
            break;
        case DraftTask.SUGGEST_TITLES:
            prompt = `Dựa trên nội dung sau, hãy đề xuất 3-5 tiêu đề (trích yếu) phù hợp, trang trọng cho một văn bản loại "${docType}".${customRequestContext}${styleContext}${referenceContext}\n\n${ideasContent}`;
            break;
    }
    return generateContent(prompt);
};

export const processReviewTask = async (task: ReviewTask, text: string, dictionary?: Dictionary, desiredTone?: ToneStyle): Promise<Suggestion[]> => {
    const reviewSchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                original: {
                    type: Type.STRING,
                    description: 'Đoạn văn bản gốc có lỗi hoặc cần cải thiện. Phải trích xuất chính xác từ văn bản gốc.'
                },
                suggestion: {
                    type: Type.STRING,
                    description: 'Đoạn văn bản đã được sửa lỗi hoặc viết lại tốt hơn.'
                },
                reason: {
                    type: Type.STRING,
                    description: 'Giải thích ngắn gọn lý do cho sự thay đổi (ví dụ: "Lỗi chính tả", "Lỗi lặp từ", "Thuật ngữ này chính xác hơn", "Câu văn tối nghĩa", "Hành văn logic hơn", "Tinh chỉnh giọng điệu").'
                },
            },
            required: ["original", "suggestion", "reason"],
        },
    };
    
    const dictionaryContext = dictionary ? `\n\nQuan trọng: Đối chiếu và ưu tiên sử dụng các thuật ngữ, từ viết tắt có trong "Từ điển Nghiệp vụ: ${dictionary.name}" sau đây:\n---TỪ ĐIỂN---\n${dictionary.content}\n---HẾT TỪ ĐIỂN---` : "";
    const toneContext = desiredTone ? `\n\nNhiệm vụ bổ sung (quan trọng): So sánh giọng điệu thực tế của văn bản với giọng điệu mong muốn là "${desiredTone}". Phân tích và đề xuất tinh chỉnh những câu chữ, cách diễn đạt chưa phù hợp để văn bản truyền tải chính xác sắc thái này. Lý do cho các đề xuất này phải ghi rõ là "Tinh chỉnh giọng điệu".` : "";

    const prompt = `Hãy thực hiện rà soát toàn diện văn bản sau đây.
Nhiệm vụ của bạn là:
1.  Phát hiện và sửa tất cả các lỗi chính tả, ngữ pháp.
2.  Phân tích và đề xuất thay thế các thuật ngữ nghiệp vụ chưa phù hợp hoặc có thể dùng từ "đắt giá" hơn.
3.  Kiểm tra tính hợp lý, logic trong cách hành văn và viết lại những câu văn tối nghĩa, khó hiểu.
4.  Cung cấp kết quả dưới dạng một mảng JSON tuân thủ schema đã cho. Mỗi phần tử trong mảng là một đề xuất chỉnh sửa.${dictionaryContext}${toneContext}

Văn bản cần rà soát:
---
${text}
---`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
                responseSchema: reviewSchema
            }
        });

        const jsonResponse = JSON.parse(response.text);
        if (Array.isArray(jsonResponse)) {
            return jsonResponse.map((item, index) => ({
                ...item,
                id: index,
                status: 'pending'
            }));
        }
        return [];
    } catch (error) {
        console.error("Error parsing review response from Gemini API:", error);
        throw new Error("AI đã trả về kết quả không hợp lệ hoặc đã xảy ra lỗi. Vui lòng thử lại.");
    }
};

export const evaluateEffectiveness = async (text: string): Promise<string> => {
    const prompt = `Với vai trò là một chuyên gia tham mưu cấp cao, hãy phân tích và đánh giá hiệu quả của văn bản dưới đây.
KHÔNG sửa lỗi chính tả hay ngữ pháp. Thay vào đó, hãy trả về một báo cáo phân tích ngắn gọn, có cấu trúc 3 phần rõ ràng:

**1. Luận điểm chính:**
- Rút ra luận điểm, thông điệp cốt lõi mà văn bản đang cố gắng truyền tải.
- Nhận xét xem luận điểm có được thể hiện rõ ràng và nhất quán không. (Nếu không rút ra được, hãy nêu rõ văn bản bị dàn trải, thiếu tập trung).

**2. Tính Thuyết phục:**
- Đánh giá mức độ thuyết phục của các lập luận, số liệu, dẫn chứng được đưa ra.
- Chỉ ra cụ thể những đoạn lập luận còn yếu, thiếu cơ sở, hoặc mang tính chủ quan.

**3. Sự Rõ ràng & Mạch lạc:**
- Đánh giá cấu trúc tổng thể, logic và dòng chảy của văn bản.
- Cảnh báo những đoạn văn sắp xếp thiếu logic, chuyển ý đột ngột hoặc sử dụng câu từ gây khó hiểu, tối nghĩa.

Văn bản cần đánh giá:
---
${text}
---`;
    return generateContent(prompt);
};

export const processSecurityCheck = async (text: string): Promise<SecurityWarning[]> => {
    const securitySchema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                text: {
                    type: Type.STRING,
                    description: "Trích đoạn văn bản chứa thông tin có khả năng nhạy cảm."
                },
                reason: {
                    type: Type.STRING,
                    description: "Giải thích ngắn gọn tại sao thông tin này có thể nhạy cảm (ví dụ: 'Chứa tên riêng và cấp bậc', 'Là phiên hiệu đơn vị', 'Là số liệu thống kê cụ thể')."
                }
            },
            required: ["text", "reason"],
        }
    };

    const prompt = `Với vai trò là một chuyên gia an ninh thông tin, hãy quét văn bản sau để phát hiện các thông tin có khả năng nhạy cảm hoặc bí mật nhà nước.
Các loại thông tin cần tìm:
- Tên người đi kèm cấp bậc, chức vụ.
- Phiên hiệu đơn vị (ví dụ: Trung đoàn X, Tiểu đoàn Y, Đại đội Z).
- Các địa danh, tọa độ cụ thể không phổ biến.
- Các số liệu thống kê chi tiết về quân số, trang bị, ngân sách.

Kết quả phải trả về dưới dạng một mảng JSON tuân thủ schema. Chỉ cảnh báo, không sửa đổi văn bản. Nếu không có gì, trả về mảng rỗng.

Văn bản cần rà soát:
---
${text}
---`;
     try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
                responseSchema: securitySchema
            }
        });

        const jsonResponse = JSON.parse(response.text);
        if (Array.isArray(jsonResponse)) {
            return jsonResponse.map((item, index) => ({
                ...item,
                id: index,
            }));
        }
        return [];
    } catch (error) {
        console.error("Error parsing security check response from Gemini API:", error);
        throw new Error("AI đã trả về kết quả không hợp lệ hoặc đã xảy ra lỗi. Vui lòng thử lại.");
    }
}

export const processSourceConsistencyCheck = async (text: string, sourceText: string): Promise<string> => {
    const prompt = `Với vai trò là một chuyên gia kiểm duyệt chéo, hãy thực hiện đối chiếu giữa "Văn bản cần kiểm tra" và "Văn bản gốc".
Nhiệm vụ của bạn là:
1.  **Xác minh tính chính xác:** Phân tích xem "Văn bản cần kiểm tra" có diễn giải, báo cáo lại một cách chính xác và trung thành với nội dung của "Văn bản gốc" hay không. Chỉ ra bất kỳ điểm nào bị diễn giải sai lệch.
2.  **Phát hiện thiếu sót (quan trọng nhất):** Rà soát và cảnh báo nếu có bất kỳ mệnh lệnh, yêu cầu, số liệu, hoặc chi tiết quan trọng nào từ "Văn bản gốc" đã bị bỏ sót trong "Văn bản cần kiểm tra".
3.  Trả về một báo cáo phân tích ngắn gọn, rõ ràng. Nếu không có vấn đề gì, hãy xác nhận rằng văn bản đã tuân thủ tốt.

---VĂN BẢN GỐC---
${sourceText}
---HẾT VĂN BẢN GỐC---

---VĂN BẢN CẦN KIỂM TRA---
${text}
---HẾT VĂN BẢN CẦN KIỂM TRA---
`;
    return generateContent(prompt);
};

export const refineText = async (text: string, tone: ToneStyle, detailLevel: DetailLevel): Promise<string> => {
    const prompt = `Với vai trò là một biên tập viên chuyên nghiệp, hãy viết lại toàn bộ văn bản sau đây để đáp ứng các yêu cầu về giọng điệu và mức độ chi tiết được chỉ định.
- Giọng điệu mong muốn: "${tone}"
- Mức độ chi tiết mong muốn: "${detailLevel}"

Lưu ý quan trọng:
- Phải giữ lại toàn bộ ý chính, thông điệp cốt lõi và các số liệu quan trọng của văn bản gốc.
- Chỉ trả về duy nhất văn bản đã được viết lại, không thêm bất kỳ lời giải thích, tiêu đề hay định dạng nào khác.

--- VĂN BẢN GỐC CẦN TINH CHỈNH ---
${text}
--- HẾT VĂN BẢN GỐC ---`;

    return generateContent(prompt);
};