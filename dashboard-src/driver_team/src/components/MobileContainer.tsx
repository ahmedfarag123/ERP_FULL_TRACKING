import type { ReactNode } from 'react';

interface MobileContainerProps {
  children: ReactNode;
}

export default function MobileContainer({ children }: MobileContainerProps) {
  return (
    <div className="flex justify-center items-start min-h-[100dvh] bg-neutral-200 overflow-hidden">
      <div
        className="mobile-app-frame w-full max-w-[430px] h-[100dvh] max-h-[100dvh] bg-white relative overflow-hidden shadow-2xl flex flex-col"
      >
        {children}
      </div>
    </div>
  );
}
