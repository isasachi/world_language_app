import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useEffect } from "react";
import { supabase } from "../supabase/supabaseClient";
import { useState } from "react";

interface StudentProps {
    userId: string | null,
    studentSchema: z.ZodSchema,
    onSuccess?: () => void;
}

const fetchUserData = async (userId: string | null) => {
  if (!userId) return null;

  const { data, error } = await supabase
    .from("users")
    .select("email")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("Error fetching user data:", error.message);
    return null;
  }

  return data;
}

const StudentForm = ({ userId, studentSchema, onSuccess }: StudentProps) => {
  type StudentType = z.infer<typeof studentSchema>;
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { 
    control, 
    handleSubmit,
    formState: { errors },
    reset 
} = useForm<StudentType>({ resolver: zodResolver(studentSchema) });

  const { data: userData } = useQuery({
    queryKey: ["userData", userId],
    queryFn: () => fetchUserData(userId),
    enabled: !!userId,
  });

  useEffect(() => {
    if (userData?.email) {
      reset({ email: userData.email });
    }
  }, [userData, reset]);

  const onSubmit = async (data: StudentType) => {
    setLoading(true);

    const { error } = await supabase.from("students").insert({ user_id: userId, ...data });

    if (error) {
      console.error("Error registering student:", error.message);
    } else {
      setSuccess('Student registered successfully.');
      if (onSuccess) {
        onSuccess(); // Call the onSuccess prop if provided
      }
    }

    setLoading(false);
    setTimeout(() => {
      reset();
    }, 1000);
  };

  return (
    <div className="max-w-xl mx-auto">
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-600 text-center">{success}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-2 gap-6">
          {/* First Name */}
          <div>
            <label className="block text-sm font-medium mb-1">First Name</label>
            <Controller
              name="first_name"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500"
                />
              )}
            />
            {errors.first_name && (
              <p className="text-red-500 text-sm mt-1">{errors.first_name.message?.toString()}</p>
            )}
          </div>

          {/* Last Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Last Name</label>
            <Controller
              name="last_name"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500"
                />
              )}
            />
            {errors.last_name && (
              <p className="text-red-500 text-sm mt-1">{errors.last_name.message?.toString()}</p>
            )}
          </div>

          {/* Preferred Name */}
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Preferred Name</label>
            <Controller
              name="preferred_name"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500"
                />
              )}
            />
            {errors.preferred_name && (
              <p className="text-red-500 text-sm mt-1">{errors.preferred_name.message?.toString()}</p>
            )}
          </div>

          {/* Email */}
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Email</label>
            <Controller
              name="email"
              control={control}
              defaultValue={userData?.email || ""}
              render={({ field }) => (
                <input
                  {...field}
                  type="email"
                  className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500"
                />
              )}
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email.message?.toString()}</p>
            )}
          </div>

          {/* Phone & Gender */}
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="tel"
                  className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500"
                />
              )}
            />
            {errors.phone && (
              <p className="text-red-500 text-sm mt-1">{errors.phone.message?.toString()}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Gender</label>
            <Controller
              name="gender"
              control={control}
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
            {errors.gender && (
              <p className="text-red-500 text-sm mt-1">{errors.gender.message?.toString()}</p>
            )}
          </div>

          {/* Birth Date & Country */}
          <div>
            <label className="block text-sm font-medium mb-1">Birth Date</label>
            <Controller
              name="birth_date"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="date"
                  className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500"
                />
              )}
            />
            {errors.birth_date && (
              <p className="text-red-500 text-sm mt-1">{errors.birth_date.message?.toString()}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Country</label>
            <Controller
              name="country"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500"
                />
              )}
            />
            {errors.country && (
              <p className="text-red-500 text-sm mt-1">{errors.country.message?.toString()}</p>
            )}
          </div>

          {/* Address */}
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1">Address</label>
            <Controller
              name="address"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500"
                />
              )}
            />
            {errors.address && (
              <p className="text-red-500 text-sm mt-1">{errors.address.message?.toString()}</p>
            )}
          </div>

          {/* Parent Information */}
          <div>
            <label className="block text-sm font-medium mb-1">Parent Full Name</label>
            <Controller
              name="parent_full_name"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500"
                />
              )}
            />
            {errors.parent_full_name && (
              <p className="text-red-500 text-sm mt-1">{errors.parent_full_name.message?.toString()}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Parent Phone</label>
            <Controller
              name="parent_phone"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="tel"
                  className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500"
                />
              )}
            />
            {errors.parent_phone && (
              <p className="text-red-500 text-sm mt-1">{errors.parent_phone.message?.toString()}</p>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-6">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-violet-500 text-white rounded hover:bg-violet-600 disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Registering..." : "Register"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default StudentForm;