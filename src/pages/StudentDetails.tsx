import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "../supabase/supabaseClient";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { studentSchema } from "../schemas";
import { format } from "date-fns";
import { Edit, Trash2 } from "lucide-react";
import EditModal from "../components/EditModal";

type StudentFormValues = z.infer<typeof studentSchema>;

const StudentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Fetch student details
  const { data: student, isLoading } = useQuery({
    queryKey: ["student", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: student,
  });

  useEffect(() => {
    if (student) {
      form.reset(student);
    }
  }, [student, form]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: StudentFormValues) => {
      const { error } = await supabase
        .from("students")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student", id] });
      setIsEditModalOpen(false);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("students")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      navigate("/dashboard/students");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Student Details</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="px-4 py-2 text-violet-600 border border-violet-600 cursor-pointer rounded hover:bg-violet-50 flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={() => {
                  deleteMutation.mutate();
              }}
              className="px-4 py-2 text-red-600 border border-red-600 cursor-pointer rounded hover:bg-red-50 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500">First Name</h3>
            <p className="mt-1 text-lg">{student.first_name}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Last Name</h3>
            <p className="mt-1 text-lg">{student.last_name}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Email</h3>
            <p className="mt-1 text-lg">{student.email}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Phone</h3>
            <p className="mt-1 text-lg">{student.phone}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Gender</h3>
            <p className="mt-1 text-lg capitalize">{student.gender}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Birth Date</h3>
            <p className="mt-1 text-lg">{format(new Date(student.birth_date), 'MMMM d, yyyy')}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Country</h3>
            <p className="mt-1 text-lg">{student.country}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Address</h3>
            <p className="mt-1 text-lg">{student.address}</p>
        </div>
        <div>
            <h3 className="text-sm font-medium text-gray-500">Parent's Name</h3>
            <p className="mt-1 text-lg">{student.parent_full_name}</p>
        </div>
        <div>
            <h3 className="text-sm font-medium text-gray-500">Parent's Phone</h3>
            <p className="mt-1 text-lg">{student.parent_phone}</p>
        </div>
        </div>
      </div>

      <EditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Student"
      >
        <form onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))}>
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium mb-1">First Name</label>
                <Controller
                name="first_name"
                control={form.control}
                render={({ field }) => (
                    <input
                    {...field}
                    className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500"
                    />
                )}
                />
                {form.formState.errors.first_name && (
                <p className="text-red-500 text-sm mt-1">
                    {form.formState.errors.first_name.message}
                </p>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Last Name</label>
                <Controller
                name="last_name"
                control={form.control}
                render={({ field }) => (
                    <input
                    {...field}
                    className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500"
                    />
                )}
                />
                {form.formState.errors.last_name && (
                <p className="text-red-500 text-sm mt-1">
                    {form.formState.errors.last_name.message}
                </p>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <Controller
                name="email"
                control={form.control}
                render={({ field }) => (
                    <input
                    {...field}
                    type="email"
                    className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500"
                    />
                )}
                />
                {form.formState.errors.email && (
                <p className="text-red-500 text-sm mt-1">
                    {form.formState.errors.email.message}
                </p>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <Controller
                name="phone"
                control={form.control}
                render={({ field }) => (
                    <input
                    {...field}
                    type="tel"
                    className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500"
                    />
                )}
                />
                {form.formState.errors.phone && (
                <p className="text-red-500 text-sm mt-1">
                    {form.formState.errors.phone.message}
                </p>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Gender</label>
                <Controller
                name="gender"
                control={form.control}
                render={({ field }) => (
                    <select
                    {...field}
                    className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500"
                    >
                    <option value="">Select gender...</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    </select>
                )}
                />
                {form.formState.errors.gender && (
                <p className="text-red-500 text-sm mt-1">
                    {form.formState.errors.gender.message}
                </p>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Birth Date</label>
                <Controller
                name="birth_date"
                control={form.control}
                render={({ field: { value, ...field } }) => (
                    <input
                    {...field}
                    type="date"
                    value={value ? format(new Date(value), 'yyyy-MM-dd') : ''}
                    className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500"
                    />
                )}
                />
                {form.formState.errors.birth_date && (
                <p className="text-red-500 text-sm mt-1">
                    {form.formState.errors.birth_date.message}
                </p>
                )}
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Country</label>
                <Controller
                name="country"
                control={form.control}
                render={({ field }) => (
                    <input
                    {...field}
                    className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500"
                    />
                )}
                />
                {form.formState.errors.country && (
                <p className="text-red-500 text-sm mt-1">
                    {form.formState.errors.country.message}
                </p>
                )}
            </div>
            <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Address</label>
            <Controller
                name="address"
                control={form.control}
                render={({ field }) => (
                <input
                    {...field}
                    className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500"
                />
                )}
            />
            {form.formState.errors.address && (
                <p className="text-red-500 text-sm mt-1">
                {form.formState.errors.address.message}
                </p>
            )}
            </div>

            <div>
            <label className="block text-sm font-medium mb-1">Parent's Full Name</label>
            <Controller
                name="parent_full_name"
                control={form.control}
                render={({ field }) => (
                <input
                    {...field}
                    className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500"
                />
                )}
            />
            {form.formState.errors.parent_full_name && (
                <p className="text-red-500 text-sm mt-1">
                {form.formState.errors.parent_full_name.message}
                </p>
            )}
            </div>

            <div>
            <label className="block text-sm font-medium mb-1">Parent's Phone</label>
            <Controller
                name="parent_phone"
                control={form.control}
                render={({ field }) => (
                <input
                    {...field}
                    type="tel"
                    className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500"
                />
                )}
            />
            {form.formState.errors.parent_phone && (
                <p className="text-red-500 text-sm mt-1">
                {form.formState.errors.parent_phone.message}
                </p>
            )}
            </div>
            </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 border cursor-pointer rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-4 py-2 bg-violet-500 text-white cursor-pointer rounded hover:bg-violet-600 disabled:opacity-50"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </EditModal>
    </div>
  );
};

export default StudentDetails;