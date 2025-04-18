import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./context/AuthContext";
import { useInitActiveQuarter } from "./hooks/useInitActiveQuarter";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";
import Home from "./pages/Home";
import Users from "./pages/Users";
import Quarters from "./pages/Quarters";
import Classrooms from "./pages/Classrooms";
import Students from "./pages/Students";
import Attendance from "./pages/Attendance";
import Grading from "./pages/Grading";
import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import PendingActivation from "./pages/PendingActivation";
import RegisterStudent from "./pages/RegisterStudent";
import RegisterTeacher from "./pages/RegisterTeacher";
import ClassroomDetails from "./pages/ClassroomDetails";
import CreateClassroom from "./pages/CreateClassroom";
import StudentDetails from "./pages/StudentDetails";

const queryClient = new QueryClient();

const App = () => {

  // Initialize active quarter
  useInitActiveQuarter();

  return (
    <QueryClientProvider client={queryClient}>
        <Router>
          <AuthProvider>
          <Routes>
            {/* Protected dashboard routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<Home />} />
                <Route path="users" element={<Users />} />
                <Route path="quarters" element={<Quarters />} />
                <Route path="classrooms" element={<Classrooms />} />
                <Route path="classrooms/:id" element={<ClassroomDetails />} />
                <Route path="classrooms/create" element={<CreateClassroom />} />
                <Route path="students" element={<Students />} />
                <Route path="students/:id" element={<StudentDetails />} />
                <Route path="attendance" element={<Attendance />} />
                <Route path="grading" element={<Grading />} />
                <Route path="users/register-student/:userId" element={<RegisterStudent />} />
                <Route path="users/register-teacher/:userId" element={<RegisterTeacher />} />
              </Route>
            </Route>

            {/* Pending activation */}
            <Route path="/pending-activation" element={<PendingActivation />} />

            {/* Public routes */}
            <Route path="/signup" element={<SignUp />} />
            <Route path="/" element={<SignIn />} />
          </Routes>
          </AuthProvider>
        </Router>
    </QueryClientProvider>
  );
};

export default App;
