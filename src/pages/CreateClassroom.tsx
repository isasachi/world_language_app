import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { createClassroomSchema } from "../schemas";
import { ArrowLeft } from "lucide-react";

type ClassroomForm = z.infer<typeof createClassroomSchema>;

// Fetch helpers
const fetchProficiencyLevels = async () => {
  const { data, error } = await supabase.from("proficiency_levels").select("id, name");
  if (error) throw error;
  return data;
};

const fetchTeachers = async () => {
  const { data, error } = await supabase.from("teachers").select("id, first_name, last_name");
  if (error) throw error;
  return data;
};

const fetchStudents = async () => {
  const { data, error } = await supabase.from("students").select("id, first_name, last_name");
  if (error) throw error;
  return data;
};

export default function CreateClassroom() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [ fail, setFail ] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClassroomForm>({
    resolver: zodResolver(createClassroomSchema),
    defaultValues: {
      name: "",
      proficiency_level_id: "",
      days: [],
      start_time: "",
      end_time: "",
      teacher_id: "",
      student_ids: [],
    },
  });

  const { data: levels } = useQuery({
    queryKey: ["proficiency_levels"],
    queryFn: fetchProficiencyLevels,
  });

  const { data: teachers } = useQuery({
    queryKey: ["teachers"],
    queryFn: fetchTeachers,
  });

  const { data: students } = useQuery({
    queryKey: ["students"],
    queryFn: fetchStudents,
  });

  const createClassroomMutation = useMutation({
    mutationFn: async (values: ClassroomForm) => {
      const { name, proficiency_level_id, days, start_time, end_time, teacher_id, student_ids = [] } = values;

      const { data: classroom, error: classroomError } = await supabase
        .from("classrooms")
        .insert({ name, proficiency_level_id })
        .select("id")
        .single();
      if (classroomError) throw classroomError;

      const classroom_id = classroom.id;

      const scheduleData = days.map((day) => ({
        classroom_id,
        day,
        start_time,
        end_time,
      }));
      const { error: scheduleError } = await supabase.from("class_schedules").insert(scheduleData);
      if (scheduleError) throw scheduleError;

      const { error: teacherError } = await supabase
        .from("classroom_teachers")
        .insert({ classroom_id, teacher_id });
      if (teacherError) throw teacherError;

      const studentData = student_ids.map((student_id) => ({ classroom_id, student_id }));
      if (studentData.length) {
        const { error: studentError } = await supabase.from("classroom_students").insert(studentData);
        if (studentError) throw studentError;
      }

      return classroom_id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ["classrooms"]});
      reset();
      setTimeout(() => {
        navigate("/dashboard/classrooms");
      }
      , 1000);
    },
    onError: (error) => {
      console.error("Create error:", error);
      setFail("Failed to create classroom. Please try again.");
    },
  });

  const onSubmit = (data: ClassroomForm) => {
    createClassroomMutation.mutate(data);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center mb-6">
        <button
          onClick={() => navigate("/dashboard/classrooms")}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <h1 className="text-2xl font-bold ml-auto mr-auto">Create New Classroom</h1>
      </div>

      {fail && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-600 text-center">{fail}</p>
        </div>
      )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-xl mx-auto">
          <div className="grid grid-cols-2 gap-6">
            {/* Name */}
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Classroom Name</label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500"
                  />
                )}
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            {/* Proficiency Level */}
            <div>
              <label className="block text-sm font-medium mb-1">Proficiency Level</label>
              <Controller
                name="proficiency_level_id"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500"
                  >
                    <option value="">Select level...</option>
                    {levels?.map((level) => (
                      <option key={level.id} value={level.id}>
                        {level.name}
                      </option>
                    ))}
                  </select>
                )}
              />
              {errors.proficiency_level_id && (
                <p className="text-red-500 text-sm mt-1">
                  {errors.proficiency_level_id.message}
                </p>
              )}
            </div>

            {/* Teacher */}
            <div>
              <label className="block text-sm font-medium mb-1">Teacher</label>
              <Controller
                name="teacher_id"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500"
                  >
                    <option value="">Select teacher...</option>
                    {teachers?.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.first_name} {t.last_name}
                      </option>
                    ))}
                  </select>
                )}
              />
              {errors.teacher_id && (
                <p className="text-red-500 text-sm mt-1">{errors.teacher_id.message}</p>
              )}
            </div>

            {/* Days */}
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Days</label>
              <Controller
                name="days"
                control={control}
                render={({ field }) => (
                  <div className="flex flex-wrap gap-3 p-2 border rounded">
                    {["Monday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => (
                      <label
                        key={day}
                        className="inline-flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          value={day}
                          checked={field.value.includes(day)}
                          onChange={(e) =>
                            e.target.checked
                              ? field.onChange([...field.value, day])
                              : field.onChange(field.value.filter((d) => d !== day))
                          }
                          className="text-violet-500 border-gray-300 rounded focus:ring-violet-500"
                        />
                        <span className="text-sm">{day}</span>
                      </label>
                    ))}
                  </div>
                )}
              />
              {errors.days && (
                <p className="text-red-500 text-sm mt-1">{errors.days.message}</p>
              )}
            </div>

            {/* Time Inputs */}
            <div>
              <label className="block text-sm font-medium mb-1">Start Time</label>
              <Controller
                name="start_time"
                control={control}
                render={({ field }) => (
                  <input
                    type="time"
                    {...field}
                    className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500"
                  />
                )}
              />
              {errors.start_time && (
                <p className="text-red-500 text-sm mt-1">{errors.start_time.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">End Time</label>
              <Controller
                name="end_time"
                control={control}
                render={({ field }) => (
                  <input
                    type="time"
                    {...field}
                    className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500"
                  />
                )}
              />
              {errors.end_time && (
                <p className="text-red-500 text-sm mt-1">{errors.end_time.message}</p>
              )}
            </div>

            {/* Students */}
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Students</label>
              <Controller
                name="student_ids"
                control={control}
                render={({ field }) => (
                  <div className="max-h-48 overflow-y-auto border rounded p-3 space-y-2">
                    {students?.map((s) => (
                      <label
                        key={s.id}
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                      >
                        <input
                          type="checkbox"
                          value={s.id}
                          checked={(field.value ?? []).includes(s.id)}
                          onChange={(e) => {
                            if (e.target.checked)
                              field.onChange([...(field.value ?? []), s.id]);
                            else
                              field.onChange(
                                (field.value ?? []).filter((id) => id !== s.id)
                              );
                          }}
                          className="text-violet-500 border-gray-300 rounded focus:ring-violet-500"
                        />
                        <span className="text-sm">
                          {s.first_name} {s.last_name}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-6">
            <button
              type="submit"
              disabled={createClassroomMutation.status === "pending"}
              className="px-4 py-2 bg-violet-500 text-white rounded hover:bg-violet-600 disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {createClassroomMutation.status === "pending" ? "Creating..." : "Create Classroom"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
