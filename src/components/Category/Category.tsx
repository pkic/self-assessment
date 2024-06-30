import React from 'react';
import {CategoryData, ProgressData} from '../../types/types';
import ReactMarkdown from 'react-markdown';
import styles from './Category.module.scss';

console.log('Styles:', styles); // Add this line

interface CategoryProps {
    moduleId: string;
    category: CategoryData;
    progress: Record<string, ProgressData>;
    onLevelChange: (moduleId: string, categoryId: string, level: number) => void;
    onApplicabilityChange: (moduleId: string, categoryId: string) => void;
}

export const Category: React.FC<CategoryProps> = ({ moduleId, category, progress, onLevelChange, onApplicabilityChange }) => {
    const selectedLevel = progress[`${moduleId}.${category.id}`] === undefined ? 0 : progress[`${moduleId}.${category.id}`].level;
    const isApplicable = progress[`${moduleId}.${category.id}`] === undefined ? true : progress[`${moduleId}.${category.id}`].applicability;

    return (
        // keep only the name of the style class
        <div className="pkimm-category-card">
            <div className="pkimm-category-header">
                <div className="pkimm-category-text">
                    <label className="pkimm-toggle-switch">
                        <input type="checkbox" checked={isApplicable} onChange={() => onApplicabilityChange(moduleId, category.id)}/>
                        <span className="pkimm-slider"></span>
                    </label>
                    <strong>{moduleId}.{category.id} {category.name}</strong>
                </div>
            </div>
            {isApplicable && (
                <>
                    <div className="pkimm-category-description">
                        <ReactMarkdown>{category.description}</ReactMarkdown>
                    </div>
                    <div className="pkimm-levels">
                        {category.levels.map((level, index) => (
                            <div
                                key={index}
                                className={`pkimm-level-card ${selectedLevel === level.number ? 'selected' : ''}`}
                                onClick={() => onLevelChange(moduleId, category.id, level.number)}
                            >
                                <strong>{level.name}</strong>: <ReactMarkdown>{level.description}</ReactMarkdown>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};
