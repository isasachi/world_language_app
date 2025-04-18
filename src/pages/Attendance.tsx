import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { supabase } from "../supabase/supabaseClient";
import { useQuarterStore } from "../store/quartersStore";
import { format, isWeekend, parseISO } from "date-fns";
import AttendanceStatus from "../components/AttendanceStatus";

interface Classroom {
  id: string;
  name: string;
  class_schedule: ClassSchedule;
  students: Student[];
}

interface ClassSchedule {
  id: string;
  days: string[];
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
}

interface AttendanceRecord {
    classroom_id: string;
    student_id: string;
    quarter_id: string;
    class_date: string;
    status: AttendanceStatus;
  }

type AttendanceStatus = "present" | "absent" | "tardy";

const Attendance = () => {
    const [selectedClassroom, setSelectedClassroom] = useState<string>("");
    const [selectedDate, setSelectedDate] = useState<string>("");
    const [attendanceRecords, setAttendanceRecords] = useState<Map<string, AttendanceStatus>>(new Map());
    const { activeQuarter } = useQuarterStore();
    const queryClient = useQueryClient();
  
    // Fetch classrooms with schedules and students
    const { data: classrooms, isLoading: isLoadingClassrooms } = useQuery<Classroom[]>({
      queryKey: ["classrooms"],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("classrooms")
          .select(`
            id,
            name,
            class_schedule:class_schedules(id, days),
            students:classroom_students(
              student:student_id(id, first_name, last_name)
            )
          `);
  
        if (error) throw error;
        return data.map((classroom: any) => ({
          ...classroom,
          class_schedule: classroom.class_schedule[0],
          students: classroom.students.map((s: any) => s.student)
        }));
      },
    });

    const { data: existingAttendance } = useQuery<AttendanceRecord[]>({
        queryKey: ["attendance", selectedClassroom, selectedDate, activeQuarter?.id],
        queryFn: async () => {
          const { data, error } = await supabase
            .from("attendance")
            .select("*")
            .eq("classroom_id", selectedClassroom)
            .eq("class_date", selectedDate)
            .eq("quarter_id", activeQuarter?.id);
      
          if (error) throw error;
          return data;
        },
        enabled: !!selectedClassroom && !!selectedDate && !!activeQuarter?.id,
    });

      useEffect(() => {
        if (existingAttendance) {
          const recordsMap = new Map(
            existingAttendance.map(record => [record.student_id, record.status])
          );
          setAttendanceRecords(recordsMap);
        }
      }, [existingAttendance]);
  
    // Calculate available class dates
    const classDates = useMemo(() => {
      if (!selectedClassroom || !activeQuarter) return [];
  
      const classroom = classrooms?.find(c => c.id === selectedClassroom);
      if (!classroom?.class_schedule.days) return [];
  
      const dates: Date[] = [];
      let currentDate = parseISO(activeQuarter.start_date);
      const endDate = parseISO(activeQuarter.end_date);
      const breakDates = activeQuarter.break_dates.map(d => parseISO(d));
  
      while (currentDate <= endDate) {
        if (
          classroom.class_schedule.days.includes(format(currentDate, 'EEEE')) &&
          !isWeekend(currentDate) &&
          !breakDates.some(breakDate => 
            format(breakDate, 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd')
          )
        ) {
          dates.push(currentDate);
        }
        currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
      }
  
      return dates;
    }, [selectedClassroom, activeQuarter]);
  
    // Save attendance mutation
    const saveAttendanceMutation = useMutation({
        mutationFn: async () => {
          if (!activeQuarter?.id) {
            throw new Error("No active quarter selected");
          }
    
          const records = Array.from(attendanceRecords.entries()).map(([studentId, status]) => ({
            classroom_id: selectedClassroom,
            student_id: studentId,
            class_date: selectedDate,
            quarter_id: activeQuarter.id,
            status,
          }));
    
          const { error } = await supabase
            .from("attendance")
            .upsert(records, { 
              onConflict: 'classroom_id,student_id,class_date,quarter_id',
              ignoreDuplicates: false 
          });
    
          if (error) throw error;
        },
        onSuccess: () => {
          queryClient.invalidateQueries({ 
            queryKey: ["attendance", selectedClassroom, selectedDate, activeQuarter?.id] 
          });
        },
    });
  
    const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
      setAttendanceRecords(prev => new Map(prev).set(studentId, status));
    };

    if (!activeQuarter) {
        return (
          <div className="flex items-center justify-center min-h-screen">
            <p className="text-lg text-gray-600">Please select an active quarter first</p>
          </div>
        );
    }
  
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
            <h1 className="text-2xl font-bold">Attendance Management</h1>
          </div>
    
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Classroom Selection */}
            <div className="col-span-1">
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
    
              {/* Date Selection */}
              {selectedClassroom && (
                <div className="mt-6">
                  <label className="block text-sm font-medium mb-1">Select Date</label>
                  <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                    {classDates.map((date) => (
                      <button
                        key={date.toISOString()}
                        onClick={() => setSelectedDate(format(date, 'yyyy-MM-dd'))}
                        className={`w-full p-2 text-left rounded border transition-colors cursor-pointer
                          ${selectedDate === format(date, 'yyyy-MM-dd')
                            ? 'bg-violet-500 text-white border-violet-500'
                            : 'border-gray-200 hover:bg-violet-50 hover:border-violet-500'
                          }`}
                      >
                        {format(date, 'MMMM d, yyyy')}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
    
            {/* Attendance Form */}
            {selectedClassroom && selectedDate && (
              <div className="col-span-2">
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    Record Attendance for {format(parseISO(selectedDate), 'MMMM d, yyyy')}
                  </h2>
                  
                  <div className="space-y-3">
                    {classrooms
                      ?.find(c => c.id === selectedClassroom)
                      ?.students.map((student) => (
                        <div 
                          key={student.id} 
                          className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-violet-200 transition-colors"
                        >
                          <span className="font-medium text-gray-700">
                            {student.first_name} {student.last_name}
                          </span>
                          <div className="flex items-center gap-3">
                            {["present", "absent", "tardy"].map((status) => (
                              <AttendanceStatus
                                key={status}
                                status={status}
                                selected={attendanceRecords.get(student.id) === status}
                                onClick={() => handleStatusChange(student.id, status as AttendanceStatus)}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
    
                  <button
                    onClick={() => saveAttendanceMutation.mutate()}
                    disabled={saveAttendanceMutation.isPending}
                    className="mt-6 w-full px-4 py-2 bg-violet-500 text-white rounded hover:bg-violet-600 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {saveAttendanceMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      "Save Attendance"
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  export default Attendance;