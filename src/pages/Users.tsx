import { supabase } from "../supabase/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import Table from "../components/Table";
import { ColumnDef } from "@tanstack/react-table";


type User = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  isRegistered?: boolean;
};

  const fetchUsers = async (): Promise<{
    pendingUsers: User[];
    students: User[];
    teachers: User[];
  }> => {
    const { data: pending, error: errorPending } = await supabase
      .from("users")
      .select("id, full_name, email, role")
      .eq("role", "pending");
  
    const { data: students, error: errorStudents } = await supabase
      .from("users")
      .select("id, full_name, email, role")
      .eq("role", "student");
  
    const { data: teachers, error: errorTeachers } = await supabase
      .from("users")
      .select("id, full_name, email, role")
      .eq("role", "teacher");
  
    const { data: registeredStudents } = await supabase
      .from("students")
      .select("user_id");
  
    const { data: registeredTeachers } = await supabase
      .from("teachers")
      .select("user_id");
  
    if (errorPending || errorStudents || errorTeachers) {
      throw new Error(errorPending?.message || errorStudents?.message || errorTeachers?.message);
    }
  
    return {
      pendingUsers: pending || [],
      students: (students || []).map((student) => ({
        ...student,
        isRegistered: registeredStudents?.some((s) => s.user_id === student.id),
      })) as User[],
      teachers: (teachers || []).map((teacher) => ({
        ...teacher,
        isRegistered: registeredTeachers?.some((t) => t.user_id === teacher.id),
      })) as User[],
    };
  };

const Users = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch users with React Query
  const { data, isLoading, isError } = useQuery({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

  // Mutation for updating user role
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      const { error } = await supabase.from("users").update({ role: newRole }).eq("id", userId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["users"]}); // Refetch users after role update
    },
  });

  const columns: ColumnDef<User>[] = [
    { accessorKey: "full_name", header: "Full Name", cell: (info) => info.getValue() },
    { accessorKey: "email", header: "Email", cell: (info) => info.getValue() },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex gap-2">
          {row.original.role === "pending" ? (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => updateRoleMutation.mutate({ userId: row.original.id, newRole: "student" })}
                className="px-3 py-1.5 text-green-600 border border-green-600 rounded hover:bg-green-50 flex items-center gap-2 cursor-pointer"
              >
                Student
              </button>
              <button
                onClick={() => updateRoleMutation.mutate({ userId: row.original.id, newRole: "teacher" })}
                className="px-3 py-1.5 text-blue-600 border border-blue-600 rounded hover:bg-blue-50 flex items-center gap-2 cursor-pointer"
              >
                Teacher
              </button>
              <button
                onClick={() => updateRoleMutation.mutate({ userId: row.original.id, newRole: "coordinator" })}
                className="px-3 py-1.5 text-violet-600 border border-violet-600 rounded hover:bg-violet-50 flex items-center gap-2 cursor-pointer"
              >
                Coordinator
              </button>
            </div>
          ) : (
            !row.original.isRegistered && (
              <button
                onClick={() => {
                  if (row.original.role === "student") {
                    navigate(`/dashboard/users/register-student/${row.original.id}`);
                  } else if (row.original.role === "teacher") {
                    navigate(`/dashboard/users/register-teacher/${row.original.id}`);
                  }
                }}
                className="px-3 py-1.5 text-violet-600 border border-violet-600 rounded hover:bg-violet-50 flex items-center gap-2 cursor-pointer"
              >
                Register
              </button>
            )
          )}
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">Error loading users</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Manage Users</h1>
        </div>

        {/* Pending Users Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Pending Users</h2>
          <Table 
            data={data?.pendingUsers || []} 
            columns={columns} 
            loading={isLoading} 
          />
        </div>

        {/* Students Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Students</h2>
          <Table 
            data={data?.students || []} 
            columns={columns} 
            loading={isLoading} 
          />
        </div>

        {/* Teachers Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Teachers</h2>
          <Table 
            data={data?.teachers || []} 
            columns={columns} 
            loading={isLoading} 
          />
        </div>
      </div>
    </div>
  );
};


export default Users;