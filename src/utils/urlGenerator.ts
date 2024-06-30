import yaml from 'js-yaml';
import { ProgressData } from '../types/types';

export const generateURL = (progress: Record<string, ProgressData>, assessmentName: string, assessorName: string, useCaseDescription: string): string => {
    const encodedProgress = btoa(JSON.stringify(progress));
    const url = new URL(window.location.href);
    url.searchParams.set('progress', encodedProgress);
    url.searchParams.set('assessmentName', btoa(assessmentName));
    url.searchParams.set('assessorName', btoa(assessorName));
    url.searchParams.set('useCaseDescription', btoa(useCaseDescription));
    return url.toString();
};

export const exportToYAML = (progress: Record<string, ProgressData>, assessmentName: string, assessorName: string, useCaseDescription: string) => {
    const yamlStr = yaml.dump(progress);
    const blob = new Blob([yamlStr], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'progress.yaml';
    a.click();
    URL.revokeObjectURL(url);
};
