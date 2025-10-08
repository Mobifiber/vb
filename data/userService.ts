import { User, Dictionary, Project, ProjectResultType } from '../types';

async function callApi<T>(body: object): Promise<T> {
    const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API call failed');
    }
    
    const data = await response.json();
    return data.result;
}


class UserService {
     async authenticate(username: string, password: string): Promise<User | null> {
        try {
            return await callApi<User>({ action: 'authenticate', username, password });
        } catch (error) {
            console.error(error);
            return null;
        }
    }
    
    async getAllUsers(): Promise<User[]> {
        return callApi<User[]>({ action: 'getAllUsers' });
    }

    async updateUser(updatedUser: User): Promise<User> {
        return callApi<User>({ action: 'updateUser', user: updatedUser });
    }

    async changePassword(userId: number, oldPass: string, newPass: string): Promise<boolean> {
        try {
            return await callApi<boolean>({ action: 'changePassword', userId, oldPass, newPass });
        } catch (error) {
            console.error(error);
            return false;
        }
    }
    
    async resetPassword(userId: number): Promise<string> {
        return callApi<string>({ action: 'resetPassword', userId });
    }
    
    async getDictionaries(): Promise<Dictionary[]> {
        return callApi<Dictionary[]>({ action: 'getDictionaries' });
    }
    
    async addDictionary(name: string, content: string): Promise<Dictionary> {
        return callApi<Dictionary>({ action: 'addDictionary', name, content });
    }
    
    async saveResultToWorkspace(userId: number, projectName: string, resultType: ProjectResultType, content: string): Promise<Project> {
         return callApi<Project>({ action: 'saveToWorkspace', userId, projectName, resultType, content });
    }

    async getProjects(userId: number): Promise<Project[]> {
        return callApi<Project[]>({ action: 'getProjects', userId });
    }

    async deleteProject(userId: number, projectId: string): Promise<void> {
        return callApi<void>({ action: 'deleteProject', userId, projectId });
    }
}

export const userService = new UserService();