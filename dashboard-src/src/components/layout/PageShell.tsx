import React from 'react';

interface PageShellProps {
    children: React.ReactNode;
    title?: string;
}

export const PageShell: React.FC<PageShellProps> = ({ children, title }) => {
    return (
        <div className="page-shell">
            {title && <h1>{title}</h1>}
            <main>{children}</main>
        </div>
    );
};

export default PageShell;