import React from "react";
import GridShape from "../../components/common/GridShape";
import AppLogo from "../../components/common/AppLogo";
import { Link } from "react-router";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative p-6 bg-white dark:bg-gray-900 z-1 sm:p-0">
      <div className="relative flex flex-col justify-center w-full h-screen lg:flex-row sm:p-0">
        <div className="flex flex-col items-center w-full lg:w-1/2">
          <div className="flex justify-center py-6 lg:hidden">
            <Link to="/">
              <AppLogo className="h-24 w-24 rounded-xl" />
            </Link>
          </div>
          {children}
        </div>
        <div className="items-center hidden w-full h-full lg:w-1/2 bg-brand-100 dark:bg-brand-950 lg:grid">
          <div className="relative flex items-center justify-center z-1">
            {/* <!-- ===== Common Grid Shape Start ===== --> */}
            <GridShape />
            <div className="flex flex-col items-center gap-4">
              <Link to="/" className="">
                <AppLogo className="h-48 w-[320px] rounded-xl" />
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
