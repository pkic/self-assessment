import React from 'react';
import {ModuleData, ProgressData} from '../../types/types';
import { Category } from '../Category/Category';
import ReactMarkdown from "react-markdown";
import './Module.module.scss';

interface ModuleProps {
    module: ModuleData;
    progress: Record<string, ProgressData>;
    onLevelChange: (moduleId: string, questionId: string, level: number) => void;
    onApplicabilityChange: (moduleId: string, questionId: string) => void;
}

export const Module: React.FC<ModuleProps> = ({ module, progress, onLevelChange, onApplicabilityChange }) => {
    return (
        <div className="pkimm-module">
            <div className="pkimm-module-description">
                <ReactMarkdown>{module.description}</ReactMarkdown>
            </div>
            {module.categories.map(category => (
                <Category
                    key={category.id}
                    moduleId={module.id}
                    category={category}
                    progress={progress}
                    onLevelChange={onLevelChange}
                    onApplicabilityChange={onApplicabilityChange}
                />
            ))}
        </div>
    );
};
