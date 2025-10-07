import { User, Dictionary, Project, ProjectResultType } from '../types';

// Helper function to hash passwords using the Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

const ACCOUNT_STORAGE_KEY = 'TMTH_ACCOUNT_DATA'; // For user, quota, dictionaries (simulates server DB)
const WORKSPACE_STORAGE_KEY = 'TMTH_WORKSPACE_DATA'; // For projects (local to the machine)

interface AccountData {
    users: User[];
    dictionaries: Dictionary[];
}

let users: User[] = [];
let dictionaries: Dictionary[] = [];
let projects: Project[] = [];
let dbInitialized: Promise<void> | null = null;

function saveAccountState() {
    try {
        const accountData: AccountData = { users, dictionaries };
        localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(accountData));
    } catch (error) {
        console.error("Could not save account state to localStorage", error);
    }
}

function saveWorkspaceState() {
    try {
        localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(projects));
    } catch (error) {
        console.error("Could not save workspace state to localStorage", error);
    }
}

async function initializeDatabase() {
    try {
        // 1. Initialize Account Data (simulates server)
        const storedAccountData = localStorage.getItem(ACCOUNT_STORAGE_KEY);
        if (storedAccountData) {
            const data: AccountData = JSON.parse(storedAccountData);
            users = data.users;
            dictionaries = data.dictionaries;
        } else {
            // First time run: initialize with raw data and save
            const rawUsers = [
              { id: 1, username: 'superadmin', password: 'hungnguyen', role: 'superadmin' as 'superadmin', quota: { used: 0, total: 9999 } },
              { id: 2, username: 'user', password: '123456', role: 'user' as 'user', quota: { used: 15, total: 150 } },
            ];
            
            users = await Promise.all(
              rawUsers.map(async (user) => ({
                ...user,
                password: await hashPassword(user.password),
              }))
            );

            dictionaries = [
                { id: 'llvt', name: 'Lực lượng Vũ trang', content: `\n- CTCT: Công tác chính trị\n- CTĐ: Công tác đảng\n- QS: Quân sự\n- HC: Hậu cần\n- KT: Kỹ thuật\n- TM: Tham mưu\n- BTM: Bộ Tổng Tham mưu\n- TCCT: Tổng cục Chính trị\n- TCHC: Tổng cục Hậu cần\n- TCKT: Tổng cục Kỹ thuật\n- BQP: Bộ Quốc phòng\n` },
                { id: 'cand', name: 'Công an Nhân dân', content: `\n- ANND: An ninh Nhân dân\n- CSND: Cảnh sát Nhân dân\n- BCA: Bộ Công an\n- X01: Văn phòng Bộ Công an\n- C01: Văn phòng Cơ quan Cảnh sát điều tra\n- C02: Cục Cảnh sát hình sự\n- C03: Cục Cảnh sát điều tra tội phạm về tham nhũng, kinh tế, buôn lậu\n- GĐ: Giám đốc\n` }
            ];
            
            saveAccountState();
        }
        
        // 2. Initialize Workspace Data (local to machine)
        const storedProjects = localStorage.getItem(WORKSPACE_STORAGE_KEY);
        if (storedProjects) {
            projects = JSON.parse(storedProjects);
        } else {
            projects = [];
            saveWorkspaceState();
        }

    } catch (error) {
        console.error("Failed to initialize database from localStorage", error);
    }
}

class UserService {
    private async ensureInitialized() {
        if (!dbInitialized) {
            dbInitialized = initializeDatabase();
        }
        await dbInitialized;
    }
    
     async authenticate(username: string, password: string): Promise<User | null> {
        await this.ensureInitialized();
        const user = users.find(u => u.username === username);
        if (user) {
            const hashedPassword = await hashPassword(password);
            if (hashedPassword === user.password) {
                const { password, ...userWithoutPassword } = user;
                return userWithoutPassword;
            }
        }
        return null;
    }
    
    async getAllUsers(): Promise<User[]> {
        await this.ensureInitialized();
        return users.map(({ password, ...user }) => user);
    }

    async updateUser(updatedUser: User): Promise<User> {
        await this.ensureInitialized();
        const index = users.findIndex(u => u.id === updatedUser.id);
        if (index !== -1) {
            users[index] = { ...users[index], ...updatedUser };
            saveAccountState(); // Save account data
            const { password, ...userWithoutPassword } = users[index];
            return userWithoutPassword;
        }
        throw new Error("User not found");
    }

    async changePassword(userId: number, oldPass: string, newPass: string): Promise<boolean> {
        await this.ensureInitialized();
        const user = users.find(u => u.id === userId);
        if (user) {
            const hashedOldPass = await hashPassword(oldPass);
            if (user.password === hashedOldPass) {
                user.password = await hashPassword(newPass);
                saveAccountState(); // Save account data
                return true;
            }
        }
        return false;
    }
    
    async resetPassword(userId: number): Promise<string> {
        await this.ensureInitialized();
        const newPassword = `reset_${Math.random().toString(36).substring(2, 8)}`;
        const user = users.find(u => u.id === userId);
        if(user) {
            user.password = await hashPassword(newPassword);
            saveAccountState(); // Save account data
            return newPassword;
        }
        throw new Error("User not found");
    }
    
    async getDictionaries(): Promise<Dictionary[]> {
        await this.ensureInitialized();
        return [...dictionaries];
    }
    
    async addDictionary(name: string, content: string): Promise<Dictionary> {
        await this.ensureInitialized();
        const newDict: Dictionary = {
            id: name.toLowerCase().replace(/\s+/g, '-') + Date.now(),
            name,
            content,
        };
        dictionaries.push(newDict);
        saveAccountState(); // Save account data
        return newDict;
    }
    
    // --- Project Methods (Workspace Data) ---
    async saveResultToWorkspace(projectName: string, resultType: ProjectResultType, content: string): Promise<Project> {
        await this.ensureInitialized();
        const now = new Date().toISOString();
        let project = projects.find(p => p.name.toLowerCase() === projectName.toLowerCase());

        if (project) {
            // Update existing project
            project.lastModified = now;
            switch (resultType) {
                case 'analysis': project.analysisResult = content; break;
                case 'drafting': project.draftResult = content; break;
                case 'review': project.reviewResult = content; break;
            }
        } else {
            // Create new project
            project = {
                id: `project_${Date.now()}`,
                name: projectName,
                createdAt: now,
                lastModified: now,
            };
            switch (resultType) {
                case 'analysis': project.analysisResult = content; break;
                case 'drafting': project.draftResult = content; break;
                case 'review': project.reviewResult = content; break;
            }
            projects.unshift(project); // Add to the top
        }
        saveWorkspaceState();
        return project;
    }

    async getProjects(): Promise<Project[]> {
        await this.ensureInitialized();
        return [...projects];
    }

    async deleteProject(projectId: string): Promise<void> {
        await this.ensureInitialized();
        projects = projects.filter(p => p.id !== projectId);
        saveWorkspaceState(); // Save workspace data
    }
}

export const userService = new UserService();