import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { supabase } from "../supabase/supabaseClient";
import { useQuarterStore } from "../store/quartersStore";

interface Classroom {
  id: string;
  name: string;
  students: Student[];
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
}

const gradingSchema = z.object({
  listening: z.number().min(0).max(100),
  reading: z.number().min(0).max(100),
  writing: z.number().min(0).max(100),
  speaking: z.number().min(0).max(100),
  grammar_vocab: z.number().min(0).max(100),
  project: z.number().min(0).max(100),
  conversation: z.number().min(0).max(100),
  comment: z.string().optional(),
  student_id: z.string(),
  classroom_id: z.string(),
  quarter_id: z.string()
});

type GradingFormValues = z.infer<typeof gradingSchema>;

const Grading = () => {
    const [selectedClassroom, setSelectedClassroom] = useState<string>("");
    const [selectedStudent, setSelectedStudent] = useState<string>("");
    const { activeQuarter } = useQuarterStore();
    const queryClient = useQueryClient();
  
    const { register, handleSubmit, formState: { errors }, reset } = useForm<GradingFormValues>({
        resolver: zodResolver(gradingSchema),
        defaultValues: {
          classroom_id: selectedClassroom,
          student_id: selectedStudent,
          quarter_id: activeQuarter?.id
        }
      });
  
    const { data: classrooms, isLoading: isLoadingClassrooms } = useQuery<Classroom[]>({
      queryKey: ["classrooms"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("classrooms")
          .select(`
            id,
            name,
            students:classroom_students(
              student:student_id(
                id,
                first_name,
                last_name
              )
            )
          `);
  
        if (error) throw error;
        return data.map((classroom: any) => ({
          ...classroom,
          students: classroom.students.map((s: any) => s.student)
        }));
      },
    });

    const { data: existingGrade, isLoading: isLoadingGrades } = useQuery({
        queryKey: ["grades", selectedStudent, selectedClassroom, activeQuarter?.id],
        queryFn: async () => {
        const { data, error } = await supabase
            .from("grading")
            .select("*")
            .eq("student_id", selectedStudent)
            .eq("classroom_id", selectedClassroom)
            .eq("quarter_id", activeQuarter?.id)
            .single();
    
        if (error && error.code !== 'PGRST116') throw error;
        return data;
        },
        enabled: !!selectedStudent && !!selectedClassroom && !!activeQuarter?.id,
    });
  
    const savingGradeMutation = useMutation({
        mutationFn: async (data: GradingFormValues) => {
          const { error } = await supabase
            .from("grading")
            .upsert({
              ...data,
              classroom_id: selectedClassroom,
              student_id: selectedStudent,
              quarter_id: activeQuarter?.id
            }, {
              onConflict: 'student_id,classroom_id,quarter_id'
            });
      
          if (error) throw error;
        },
        onSuccess: () => {
          queryClient.invalidateQueries({ 
            queryKey: ["grades", selectedStudent, selectedClassroom, activeQuarter?.id] 
          });
        },
      });

    useEffect(() => {
        if (existingGrade) {
          reset({
            ...existingGrade,
            classroom_id: selectedClassroom,
            student_id: selectedStudent,
            quarter_id: activeQuarter?.id
          });
        } else {
          reset({
            classroom_id: selectedClassroom,
            student_id: selectedStudent,
            quarter_id: activeQuarter?.id,
            listening: 0,
            reading: 0,
            writing: 0,
            speaking: 0,
            grammar_vocab: 0,
            project: 0,
            conversation: 0,
            comment: ''
          });
        }
      }, [existingGrade, selectedStudent, selectedClassroom, activeQuarter?.id, reset]);
  
      if (isLoadingClassrooms) {
        return (
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
          </div>
        );
      }
  
      return (
        <div className="p-6 max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">Student Grading</h1>
            </div>
      
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Panel - Selection */}
              <div className="col-span-1">
                {/* Classroom Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-1">Select Classroom</label>
                  <select
                    value={selectedClassroom}
                    onChange={(e) => setSelectedClassroom(e.target.value)}
                    className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500"
                  >
                    <option value="">Select a classroom...</option>
                    {classrooms?.map((classroom) => (
                      <option key={classroom.id} value={classroom.id}>
                        {classroom.name}
                      </option>
                    ))}
                  </select>
                </div>
      
                {/* Students List */}
                {selectedClassroom && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Select Student</label>
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                      {classrooms
                        ?.find(c => c.id === selectedClassroom)
                        ?.students.map((student) => (
                          <button
                            key={student.id}
                            onClick={() => setSelectedStudent(student.id)}
                            className={`w-full p-2 text-left rounded border transition-colors cursor-pointer
                              ${selectedStudent === student.id
                                ? 'bg-violet-500 text-white border-violet-500'
                                : 'border-gray-200 hover:bg-violet-50 hover:border-violet-500'
                              }`}
                          >
                            {student.first_name} {student.last_name}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
      
              {/* Right Panel - Grading Form */}
              {selectedStudent && selectedClassroom && (
                <div className="col-span-2">
                  {isLoadingGrades ? (
                    <div className="flex items-center justify-center h-96">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
                    </div>
                  ) : (
                    <form 
                      onSubmit={handleSubmit((data) => savingGradeMutation.mutate(data))} 
                      className="bg-gray-50 rounded-lg border border-gray-200 p-6"
                    >
                      <div className="grid grid-cols-2 gap-6">
                        {['listening', 'reading', 'writing', 'speaking', 'grammar_vocab', 'project', 'conversation'].map((field) => (
                          <div key={field}>
                            <label className="block text-sm font-medium mb-1 capitalize">
                              {field.replace('_', ' ')}
                            </label>
                            <input
                              type="number"
                              {...register(field as keyof GradingFormValues, { valueAsNumber: true })}
                              className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500"
                            />
                            {errors[field as keyof GradingFormValues] && (
                              <p className="text-red-500 text-sm mt-1">
                                {errors[field as keyof GradingFormValues]?.message?.toString()}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
      
                      <div className="mt-6">
                        <label className="block text-sm font-medium mb-1">Teacher's Comment</label>
                        <textarea
                          {...register('comment')}
                          rows={4}
                          className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500 resize-none"
                        />
                      </div>
      
                      <button
                        type="submit"
                        disabled={savingGradeMutation.isPending}
                        className="mt-6 w-full px-4 py-2 bg-violet-500 text-white rounded hover:bg-violet-600 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                      >
                        {savingGradeMutation.isPending ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          "Save Grades"
                        )}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
  };
  
  export default Grading;