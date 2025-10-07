import React, { useState, useEffect, useCallback } from 'react';
import { Project } from '../types';
import { userService } from '../data/mockDB';
import Card from './common/Card';
import Button from './common/Button';

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

// Main List View Component
const WorkspaceModule: React.FC = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchProjects = useCallback(async () => {
        setIsLoading(true);
        const fetchedProjects = await userService.getProjects();
        setProjects(fetchedProjects.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()));
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);
    
    const handleDeleteProject = async (e: React.MouseEvent, projectId: string) => {
        e.stopPropagation(); // Prevent opening the project
        if (window.confirm('Bạn có chắc chắn muốn xóa dự án này? Mọi dữ liệu sẽ bị mất vĩnh viễn.')) {
            await userService.deleteProject(projectId);
            await fetchProjects();
        }
    };
    
    if (isLoading) {
        return <p>Đang tải Không gian làm việc...</p>;
    }

    if (selectedProject) {
        return <ProjectDetailView project={selectedProject} onBack={() => setSelectedProject(null)} />;
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Không gian Làm việc</h1>
            <p className="mb-6 text-gray-600">Đây là nơi lưu trữ các kết quả làm việc của bạn. Để thêm một dự án mới, hãy thực hiện một tác vụ ở các module khác và chọn "Lưu vào Không gian làm việc".</p>
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
        </div>
    );
};

export default WorkspaceModule;