import yaml from 'js-yaml';
import { ProgressData } from '../types/types';

export const generateURL = (progress: Record<string, ProgressData>, assessmentName: string, assessorName: string, useCaseDescription: string): string => {
    const encodedProgress = btoa(JSON.stringify(progress));
    const url = new URL(window.location.href);
    const hashParams = new URLSearchParams();
    hashParams.set('progress', encodedProgress);
    hashParams.set('assessmentName', btoa(assessmentName));
    hashParams.set('assessorName', btoa(assessorName));
    hashParams.set('useCaseDescription', btoa(useCaseDescription));
    url.hash = hashParams.toString();
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
