import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useState } from "react";

const DashboardLayout = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false); 
  
  return (
    <div className="flex h-screen">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />
      <main className="flex-1 overflow-auto p-6 bg-white">
        <Outlet />
      </main>
    </div>
  );
}
export default DashboardLayout;