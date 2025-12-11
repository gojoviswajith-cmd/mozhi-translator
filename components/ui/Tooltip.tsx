import React from 'react';

export interface TooltipProps {
    text: string;
    children: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

const positionStyles = {
    top: "bottom-full mb-2 left-1/2 -translate-x-1/2",
    bottom: "top-full mt-2 left-1/2 -translate-x-1/2",
    left: "right-full mr-2 top-1/2 -translate-y-1/2",
    right: "left-full ml-2 top-1/2 -translate-y-1/2"
};

export const Tooltip: React.FC<TooltipProps> = ({ text, children, position = 'top' }) => {
    return (
        <div className="group relative inline-flex">
            {children}
            <div className={`absolute ${positionStyles[position]} hidden group-hover:block z-50 pointer-events-none`}>
                <div className="bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {text}
                </div>
            </div>
        </div>
    );
};

export default Tooltip;
