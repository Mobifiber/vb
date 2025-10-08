import React, { useState, useEffect, useCallback } from 'react';
import { Project, User, IUserService } from '../types';
import Card from './common/Card';
import Button from './common/Button';

interface WorkspaceModuleProps {
    user: User;
    userService: IUserService;
}


// Detail View Component
const ProjectDetailView: React.FC<{
    project: Project;
    onBack: () => void;
}> = ({ project, onBack }) => {
    return (
        <div>
            <button onClick={onBack} className="text-blue-600 hover:underline mb-4">&larr; Quay lại danh sách</button>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{project.name}</h2>
            <p className="text-sm text-gray-500 mb-6">
                Tạo lúc: {new Date(project.createdAt).toLocaleString('vi-VN')} | 
                Cập nhật lần cuối: {new Date(project.lastModified).toLocaleString('vi-VN')}
            </p>

            <div className="space-y-6">
                {project.analysisResult && (
                    <Card title="Kết quả Phân tích">
                        <pre className="p-4 bg-slate-50 rounded-md whitespace-pre-wrap text-gray-800 max-h-60 overflow-y-auto">{project.analysisResult}</pre>
                    </Card>
                )}
                {project.draftResult && (
                     <Card title="Văn bản Soạn thảo">
                        <pre className="p-4 bg-slate-50 rounded-md whitespace-pre-wrap text-gray-800 max-h-60 overflow-y-auto">{project.draftResult}</pre>
                    </Card>
                )}
                {project.reviewResult && (
                     <Card title="Văn bản đã Rà soát & Hoàn thiện">
                        <pre className="p-4 bg-slate-50 rounded-md whitespace-pre-wrap text-gray-800 max-h-60 overflow-y-auto">{project.reviewResult}</pre>
                    </Card>
                )}
                 {!project.analysisResult && !project.draftResult && !project.reviewResult && (
                    <p className="text-gray-500">Dự án này chưa có nội dung nào được lưu.</p>
                )}
            </div>
        </div>
    );
};


const KanbanProjectCard: React.FC<{
    project: Project;
    onSelect: () => void;
    onDelete: (e: React.MouseEvent) => void;
}> = ({ project, onSelect, onDelete }) => {
    return (
        <div 
            onClick={onSelect}
            className="bg-white rounded-lg shadow p-3 mb-3 cursor-pointer hover:shadow-md transition-shadow group relative"
        >
            <button 
                onClick={onDelete}
                className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                aria-label="Xóa dự án"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            <h4 className="font-semibold text-gray-800 mb-1 pr-4">{project.name}</h4>
            <p className="text-xs text-gray-500 mb-2">
                Cập nhật: {new Date(project.lastModified).toLocaleString('vi-VN')}
            </p>
            <div className="flex items-center space-x-2">
                <span title="Phân tích" className={project.analysisResult ? 'text-blue-500' : 'text-gray-300'}>📑</span>
                <span title="Soạn thảo" className={project.draftResult ? 'text-orange-500' : 'text-gray-300'}>✍️</span>
                <span title="Rà soát" className={project.reviewResult ? 'text-green-500' : 'text-gray-300'}>🔎</span>
            </div>
        </div>
    );
};

const KanbanColumn: React.FC<{
    title: string;
    projects: Project[];
    colorClass: string;
    onSelectProject: (project: Project) => void;
    onDeleteProject: (e: React.MouseEvent, projectId: string) => void;
}> = ({ title, projects, colorClass, onSelectProject, onDeleteProject }) => {
    return (
        <div className="flex-1 bg-slate-100 rounded-lg p-3 min-w-[300px]">
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center sticky top-0 bg-slate-100 py-1 z-10">
                <span className={`w-3 h-3 rounded-full mr-2 ${colorClass}`}></span>
                {title}
                <span className="ml-2 bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">{projects.length}</span>
            </h3>
            <div className="h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {projects.length > 0 ? (
                    projects.map(p => 
                        <KanbanProjectCard 
                            key={p.id} 
                            project={p} 
                            onSelect={() => onSelectProject(p)} 
                            onDelete={(e) => onDeleteProject(e, p.id)} 
                        />
                    )
                ) : (
                    <div className="flex items-center justify-center h-24 border-2 border-dashed border-slate-300 rounded-lg">
                        <p className="text-sm text-slate-500">Không có dự án</p>
                    </div>
                )}
            </div>
        </div>
    );
};


// Main Component
const WorkspaceModule: React.FC<WorkspaceModuleProps> = ({ user, userService }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'board' | 'list'>('board');

    const fetchProjects = useCallback(async () => {
        setIsLoading(true);
        const fetchedProjects = await userService.getProjects(user.id);
        setProjects(fetchedProjects.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()));
        setIsLoading(false);
    }, [user.id, userService]);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);
    
    const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
        e.stopPropagation(); // Prevent opening the project
        if (window.confirm('Bạn có chắc chắn muốn xóa dự án này? Mọi dữ liệu sẽ bị mất vĩnh viễn.')) {
            await userService.deleteProject(user.id, projectId);
            await fetchProjects();
        }
    };
    
    if (isLoading) {
        return <p>Đang tải Không gian làm việc...</p>;
    }

    if (selectedProject) {
        return <ProjectDetailView project={selectedProject} onBack={() => {
            setSelectedProject(null);
            fetchProjects(); // Re-fetch in case data was updated
        }} />;
    }

    // Categorize projects for the board view
    const columns = {
        analysis: { title: 'Mới Phân tích', projects: [] as Project[], color: 'bg-blue-500' },
        drafting: { title: 'Đang Soạn thảo', projects: [] as Project[], color: 'bg-yellow-500' },
        review: { title: 'Đã Hoàn thiện', projects: [] as Project[], color: 'bg-green-500' },
    };

    projects.forEach(p => {
        if (p.reviewResult) {
            columns.review.projects.push(p);
        } else if (p.draftResult) {
            columns.drafting.projects.push(p);
        } else if (p.analysisResult) {
            columns.analysis.projects.push(p);
        }
    });


    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Không gian Làm việc</h1>
                 <div className="flex items-center bg-slate-200 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('board')}
                        className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${viewMode === 'board' ? 'bg-white shadow' : 'text-gray-600 hover:bg-slate-300'}`}
                    >
                        Dạng Bảng
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow' : 'text-gray-600 hover:bg-slate-300'}`}
                    >
                        Dạng Danh sách
                    </button>
                </div>
            </div>

            <p className="mb-6 text-gray-600">Đây là nơi lưu trữ các kết quả làm việc của bạn. Để thêm một dự án mới, hãy thực hiện một tác vụ ở các module khác và chọn "Lưu vào Không gian làm việc".</p>

            {viewMode === 'board' ? (
                projects.length > 0 ? (
                    <div className="flex space-x-4">
                        <KanbanColumn 
                            title={columns.analysis.title} 
                            projects={columns.analysis.projects}
                            colorClass={columns.analysis.color}
                            onSelectProject={setSelectedProject}
                            onDeleteProject={handleDeleteProject}
                        />
                        <KanbanColumn 
                            title={columns.drafting.title} 
                            projects={columns.drafting.projects}
                            colorClass={columns.drafting.color}
                            onSelectProject={setSelectedProject}
                            onDeleteProject={handleDeleteProject}
                        />
                        <KanbanColumn 
                            title={columns.review.title} 
                            projects={columns.review.projects}
                            colorClass={columns.review.color}
                            onSelectProject={setSelectedProject}
                            onDeleteProject={handleDeleteProject}
                        />
                    </div>
                ) : (
                    <p className="text-center text-gray-500 py-8">Chưa có dự án nào được lưu.</p>
                )
            ) : (
                <Card title="Danh sách Dự án đã lưu">
                     <div className="space-y-4">
                        {projects.length > 0 ? projects.map(p => (
                            <div key={p.id} onClick={() => setSelectedProject(p)} className="p-4 bg-slate-50 rounded-lg flex justify-between items-center hover:bg-slate-100 cursor-pointer transition-colors">
                                <div>
                                    <p className="font-semibold text-blue-600 text-left">
                                        {p.name}
                                    </p>
                                    <p className="text-sm text-gray-500">Cập nhật lần cuối: {new Date(p.lastModified).toLocaleString('vi-VN')}</p>
                                </div>
                                <Button onClick={(e) => handleDeleteProject(e, p.id)} variant="secondary">Xóa</Button>
                            </div>
                        )) : (
                            <p className="text-center text-gray-500 py-8">Chưa có dự án nào được lưu.</p>
                        )}
                    </div>
                </Card>
            )}
        </div>
    );
};

export default WorkspaceModule;