import { FC, ReactNode } from "react";

export const Layout: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-[100dvh] w-full max-w-md lg:max-w-none mx-auto bg-background lg:shadow-none shadow-xl flex flex-col relative overflow-hidden">
      {children}
    </div>
  );
};
