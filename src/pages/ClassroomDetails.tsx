import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";
import { supabase } from "../supabase/supabaseClient";
import { useNavigate } from "react-router-dom";
import { ColumnDef } from "@tanstack/react-table";
import Table from "../components/Table";
import EditModal from "../components/EditModal";
import { ClassroomEditSchema } from "../schemas";
import { ArrowLeft, Edit, Trash2, Plus } from "lucide-react";

type ClassroomEditValues = z.infer<typeof ClassroomEditSchema>;

interface SupabaseResponse {
    id: string;
    name: string;
    zoom_link: string | null;
    proficiency_level: any; // We'll cast this appropriately
    class_schedule: any[]; 
    teacher: any[]; 
    students: any[];
  }

interface ClassroomDetails {
    id: string;
    name: string;
    proficiency_level: ProficiencyLevel;
    class_schedule: ClassSchedule | null;
    teacher: Teacher | null;
    students: Student[];
    zoom_link: string | null;
  }
  
  interface ProficiencyLevel {
    id: string;
    name: string;
  }
  
  interface ClassSchedule {
    id: string;
    days: string[];
    start_time: string;
    end_time: string;
  }
  
  interface Teacher {
    id: string;
    first_name: string;
    last_name: string;
  }
  
  interface Student {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    birth_date: string;
    country: string;
  }

  const fetchClassroomById = async (id: string): Promise<ClassroomDetails> => {
    const { data, error } = await supabase
      .from('classrooms')
      .select(`
        id,
        name,
        zoom_link,
        proficiency_level:proficiency_level_id(
          id,
          name
        ),
        class_schedule:class_schedules(
          id,
          days,
          start_time,
          end_time
        ),
        teacher:classroom_teachers(
          teachers(
            id,
            first_name,
            last_name
          )
        ),
        students:classroom_students(
          student:student_id(
            id,
            first_name,
            last_name,
            email,
            birth_date,
            country
          )
        )
      `)
      .eq('id', id)
      .single();
    
    if (error || !data) {
      console.error("Supabase error:", error);
      throw new Error(error?.message || "No data found.");
    }
    
    // Cast the data to our temporary type to help with type checking
    const typedData = data as unknown as SupabaseResponse;
    
    let proficiencyLevel: ProficiencyLevel;
    if (Array.isArray(typedData.proficiency_level)) {
      // If it's an array, take the first item
      proficiencyLevel = {
        id: typedData.proficiency_level[0]?.id || "",
        name: typedData.proficiency_level[0]?.name || ""
      };
    } else {
      // If it's an object, use it directly
      proficiencyLevel = {
        id: typedData.proficiency_level?.id || "",
        name: typedData.proficiency_level?.name || ""
      };
    }
    
    let teacher: Teacher | null = null;
    if (typedData.teacher && typedData.teacher.length > 0) {
      if (typedData.teacher[0]?.teachers) {
        if (Array.isArray(typedData.teacher[0].teachers)) {
          // If teachers is an array
          teacher = {
            id: typedData.teacher[0].teachers[0]?.id || "",
            first_name: typedData.teacher[0].teachers[0]?.first_name || "",
            last_name: typedData.teacher[0].teachers[0]?.last_name || ""
          };
        } else {
          // If teachers is an object
          teacher = {
            id: typedData.teacher[0].teachers?.id || "",
            first_name: typedData.teacher[0].teachers?.first_name || "",
            last_name: typedData.teacher[0].teachers?.last_name || ""
          };
        }
      }
    }
    
    const classroomDetails: ClassroomDetails = {
      id: typedData.id,
      name: typedData.name,
      proficiency_level: proficiencyLevel,
      class_schedule: typedData.class_schedule[0] || null,
      teacher: teacher,
      students: typedData.students.map(s => s.student),
      zoom_link: typedData.zoom_link || null
    };
  
    return classroomDetails;
  };
  
  
  
  const fetchProficiencyLevels = async (): Promise<ProficiencyLevel[]> => {
    const { data, error } = await supabase
      .from("proficiency_levels")
      .select("id, name");

    if (error) {
      throw new Error(error.message);
    }

    return data;
  };

  const fetchTeachers = async (): Promise<Teacher[]> => {
    const { data, error } = await supabase
      .from("teachers")
      .select("id, first_name, last_name");

    if (error) {
      throw new Error(error.message);
    }

    return data;
  };
  

  const ClassroomDetails = () => {
    const { id } = useParams();
    const queryClient = useQueryClient();
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isStudentsOpen, setIsStudentsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const navigate = useNavigate();
  
    const { data: classroom, isLoading: isLoadingClassroom, isError: isErrorClassroom, error: errorClassroom } = useQuery<ClassroomDetails>({
      queryKey: ["classroom", id],
      queryFn: () => fetchClassroomById(id!),
      enabled: !!id,
    });
  
    const { data: proficiencyLevels, isLoading: isLoadingProficiencyLevels } = useQuery<ProficiencyLevel[]>({
      queryKey: ["proficiencyLevels"],
      queryFn: fetchProficiencyLevels,
      enabled: !!classroom,
    });
  
    const { data: teachers, isLoading: isLoadingTeachers } = useQuery<Teacher[]>({
      queryKey: ["teachers"],
      queryFn: fetchTeachers,
      enabled: !!classroom,
    });

    const { data: allStudents = [], isLoading: isLoadingStudents } = useQuery<Student[]>({
      queryKey: ["availableStudents", id, classroom?.students],
      queryFn: async () => {
        const enrolledIds = classroom?.students.map(student => student.id) || [];
        
        // If there are no enrolled students, return all students
        if (enrolledIds.length === 0) {
          const { data, error } = await supabase
            .from("students")
            .select("id, first_name, last_name, email, birth_date, country");
  
          if (error) throw new Error(error.message);
          return data;
        }
  
        // Otherwise, filter out enrolled students
        const { data, error } = await supabase
          .from("students")
          .select("id, first_name, last_name, email, birth_date, country")
          .not('id', 'in', `(${enrolledIds.join(',')})`); // Convert array to comma-separated string
  
        if (error) throw new Error(error.message);
        return data;
      },
      enabled: !!classroom,
  });
      
  
    const isLoading = isLoadingClassroom || isLoadingProficiencyLevels || isLoadingTeachers || isLoadingStudents;
    const isError = isErrorClassroom || !classroom || !proficiencyLevels || !teachers;
    const error = errorClassroom || new Error("Failed to load data");
  
    // Initialize form with default values that handle null/undefined data
    const {
      control,
      handleSubmit,
      formState: { errors },
      reset
    } = useForm<ClassroomEditValues>({
      defaultValues: {
        name: classroom?.name || "",
        proficiency_level_id: classroom?.proficiency_level?.id || "",
        teacher_id: classroom?.teacher?.id || "",
        zoom_link: classroom?.zoom_link || "",
        days: classroom?.class_schedule?.days || [],
        start_time: classroom?.class_schedule?.start_time || "",
        end_time: classroom?.class_schedule?.end_time || "",
      },
      resolver: zodResolver(ClassroomEditSchema),
    });
  
    // Update form values when data changes
    useEffect(() => {
      if (classroom) {
        reset({
          name: classroom.name,
          proficiency_level_id: classroom.proficiency_level?.id,
          teacher_id: classroom.teacher?.id || "",
          zoom_link: classroom.zoom_link || "",
          days: classroom.class_schedule?.days || [],
          start_time: classroom.class_schedule?.start_time || "",
          end_time: classroom.class_schedule?.end_time || "",
        });
      }
    }, [classroom, reset]);

    const filteredStudents = allStudents.filter((student) => {
        const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
        return fullName.includes(search.toLowerCase());
      });
      
  
    const updateClassroomMutation = useMutation({
      mutationFn: async (data: ClassroomEditValues) => {
        if (!classroom || !id) throw new Error("No classroom data");
        
        const { error: classroomError } = await supabase
          .from("classrooms")
          .update({ 
            name: data.name, 
            proficiency_level_id: data.proficiency_level_id,
            zoom_link: data.zoom_link || null 
          })
          .eq("id", id);
    
        const { error: scheduleError } = await supabase
          .from("class_schedules")
          .update({ days: data.days, start_time: data.start_time, end_time: data.end_time })
          .eq("id", classroom.class_schedule?.id || "");
    
        const { error: teacherError } = await supabase
          .from("classroom_teachers")
          .update({ teacher_id: data.teacher_id })
          .eq("classroom_id", id);
    
        if (classroomError || scheduleError || teacherError) {
          throw new Error("Update failed.");
        }
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["classroom", id] });
        setIsEditOpen(false);
      },
    });
    
    const deleteClassroomMutation = useMutation({
      mutationFn: async () => {
        const { error } = await supabase.from("classrooms").delete().eq("id", id);
        if (error) throw error;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["classrooms"] });
        navigate("/dashboard/classrooms");
      },
    });
  
    const removeStudentMutation = useMutation({
      mutationFn: async (studentId: string) => {
        const { error } = await supabase
          .from("classroom_students")
          .delete()
          .eq("classroom_id", id)
          .eq("student_id", studentId);
        if (error) throw error;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ["classroom", id]}),
    });

    const addStudentMutation = useMutation({
        mutationFn: async (student_id: string) => {
          const { error } = await supabase
            .from("classroom_students")
            .insert({ classroom_id: id, student_id });
      
          if (error) throw error;
        },
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["classroom", id] });
        },
      });      
  
    // Create columns definition regardless of whether data is loaded
    const columns: ColumnDef<ClassroomDetails["students"][number]>[] = [
      { accessorKey: "first_name", header: "First Name" },
      { accessorKey: "last_name", header: "Last Name" },
      { accessorKey: "email", header: "Email" },
      { accessorKey: "birth_date", header: "Birth Date" },
      { accessorKey: "country", header: "Country" },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <button
            onClick={() => removeStudentMutation.mutate(row.original.id)}
            className="px-3 py-1.5 text-red-600 border border-red-600 rounded hover:bg-red-50 flex items-center gap-2 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Remove</span>
          </button>
        ),
      },
    ];
  
    if (isLoading) {
        return (
            <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
            </div>
        )
    }
    if (isError) return <p className="p-4 text-red-500">Error: {error.message}</p>;
    if (!classroom) return null;
  
    const {
      name,
      proficiency_level,
      class_schedule,
      teacher,
      students,
      zoom_link,
    } = classroom;
  
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => navigate("/dashboard/classrooms")}
              className="flex items-center gap-2 text-gray-700 hover:text-gray-900 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <h1 className="text-2xl font-bold">Classroom Details</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditOpen(true)}
                className="px-4 py-2 text-violet-600 border border-violet-600 rounded hover:bg-violet-50 flex items-center gap-2 cursor-pointer"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => {
                    deleteClassroomMutation.mutate();
                }}
                className="px-4 py-2 text-red-600 border border-red-600 rounded hover:bg-red-50 flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Name</h3>
              <p className="mt-1 text-lg">{name}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Proficiency Level</h3>
              <p className="mt-1 text-lg">{proficiency_level?.name}</p>
            </div>
            <div className="col-span-2">
              <h3 className="text-sm font-medium text-gray-500">Schedule</h3>
              {class_schedule ? (
                <div className="mt-1 space-y-1">
                  <p className="text-lg">Days: {class_schedule?.days.join(", ")}</p>
                  <p className="text-lg">Time: {class_schedule?.start_time} - {class_schedule?.end_time}</p>
                </div>
              ) : (
                <p className="mt-1 text-lg text-gray-400">No schedule assigned</p>
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Teacher</h3>
              {teacher ? (
                <p className="mt-1 text-lg">{teacher?.first_name} {teacher?.last_name}</p>
              ) : (
                <p className="mt-1 text-lg text-gray-400">No teacher assigned</p>
              )}
            </div>
            <div className="col-span-2">
              <h3 className="text-sm font-medium text-gray-500">Zoom Link</h3>
              {zoom_link ? (
                <p className="mt-1 text-lg">
                  <a href={zoom_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {zoom_link}
                  </a>
                </p>
              ) : (
                <p className="mt-1 text-lg text-gray-400">No Zoom link available</p>
              )}
            </div>
          </div>

          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Enrolled Students</h2>
              <button
                onClick={() => setIsStudentsOpen(true)}
                className="px-4 py-2 text-violet-600 border border-violet-600 rounded hover:bg-violet-50 flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Students
              </button>
            </div>
            <div className="bg-white rounded-lg">
              <Table data={students || []} columns={columns} loading={isLoading} />
            </div>
          </div>
        </div>
  
        {/* Edit Modal */}
        {isEditOpen && (
          <EditModal
            isOpen={isEditOpen}
            title="Edit Classroom"
            onClose={() => setIsEditOpen(false)}
          >
            <form className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
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
                        {proficiencyLevels?.map((level) => (
                          <option key={level.id} value={level.id}>
                            {level.name}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Days</label>
                  <Controller
                    name="days"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500"
                      />
                    )}
                  />
                </div>

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
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Zoom Link</label>
                  <Controller
                    name="zoom_link"
                    control={control}
                    render={({ field }) => (
                      <input
                        type="url"
                        placeholder="https://zoom.us/j/123456789"
                        {...field}
                        className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500"
                      />
                    )}
                  />
                  {errors.zoom_link && (
                    <p className="text-red-500 text-sm mt-1">{errors.zoom_link.message}</p>
                  )}
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Teacher</label>
                  <Controller
                    name="teacher_id"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500"
                      >
                        <option value="">Select a teacher...</option>
                        {teachers?.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.first_name} {t.last_name}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 border text-gray-600 rounded hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleSubmit((data) => updateClassroomMutation.mutate(data))}
                  className="px-4 py-2 bg-violet-500 text-white rounded hover:bg-violet-600 cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </EditModal>
        )}

        {/* Add Students Modal */}

        {isStudentsOpen && (
          <EditModal
            isOpen={isStudentsOpen}
            title="Add Students"
            onClose={() => setIsStudentsOpen(false)}
          >
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search students..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full p-2 pl-8 border rounded focus:ring-1 focus:ring-violet-500"
                />
                <svg
                  className="absolute left-2 top-2.5 h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
                </div>
              ) : (
                <div className="max-h-[400px] overflow-y-auto space-y-2">
                  {filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex justify-between items-center p-3 bg-gray-50 rounded hover:bg-gray-100"
                    >
                      <div>
                        <p className="font-medium">{student.first_name} {student.last_name}</p>
                        <p className="text-sm text-gray-500">{student.email}</p>
                      </div>
                      <button
                        onClick={() => addStudentMutation.mutate(student.id)}
                        className="px-3 py-1.5 text-violet-600 border border-violet-600 rounded hover:bg-violet-50 cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  ))}

                  {filteredStudents.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No students found
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={() => setIsStudentsOpen(false)}
                  className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-50 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </EditModal>
        )}
      </div>
    );
  };

export default ClassroomDetails;
