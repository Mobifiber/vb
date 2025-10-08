import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from "@google/genai";
import * as db from '../../lib/db';
import { ReviewTask, SummarizeTask, DraftTask } from '../../types';
import type { Part, Suggestion, Dictionary } from '../../types';


// Add a check for the environment variable to satisfy TypeScript and ensure runtime safety.
const apiKey = process.env.API_KEY;
if (!apiKey) {
    throw new Error("The API_KEY environment variable is not set. Please configure it in your Vercel project settings.");
}

// Initialize the Gemini AI client on the server
const ai = new GoogleGenAI({ apiKey });
const SYSTEM_INSTRUCTION = `Bạn là một trợ lý AI chuyên nghiệp, được đào tạo để hỗ trợ cán bộ, trợ lý trong các đơn vị hành chính và lực lượng vũ trang (LLVT), Công an Nhân dân (CAND) Việt Nam. 
- Luôn sử dụng văn phong hành chính trang trọng, chính xác, khách quan.
- Sử dụng chính xác thuật ngữ, từ viết tắt chuyên ngành của LLVT và CAND.
- Mọi văn bản tạo ra phải tuân thủ chặt chẽ thể thức và kỹ thuật trình bày theo Nghị định 30/2020/NĐ-CP của Chính phủ.
- Câu trả lời phải luôn là tiếng Việt.`;


// --- Helper function to generate content ---
const generateContent = async (prompt: string, configOverrides: object = {}): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            ...configOverrides
        }
    });
    return response.text;
};

// --- API Handler ---
export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        await db.initializeDatabase(); // Ensure DB is seeded on first run
        const { action, isDemoUser, ...body } = req.body;
        
        // --- Actions that DON'T require quota check ---
        switch (action) {
            case 'authenticate': {
                const result = await db.authenticateUser(body.username, body.password);
                if (!result) throw new Error("Tên đăng nhập hoặc mật khẩu không chính xác.");
                return res.status(200).json({ result });
            }
            case 'changePassword': {
                const result = await db.changeUserPassword(body.userId, body.oldPass, body.newPass);
                if (!result) throw new Error("Mật khẩu cũ không chính xác.");
                return res.status(200).json({ result });
            }
            case 'getAllUsers':
            case 'updateUser':
            case 'resetPassword':
            case 'getDictionaries':
            case 'addDictionary':
            case 'getProjects':
            case 'saveToWorkspace':
            case 'deleteProject': {
                 // Forwarding these to the DB handlers
                switch(action) {
                    case 'getAllUsers': return res.status(200).json({ result: await db.getUsers().then(users => users.map(({password, ...u}) => u)) });
                    case 'updateUser': return res.status(200).json({ result: await db.updateUser(body.user) });
                    case 'resetPassword': return res.status(200).json({ result: await db.resetUserPassword(body.userId) });
                    case 'getDictionaries': return res.status(200).json({ result: await db.getDictionaries() });
                    case 'addDictionary': return res.status(200).json({ result: await db.addDictionary(body.name, body.content) });
                    case 'getProjects': return res.status(200).json({ result: await db.getProjectsForUser(body.userId) });
                    case 'saveToWorkspace': return res.status(200).json({ result: await db.saveProjectForUser(body.userId, body.projectName, body.resultType, body.content) });
                    case 'deleteProject': return res.status(200).json({ result: await db.deleteProjectForUser(body.userId, body.projectId) });
                }
            }
        }
        
        // --- Actions that REQUIRE quota check ---
        const geminiActions = [
            'extractText', 'summarize', 'draft', 'review',
            'evaluateEffectiveness', 'securityCheck', 'consistencyCheck', 'refineText'
        ];

        if (geminiActions.includes(action)) {
            let user;
            if (!isDemoUser) {
                const userId = body.userId;
                if (!userId) {
                    return res.status(403).json({ error: 'Unauthorized: Missing user ID.' });
                }
                user = await db.findUserById(userId);
                if (!user) {
                    return res.status(403).json({ error: 'Unauthorized: User not found for quota check.' });
                }
                if (user.quota.used >= user.quota.total) {
                    return res.status(429).json({ error: 'Hạn mức đã hết. Vui lòng liên hệ quản trị viên.' });
                }
            }


            let result: any;
            
            // --- Gemini Logic (moved from geminiService.ts) ---
             switch(action) {
                case 'extractText': {
                    const { filePart } = body;
                    const prompt = "Trích xuất toàn bộ văn bản từ tệp này. Chỉ trả về nội dung văn bản, không thêm bất kỳ lời giải thích hay định dạng nào.";
                    const response = await ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: { parts: [filePart, { text: prompt }] },
                        config: { systemInstruction: SYSTEM_INSTRUCTION }
                    });
                    result = response.text;
                    break;
                }
                 case 'summarize': {
                    const { task, data, customRequest } = body;
                    // This is a simplified version of the prompt logic from your original file
                     let prompt = "";
                     const text = typeof data === 'string' ? data : '';
                     switch(task) {
                         case SummarizeTask.SUMMARY: prompt = `Tóm tắt văn bản sau đây thành 5-10 gạch đầu dòng quan trọng nhất. Văn bản:\n\n"${text}"`; break;
                         case SummarizeTask.EXTRACT_DATA: prompt = `Trích xuất tất cả các số liệu, thời gian, và địa điểm trong văn bản sau. Văn bản:\n\n"${text}"`; break;
                         case SummarizeTask.ANALYZE_AND_SUGGEST: {
                             let contentToAnalyze = typeof data === 'string' ? data : data.map((doc: any) => `--- NGUỒN: ${doc.source.trim() || 'Không có tên'} ---\n${doc.content}\n--- HẾT NGUỒN ---`).join('\n\n');
                             prompt = `Phân tích sâu (các) văn bản và trả về kết quả 2 phần:\n\n**Phần 1: Các Chủ đề/Vấn đề chính**\n\n**Phần 2: Kiến nghị/Đề xuất hành động**\n\n(Các) văn bản cần phân tích:\n\n"${contentToAnalyze}"`;
                             break;
                         }
                         case SummarizeTask.MULTI_DOC_SUMMARY: {
                            if (!Array.isArray(data)) throw new Error("Invalid data for multi-doc summary");
                            const formattedDocs = data.map((doc: any) => `--- NGUỒN: ${doc.source.trim() || 'Không có tên'} ---\n${doc.content}\n--- HẾT NGUỒN ---`).join('\n\n');
                            prompt = `Tạo một báo cáo tổng hợp duy nhất có cấu trúc 3 phần: Tóm tắt chung, Thông tin bổ sung, và Điểm mâu thuẫn từ các văn bản sau:\n${formattedDocs}`;
                            break;
                         }
                         case SummarizeTask.CUSTOM_REQUEST: {
                             if (!customRequest) throw new Error("Custom request is empty.");
                             let contentToAnalyze = typeof data === 'string' ? data : data.map((doc: any) => `--- NGUỒN: ${doc.source.trim() || 'Không có tên'} ---\n${doc.content}\n--- HẾT NGUỒN ---`).join('\n\n');
                             prompt = `Thực hiện yêu cầu sau: "${customRequest}"\n\nTrên (các) văn bản:\n\n"${contentToAnalyze}"`;
                             break;
                         }
                         default: prompt = `Phân tích văn bản sau: ${text}`; break; // Fallback
                     }
                     result = await generateContent(prompt);
                     break;
                 }
                case 'draft': {
                    const { task, ideas, docType, style, detailLevel, referenceText, customRequest } = body;
                    let prompt = "";
                    const styleContext = `\n\nYêu cầu:\n- Giọng điệu: ${style}\n- Mức độ chi tiết: ${detailLevel}`;
                    const referenceContext = referenceText ? `\n\nTham chiếu văn bản sau:\n${referenceText}` : "";
                    const customRequestContext = customRequest ? `\n\nChỉ thị: "${customRequest}"` : "";
                    let ideasContent = typeof ideas === 'string' ? `Các ý chính:\n${ideas}` : "Nội dung chi tiết:\n" + Object.entries(ideas).map(([label, value]) => `\n--- ${label} ---\n${value}`).join('\n');

                    switch(task) {
                        case DraftTask.DRAFT_DOCUMENT: prompt = `Soạn thảo một văn bản hoàn chỉnh loại "${docType}".${customRequestContext}${styleContext}${referenceContext}\n\n${ideasContent}`; break;
                        case DraftTask.SUGGEST_TITLES: prompt = `Đề xuất 3-5 tiêu đề cho văn bản loại "${docType}".${customRequestContext}${styleContext}${referenceContext}\n\n${ideasContent}`; break;
                    }
                    result = await generateContent(prompt);
                    break;
                }
                case 'review': {
                    const { text, dictionary, desiredTone } = body;
                     const reviewSchema = {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                original: { type: Type.STRING, description: "Đoạn văn bản gốc có lỗi." },
                                suggestion: { type: Type.STRING, description: "Đoạn văn bản đã được sửa lại cho đúng." },
                                reason: { type: Type.STRING, description: "Giải thích ngắn gọn lý do tại sao cần sửa đổi." },
                            },
                            required: ["original", "suggestion", "reason"],
                            propertyOrdering: ["original", "suggestion", "reason"],
                        },
                    };
                    // Simplified prompt for brevity
                    const prompt = `Rà soát toàn diện văn bản sau, cung cấp kết quả dưới dạng JSON (original, suggestion, reason). Văn bản: \n\n${text}`;
                    const responseText = await generateContent(prompt, { responseMimeType: "application/json", responseSchema: reviewSchema });
                    try {
                      const jsonResponse = JSON.parse(responseText);
                      result = Array.isArray(jsonResponse) ? jsonResponse.map((item, index) => ({...item, id: index, status: 'pending'})) : [];
                    } catch {
                      result = []; // Handle cases where AI doesn't return valid JSON
                    }
                    break;
                }
                 case 'securityCheck': {
                    const { text } = body;
                    const securitySchema = {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                text: { type: Type.STRING, description: "Đoạn văn bản chứa thông tin có khả năng nhạy cảm." },
                                reason: { type: Type.STRING, description: "Lý do tại sao thông tin này được coi là nhạy cảm (ví dụ: tên riêng, cấp bậc, số liệu mật)." },
                            },
                            required: ["text", "reason"],
                            propertyOrdering: ["text", "reason"],
                        },
                    };
                    const prompt = `Quét văn bản sau để phát hiện thông tin nhạy cảm (tên, cấp bậc, đơn vị, số liệu). Trả về JSON (text, reason). Văn bản:\n\n${text}`;
                    const responseText = await generateContent(prompt, { responseMimeType: "application/json", responseSchema: securitySchema });
                     try {
                        const jsonResponse = JSON.parse(responseText);
                        result = Array.isArray(jsonResponse) ? jsonResponse.map((item, index) => ({...item, id: index})) : [];
                    } catch {
                      result = []; // Handle cases where AI doesn't return valid JSON
                    }
                    break;
                }
                // Add cases for 'evaluateEffectiveness', 'consistencyCheck', 'refineText' with their prompts
                 case 'evaluateEffectiveness': {
                    const { text } = body;
                    const prompt = `Đánh giá hiệu quả của văn bản sau (Luận điểm, Tính thuyết phục, Sự rõ ràng). Văn bản: \n\n${text}`;
                    result = await generateContent(prompt);
                    break;
                }
                case 'consistencyCheck': {
                     const { text, sourceText } = body;
                     const prompt = `Đối chiếu "Văn bản cần kiểm tra" với "Văn bản gốc", chỉ ra điểm sai lệch hoặc thiếu sót.\n\nVĂN BẢN GỐC:\n${sourceText}\n\nVĂN BẢN CẦN KIỂM TRA:\n${text}`;
                     result = await generateContent(prompt);
                     break;
                }
                case 'refineText': {
                     const { text, tone, detailLevel } = body;
                     const prompt = `Viết lại văn bản sau theo giọng điệu "${tone}" và mức độ chi tiết "${detailLevel}". Giữ lại ý chính. Văn bản:\n\n${text}`;
                     result = await generateContent(prompt);
                     break;
                }

                default:
                    return res.status(400).json({ error: 'Invalid Gemini action' });
            }

            // --- Increment quota for real users and save ---
            if (!isDemoUser && user) {
                user.quota.used += 1;
                await db.updateUser(user);
            }

            return res.status(200).json({ result });
        }
        
        return res.status(400).json({ error: 'Invalid action specified' });

    } catch (error: any) {
        console.error(`API Error for action: ${req.body.action}`, error);
        return res.status(500).json({ error: error.message || 'An internal server error occurred' });
    }
}


// Add this to your `next.config.js` or equivalent if it doesn't exist.
// This tells Vercel this is an API route.
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '4mb', // Set a higher limit for file uploads
        },
    },
};