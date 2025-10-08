import { kv } from '@vercel/kv';
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

const DB_KEYS = {
    USERS: 'tmth_users',
    DICTIONARIES: 'tmth_dictionaries',
    PROJECTS_BY_USER: (userId: number) => `tmth_projects_user_${userId}`,
};

// --- Database Initialization and Management ---

export async function initializeDatabase() {
    const usersExist = await kv.exists(DB_KEYS.USERS);
    if (!usersExist) {
        console.log("Initializing database with default users and dictionaries...");
        const rawUsers = [
          { id: 1, username: 'superadmin', password: 'hungnguyen', role: 'superadmin' as 'superadmin', quota: { used: 0, total: 9999 } },
          { id: 2, username: 'user', password: '123456', role: 'user' as 'user', quota: { used: 15, total: 150 } },
        ];
        
        const users = await Promise.all(
          rawUsers.map(async (user) => ({
            ...user,
            password: await hashPassword(user.password),
          }))
        );

        const dictionaries = [
            { id: 'llvt', name: 'Lực lượng Vũ trang', content: `\n- CTCT: Công tác chính trị\n- CTĐ: Công tác đảng\n- QS: Quân sự\n- HC: Hậu cần\n- KT: Kỹ thuật\n- TM: Tham mưu\n- BTM: Bộ Tổng Tham mưu\n- TCCT: Tổng cục Chính trị\n- TCHC: Tổng cục Hậu cần\n- TCKT: Tổng cục Kỹ thuật\n- BQP: Bộ Quốc phòng\n` },
            { id: 'cand', name: 'Công an Nhân dân', content: `\n- ANND: An ninh Nhân dân\n- CSND: Cảnh sát Nhân dân\n- BCA: Bộ Công an\n- X01: Văn phòng Bộ Công an\n- C01: Văn phòng Cơ quan Cảnh sát điều tra\n- C02: Cục Cảnh sát hình sự\n- C03: Cục Cảnh sát điều tra tội phạm về tham nhũng, kinh tế, buôn lậu\n- GĐ: Giám đốc\n` }
        ];

        await kv.set(DB_KEYS.USERS, users);
        await kv.set(DB_KEYS.DICTIONARIES, dictionaries);
        console.log("Database initialized successfully.");
    }
}

// --- User Management ---

export async function getUsers(): Promise<User[]> {
    return (await kv.get<User[]>(DB_KEYS.USERS)) || [];
}

export async function findUserById(userId: number): Promise<User | null> {
    const users = await getUsers();
    return users.find(u => u.id === userId) || null;
}

export async function findUserByUsername(username: string): Promise<User | null> {
    const users = await getUsers();
    return users.find(u => u.username === username) || null;
}

export async function updateUser(updatedUser: User): Promise<User> {
    const users = await getUsers();
    const index = users.findIndex(u => u.id === updatedUser.id);
    if (index === -1) throw new Error("User not found");
    
    // Ensure password isn't accidentally overwritten with an empty value
    const finalUser = { ...users[index], ...updatedUser };
    if (!updatedUser.password) {
      finalUser.password = users[index].password;
    }
    
    users[index] = finalUser;
    await kv.set(DB_KEYS.USERS, users);
    const { password, ...userWithoutPassword } = users[index];
    return userWithoutPassword;
}

export async function authenticateUser(username: string, pass: string): Promise<User | null> {
    const user = await findUserByUsername(username);
    if (user && user.password) {
        const hashedPassword = await hashPassword(pass);
        if (hashedPassword === user.password) {
            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        }
    }
    return null;
}

export async function changeUserPassword(userId: number, oldPass: string, newPass: string): Promise<boolean> {
    const users = await getUsers();
    const user = users.find(u => u.id === userId);
    if (user && user.password) {
        const hashedOldPass = await hashPassword(oldPass);
        if (user.password === hashedOldPass) {
            user.password = await hashPassword(newPass);
            await kv.set(DB_KEYS.USERS, users);
            return true;
        }
    }
    return false;
}

export async function resetUserPassword(userId: number): Promise<string> {
    const users = await getUsers();
    const user = users.find(u => u.id === userId);
    if (!user) throw new Error("User not found");

    const newPassword = `reset_${Math.random().toString(36).substring(2, 8)}`;
    user.password = await hashPassword(newPassword);
    await kv.set(DB_KEYS.USERS, users);
    return newPassword;
}


// --- Dictionary Management ---

export async function getDictionaries(): Promise<Dictionary[]> {
    return (await kv.get<Dictionary[]>(DB_KEYS.DICTIONARIES)) || [];
}

export async function addDictionary(name: string, content: string): Promise<Dictionary> {
    const dictionaries = await getDictionaries();
    const newDict: Dictionary = {
        id: name.toLowerCase().replace(/\s+/g, '-') + Date.now(),
        name,
        content,
    };
    dictionaries.push(newDict);
    await kv.set(DB_KEYS.DICTIONARIES, dictionaries);
    return newDict;
}

// --- Project Management ---

export async function getProjectsForUser(userId: number): Promise<Project[]> {
    const key = DB_KEYS.PROJECTS_BY_USER(userId);
    return (await kv.get<Project[]>(key)) || [];
}

export async function saveProjectForUser(userId: number, projectName: string, resultType: ProjectResultType, content: string): Promise<Project> {
    const projects = await getProjectsForUser(userId);
    const now = new Date().toISOString();
    let project = projects.find(p => p.name.toLowerCase() === projectName.toLowerCase());

    if (project) {
        project.lastModified = now;
    } else {
        project = {
            id: `project_${Date.now()}`,
            name: projectName,
            createdAt: now,
            lastModified: now,
        };
        projects.unshift(project); // Add to top
    }

    switch (resultType) {
        case 'analysis': project.analysisResult = content; break;
        case 'drafting': project.draftResult = content; break;
        case 'review': project.reviewResult = content; break;
    }
    
    await kv.set(DB_KEYS.PROJECTS_BY_USER(userId), projects);
    return project;
}

export async function deleteProjectForUser(userId: number, projectId: string): Promise<void> {
    let projects = await getProjectsForUser(userId);
    projects = projects.filter(p => p.id !== projectId);
    await kv.set(DB_KEYS.PROJECTS_BY_USER(userId), projects);
}