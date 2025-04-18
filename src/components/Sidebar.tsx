import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Calendar, School, Users, GraduationCap, CheckCircle, Clipboard, Menu, LogOut } from "lucide-react";
import { supabase } from "../supabase/supabaseClient";

const sidebarLinks = [
  { name: "Home", path: "/dashboard", icon: <Home size={20} /> },
  { name: "Users", path: "/dashboard/users", icon: <Users size={20} /> },
  { name: "Quarters", path: "/dashboard/quarters", icon: <Calendar size={20} /> },
  { name: "Classrooms", path: "/dashboard/classrooms", icon: <School size={20} /> },
  { name: "Students", path: "/dashboard/students", icon: <GraduationCap size={20} /> },
  { name: "Attendance", path: "/dashboard/attendance", icon: <CheckCircle size={20} /> },
  { name: "Grading", path: "/dashboard/grading", icon: <Clipboard size={20} /> },
];

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const Sidebar = ({ isOpen, setIsOpen }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate(); // React Router's navigation hook

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/signin"); // Redirect to sign-in page after logout
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        className="md:hidden fixed top-2 left-2 z-50 bg-violet-500 text-white p-2 rounded-full shadow-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Menu size={24} />
      </button>

      {/* Sidebar */}
      <aside
        className={`bg-gray-200 text-gray-900 p-4 flex flex-col fixed md:relative h-screen shadow-md transition-transform duration-300 z-40 ${
          isOpen ? "translate-x-0 w-48" : "-translate-x-full"
        } md:translate-x-0 md:w-64`}
      >
        {/* Navigation Links */}
        <nav className="space-y-2 flex-grow mt-4">
          {sidebarLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`flex items-center justify-start gap-3 p-3 rounded-lg transition-colors duration-200 md:w-full ${
                location.pathname === link.path || (link.path !== "/dashboard" && location.pathname.startsWith(link.path))
                  ? "bg-violet-500 text-white hover:bg-violet-600"
                  : "hover:bg-violet-200"
              }`}
              onClick={() => setIsOpen(false)} // Close sidebar on link click (for mobile)
            >
              {link.icon}
              <span>{link.name}</span>
            </Link>
          ))}
        </nav>

        {/* Logout Button - Fixed at Bottom */}
        <button
          onClick={handleLogout}
          className="flex items-center justify-start gap-3 p-3 rounded-lg transition-colors duration-200 w-full text-left text-red-600 hover:bg-red-100 mt-auto cursor-pointer"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </aside>

      {/* Overlay for mobile when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </>
  );
};

export default Sidebar;
