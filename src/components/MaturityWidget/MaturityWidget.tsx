import React from 'react';
import './MaturityWidget.module.scss';
import LevelResult from "../../enums/LevelResult";

interface MaturityWidgetProps {
    level: number;
    label: string;
    className?: string;
}

const getMaturityWidgetClass = (level: number) => {
    return `pkimm-maturity-widget level-${level}`;
};

const MaturityWidget: React.FC<MaturityWidgetProps> = ({ level, label, className }) => {
    return (
        <div className={`${getMaturityWidgetClass(level)} ${className}`}>
            {label}<br/>
            {LevelResult[level]}
        </div>
    );
};

export default MaturityWidget;
