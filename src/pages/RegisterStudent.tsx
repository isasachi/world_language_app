import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import StudentForm from "../components/StudentForm";
import { studentSchema } from "../schemas";
import { useQueryClient } from "@tanstack/react-query";

const RegisterStudent = () => {
  const { userId } = useParams<{ userId: string }>(); // Get user ID from URL
  const validUserId = userId ?? null; // Convert undefined to null
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
        {/* Back Button */}
      <button
        onClick={() => navigate("/dashboard/users")}
        className="flex items-center gap-2 mb-2 cursor-pointer text-gray-700 hover:text-gray-900"
      >
        <ArrowLeft size={20} />
        <span>Back</span>
      </button>

      <h2 className="text-2xl font-semibold mb-4">Register Student</h2>
      <StudentForm
        userId={validUserId}
        studentSchema={studentSchema}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["users"] }); // Refetch data
          setTimeout(() => navigate("/dashboard/users"), 1000); // Redirect back after successful registration
        }}
      />
    </div>
  );
};

export default RegisterStudent;
