import { User, Dictionary, Project, ProjectResultType, IUserService } from '../types';

const DEMO_USER_KEY = 'tmth_demo_user';
const DICTIONARIES_KEY = 'tmth_demo_dictionaries';
const PROJECTS_KEY = 'tmth_demo_projects';

// Helper to get data from localStorage
const getFromStorage = <T>(key: string, defaultValue: T): T => {
    try {
        if (typeof window === 'undefined' || !window.localStorage) {
            return defaultValue;
        }
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error(`Error reading from localStorage key “${key}”:`, error);
        return defaultValue;
    }
};

// Helper to set data to localStorage
const setInStorage = (key: string, value: any) => {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(key, JSON.stringify(value));
        }
    } catch (error) {
        console.error(`Error writing to localStorage key “${key}”:`, error);
    }
};


class DemoUserService implements IUserService {
    private initializeDemoData() {
        if (!localStorage.getItem(DEMO_USER_KEY)) {
             const demoUser: User = {
                id: 99,
                username: 'demo',
                password: 'demo', // Plain text for demo purposes
                role: 'user',
                quota: {
                    used: 0,
                    total: 50,
                },
            };
            setInStorage(DEMO_USER_KEY, demoUser);
        }
        if (!localStorage.getItem(DICTIONARIES_KEY)) {
             const dictionaries: Dictionary[] = [
                { id: 'llvt-demo', name: 'LLVT (Demo)', content: `- CTCT: Công tác chính trị\n- QS: Quân sự` },
                { id: 'cand-demo', name: 'CAND (Demo)', content: `- ANND: An ninh Nhân dân\n- CSND: Cảnh sát Nhân dân` }
            ];
            setInStorage(DICTIONARIES_KEY, dictionaries);
        }
        if (!localStorage.getItem(PROJECTS_KEY)) {
            setInStorage(PROJECTS_KEY, []);
        }
    }

    constructor() {
        this.initializeDemoData();
    }
    
    private getDemoUser(): User {
        return getFromStorage<User>(DEMO_USER_KEY, null!);
    }
    
    private saveDemoUser(user: User) {
        setInStorage(DEMO_USER_KEY, user);
    }

    async authenticate(username: string, password: string): Promise<User | null> {
        if (username.toLowerCase() === 'demo' && password === 'demo') {
            return this.getDemoUser();
        }
        return null;
    }
    
    // Admin functions are mostly no-ops in demo mode
    async getAllUsers(): Promise<User[]> {
        return Promise.resolve([this.getDemoUser()]);
    }

    async updateUser(updatedUser: User): Promise<User> {
         if (updatedUser.id === this.getDemoUser().id) {
             this.saveDemoUser(updatedUser);
             return updatedUser;
         }
         throw new Error("Cannot update other users in demo mode.");
    }

    async changePassword(userId: number, oldPass: string, newPass: string): Promise<boolean> {
        if (userId === this.getDemoUser().id && oldPass === 'demo') {
            alert("Đổi mật khẩu không được hỗ trợ trong chế độ dùng thử.");
            return false;
        }
        return false;
    }
    
    async resetPassword(userId: number): Promise<string> {
        throw new Error("Not supported in demo mode.");
    }
    
    async getDictionaries(): Promise<Dictionary[]> {
        return getFromStorage<Dictionary[]>(DICTIONARIES_KEY, []);
    }
    
    async addDictionary(name: string, content: string): Promise<Dictionary> {
         const dictionaries = await this.getDictionaries();
         const newDict: Dictionary = {
            id: `demo_${Date.now()}`,
            name,
            content
         };
         dictionaries.push(newDict);
         setInStorage(DICTIONARIES_KEY, dictionaries);
         return newDict;
    }
    
    async saveResultToWorkspace(userId: number, projectName: string, resultType: ProjectResultType, content: string): Promise<Project> {
        if (userId !== this.getDemoUser().id) throw new Error("Invalid user for demo mode.");
        const projects = await this.getProjects(userId);
        const now = new Date().toISOString();
        let project = projects.find(p => p.name.toLowerCase() === projectName.toLowerCase());

        if (project) {
            project.lastModified = now;
        } else {
            project = {
                id: `project_demo_${Date.now()}`,
                name: projectName,
                createdAt: now,
                lastModified: now,
            };
            projects.unshift(project);
        }
        
        switch (resultType) {
            case 'analysis': project.analysisResult = content; break;
            case 'drafting': project.draftResult = content; break;
            case 'review': project.reviewResult = content; break;
        }

        setInStorage(PROJECTS_KEY, projects);
        return project;
    }

    async getProjects(userId: number): Promise<Project[]> {
        if (userId !== this.getDemoUser().id) return [];
        return getFromStorage<Project[]>(PROJECTS_KEY, []);
    }

    async deleteProject(userId: number, projectId: string): Promise<void> {
        if (userId !== this.getDemoUser().id) return;
        let projects = await this.getProjects(userId);
        projects = projects.filter(p => p.id !== projectId);
        setInStorage(PROJECTS_KEY, projects);
    }
    
    // This is a special method for demo mode to increment quota
    async incrementUsage(): Promise<User> {
        const user = this.getDemoUser();
        if (user.quota.used < user.quota.total) {
            user.quota.used += 1;
            this.saveDemoUser(user);
        }
        return user;
    }
}

export const demoUserService = new DemoUserService();