// Fix: Add Part interface for handling file data for Gemini API.
export interface Part {
    inlineData?: {
        mimeType: string;
        data: string;
    };
    text?: string;
}

export enum Module {
  Dashboard = 'Dashboard',
  Workspace = 'Không gian Làm việc',
  Summarize = 'Phân tích Văn bản',
  Drafting = 'Soạn thảo Tham mưu',
  Review = 'Kiểm tra & Chuẩn hóa',
  Admin = 'Quản trị Viên',
}

export interface User {
  id: number;
  username: string;
  password?: string; // Made optional for security when passing user object around
  role: 'user' | 'superadmin';
  quota: {
    total: number;
    used: number;
  };
}

export enum SummarizeTask {
    SUMMARY = "Tóm tắt Báo cáo",
    EXTRACT_DATA = "Trích xuất Số liệu",
    DETECT_ISSUES = "Phát hiện Vấn đề",
    ANALYZE_DATA = "Phân tích Dữ liệu",
    ANALYZE_AND_SUGGEST = "Phân tích và Đề xuất",
    MULTI_DOC_SUMMARY = "Tổng hợp Liên văn bản",
    CUSTOM_REQUEST = "Yêu cầu Tùy chỉnh"
}

export interface MultiDocumentInput {
  id: number;
  source: string;
  content: string;
  fileName?: string;
}

export enum DraftTask {
    DRAFT_DOCUMENT = "Soạn thảo Toàn văn",
    SUGGEST_TITLES = "Đề xuất Tiêu đề"
}

export enum ToneStyle {
    NEUTRAL = "Trung lập",
    PERSUASIVE = "Thuyết phục",
    ASSERTIVE = "Quyết đoán",
    FLEXIBLE = "Mềm mỏng",
    ENCOURAGING = "Khích lệ - Động viên",
}

export enum DetailLevel {
    CONCISE = "Ngắn gọn - Súc tích",
    DETAILED = "Chi tiết - Diễn giải",
}

export enum ReviewTask {
    CHECK_ALL = "Rà soát Toàn diện",
    SENSITIVITY_CHECK = "Rà soát Bảo mật",
    EVALUATE_EFFECTIVENESS = "Đánh giá Hiệu quả",
    SOURCE_CONSISTENCY_CHECK = "Đối chiếu Nguồn",
}

export interface Suggestion {
    id: number;
    original: string;
    suggestion: string;
    reason: string;
    status: 'pending' | 'accepted' | 'rejected';
}

export interface SecurityWarning {
    id: number;
    text: string;
    reason: string;
}

export interface DraftTemplateField {
    id: string;
    label: string;
    placeholder: string;
}

export interface Dictionary {
    id: string;
    name: string;
    content: string;
}

export const DOCUMENT_TYPES = [
    "Báo cáo đề xuất",
    "Kế hoạch triển khai",
    "Công văn",
    "Tờ trình",
    "Báo cáo tổng hợp",
    "Nghị quyết",
    "Mệnh lệnh",
    "Văn bản góp ý",
    "Yêu cầu soạn thảo khác...",
];

// --- Workspace Project Structure ---
export type ProjectResultType = 'analysis' | 'drafting' | 'review';

export interface Project {
    id: string;
    name: string;
    createdAt: string;
    lastModified: string;
    analysisResult?: string;
    draftResult?: string;
    reviewResult?: string;
}

// --- Service Interface ---
export interface IUserService {
    authenticate(username: string, password: string): Promise<User | null>;
    getAllUsers(): Promise<User[]>;
    updateUser(updatedUser: User): Promise<User>;
    changePassword(userId: number, oldPass: string, newPass: string): Promise<boolean>;
    resetPassword(userId: number): Promise<string>;
    getDictionaries(): Promise<Dictionary[]>;
    addDictionary(name: string, content: string): Promise<Dictionary>;
    saveResultToWorkspace(userId: number, projectName: string, resultType: ProjectResultType, content: string): Promise<Project>;
    getProjects(userId: number): Promise<Project[]>;
    deleteProject(userId: number, projectId: string): Promise<void>;
    // This method is specific to the demo service for local quota management
    incrementUsage?(): Promise<User>;
}