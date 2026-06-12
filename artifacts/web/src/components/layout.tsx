import { FC, ReactNode } from "react";

export const Layout: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-[100dvh] w-full max-w-md mx-auto bg-background shadow-xl flex flex-col relative overflow-hidden">
      {children}
    </div>
  );
};
