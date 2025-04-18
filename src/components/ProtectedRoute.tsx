import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = () => {
  const { user, role, loading } = useAuth();

  if (loading) {
    // Show a spinning circle using Tailwind classes
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="border-t-4 border-blue-500 border-solid w-16 h-16 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  if (role === "admin") return <Outlet />; // Admin bypasses all restrictions

  if (role === "pending") return <Navigate to="/pending-activation" replace />;

  const allowedRoles = ["student", "teacher", "coordinator"];
  return typeof role === "string" && allowedRoles.includes(role) ? <Outlet /> : <Navigate to="/" replace />;
};

export default ProtectedRoute;
