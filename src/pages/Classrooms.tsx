import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase/supabaseClient";
import { useQuarterStore } from "../store/quartersStore";
import Table from "../components/Table";
import { Eye, Plus } from "lucide-react";

type ClassroomData = {
  id: string;
  name: string;
  proficiency_level: string;
  days: string[];
  time: string;
  teacher: string;
};

const Classrooms = () => {
  const { activeQuarter } = useQuarterStore();
  const navigate = useNavigate();

  const fetchClassrooms = async (): Promise<ClassroomData[]> => {
    if (!activeQuarter?.id) return [];
  
    const { data, error } = await supabase
    .from("classrooms")
    .select(`
        id,
        name,
        proficiency_levels (
        name
        ),
        class_schedules (
        days,
        start_time,
        end_time
        ),
        classroom_teachers (
        teachers (
            first_name,
            last_name
        )
        )
    `)
    .eq("quarter_id", activeQuarter.id);

    if (error) throw new Error(error.message);
  
    return data.map((entry: any) => {
      const schedule = entry.class_schedules?.[0]; // Take the first schedule, or handle multiple if needed
      const teacher =  entry.classroom_teachers?.[0]?.teachers
        ? `${entry.classroom_teachers?.[0]?.teachers?.first_name} ${entry.classroom_teachers?.[0]?.teachers?.last_name}`
        : "Unassigned";
  
      return {
        id: entry.id,
        name: entry.name,
        proficiency_level: entry.proficiency_levels?.name || "Unknown",
        days: schedule?.days.map((day: string) => day).join(', ') || "Unscheduled",
        time: schedule ? `${schedule.start_time} - ${schedule.end_time}` : "Unscheduled",
        teacher,
      };
    });
  };
  

  const { data: classrooms, isLoading, isError } = useQuery({
    queryKey: ["classrooms", activeQuarter?.id],
    queryFn: fetchClassrooms,
    enabled: !!activeQuarter?.id,
  });

  const columns: ColumnDef<ClassroomData>[] = useMemo(
    () => [
      { accessorKey: "name", header: "Name" },
      { accessorKey: "proficiency_level", header: "Proficiency Level" },
      { accessorKey: "days", header: "Days" },
      { accessorKey: "time", header: "Time" },
      { accessorKey: "teacher", header: "Teacher" },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <button
            onClick={() => navigate(`/dashboard/classrooms/${row.original.id}`)}
            className="p-2 text-violet-600 hover:text-violet-800 flex items-center cursor-pointer gap-1 border border-violet-600 rounded-md hover:bg-violet-50"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
            <span>View</span>
          </button>
        ),
      },
    ],
    [navigate]
  );

  if (!activeQuarter) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="text-center py-8">
            <p className="text-gray-600 text-lg">Please select an active quarter first</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Classrooms</h1>
          <button
            onClick={() => navigate("/dashboard/classrooms/create")}
            className="px-4 py-2 text-violet-600 border border-violet-600 rounded hover:bg-violet-50 flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Classroom</span>
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
          </div>
        ) : isError ? (
          <div className="text-center py-8">
            <p className="text-red-500 text-lg">Error loading classrooms</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg">
            <Table 
              data={classrooms ?? []} 
              columns={columns} 
              loading={isLoading} 
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Classrooms;
