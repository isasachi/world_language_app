import { useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "../supabase/supabaseClient";
import { useQuarterStore } from "../store/quartersStore";
import { Quarter } from "../types/Quarter";
import Table from "../components/Table";
import EditModal from "../components/EditModal";
import { quarterSchema } from "../schemas/index";
import { Plus, Edit } from "lucide-react";

//Define TypeScript Type from Zod Schema
type QuarterFormData = z.infer<typeof quarterSchema>;

const Quarters = () => {

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedQuarter, setSelectedQuarter] = useState<Quarter | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { activeQuarter, setActiveQuarter } = useQuarterStore();

  const queryClient = useQueryClient();

  //React Hook Form Setup
  const { control, handleSubmit, reset, formState: { errors } } = useForm<QuarterFormData>({
    resolver: zodResolver(quarterSchema),
    mode: "onBlur",
  });

  const fetchQuarters = async (): Promise<Quarter[]> => {
    const { data, error } = await supabase.from("quarters").select("*");
    if (error) throw new Error(error.message);
    return data;
  };

  const { data: quarters, isLoading: isLoadingQuarters, isError: isErrorQuarters } = useQuery<Quarter[]>({
    queryKey: ["quarters"],
    queryFn: fetchQuarters,
  });
  
  const handleEditClick = (quarter: Quarter) => {
    setSelectedQuarter({
      ...quarter,
      break_dates: Array.isArray(quarter.break_dates) ? quarter.break_dates : [],
    });
    setIsModalOpen(true);
    setTimeout(() => reset(quarter), 0);
  };
  
  //Mutation to create a new quarter
  const createQuarter = useMutation({
    mutationFn: async (newQuarter: QuarterFormData) => {
      const { error } = await supabase.from("quarters").insert({
        name: newQuarter.name,
        start_date: newQuarter.start_date,
        end_date: newQuarter.end_date,
        break_dates: newQuarter.break_dates,
        active: false,
      });
  
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quarters"] });
      setIsCreateModalOpen(false);
      reset();
    },
  });
  

  const handleUpdate = useMutation({
    mutationFn: async (updatedQuarter: QuarterFormData & { id: string }) => {
      const { error } = await supabase
        .from("quarters")
        .update({
          name: updatedQuarter.name,
          start_date: updatedQuarter.start_date,
          end_date: updatedQuarter.end_date,
          break_dates: updatedQuarter.break_dates,
        })
        .eq("id", updatedQuarter.id);
  
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quarters"] });
      setIsModalOpen(false);
    },
  });    
  
  const handleDelete = useMutation({
    mutationFn: async (quarterId: string) => {
      const { error } = await supabase.from("quarters").delete().eq("id", quarterId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quarters"] });
      setIsModalOpen(false);
    },
  });
  
  const handleActivate = useMutation({
    mutationFn: async (quarterId: string) => {
      // Primero desactivar los demás trimestres
      const { error: deactivateError } = await supabase
        .from("quarters")
        .update({ active: false })
        .neq("id", quarterId);
  
      if (deactivateError) throw new Error(deactivateError.message);
  
      // Activar el trimestre seleccionado
      const { data, error } = await supabase
        .from("quarters")
        .update({ active: true })
        .eq("id", quarterId)
        .select()
        .single();
  
      if (error) throw new Error(error.message);
  
      return data; // Retornar el trimestre actualizado
    },
    onSuccess: (updatedQuarter) => {
      queryClient.invalidateQueries({ queryKey: ["quarters"] });
      setActiveQuarter(updatedQuarter); //Actualizar correctamente el trimestre activo
    },
  });
  
  

  const columns: ColumnDef<Quarter>[] = [
    { accessorKey: "name", header: "Name", cell: (info) => info.getValue() },
    { accessorKey: "start_date", header: "Start Date", cell: (info) => new Date(info.getValue() as string).toLocaleDateString() },
    { accessorKey: "end_date", header: "End Date", cell: (info) => new Date(info.getValue() as string).toLocaleDateString() },
    {
        accessorKey: "break_dates",
        header: "Break Dates",
        cell: (info) => {
          const breakDates = info.getValue() as string[];
      
          if (!breakDates || !Array.isArray(breakDates)) return "N/A";
      
          return (
            <div className="flex flex-col">
              {breakDates.map((date, index) => (
                <span key={index} className="block text-sm text-gray-600">
                  {new Date(date).toLocaleDateString()}
                </span>
              ))}
            </div>
          )
          
        },
      },
    {
      accessorKey: "active",
      header: "Status",
      cell: (info) => (
        <span className={`px-2 py-1 text-sm font-semibold rounded-lg ${info.getValue() ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
          {info.getValue() ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const quarter = row.original;
            return (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleEditClick(quarter)}
                  className="px-3 py-1.5 text-violet-600 border border-violet-600 rounded hover:bg-violet-50 flex items-center gap-2 cursor-pointer"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit</span>
                </button>
                {!quarter.active && quarter.id !== activeQuarter?.id && (
                  <button
                    onClick={() => handleActivate.mutate(quarter.id)}
                    disabled={handleActivate.isPending}
                    className="px-3 py-1.5 text-gray-600 border border-gray-600 rounded hover:bg-gray-50 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {handleActivate.isPending ? "Activating..." : "Activate"}
                  </button>
                )}
              </div>
            );
      },
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Quarters</h1>
        <button
          onClick={() => {
            reset({
              name: '',
              start_date: '',
              end_date: '',
              break_dates: [],
            });
            setIsCreateModalOpen(true);
          }}
          className="px-4 py-2 text-violet-600 border border-violet-600 rounded hover:bg-violet-50 flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Quarter</span>
        </button>
      </div>

      {/* Create Modal */}
      <EditModal
        isOpen={isCreateModalOpen}
        title="Create New Quarter"
        onClose={() => setIsCreateModalOpen(false)}
        actions={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit((data) => createQuarter.mutate(data))}
              className="px-4 py-2 bg-violet-500 text-white rounded hover:bg-violet-600 cursor-pointer"
            >
              Create Quarter
            </button>
          </div>
        }
      >
        <form className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <>
                  <input
                    {...field}
                    type="text"
                    className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                  )}
                </>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <Controller
                name="start_date"
                control={control}
                render={({ field }) => (
                  <>
                    <input
                      {...field}
                      type="date"
                      className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500"
                    />
                    {errors.start_date && (
                      <p className="text-red-500 text-sm mt-1">{errors.start_date.message}</p>
                    )}
                  </>
                )}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <Controller
                name="end_date"
                control={control}
                render={({ field }) => (
                  <>
                    <input
                      {...field}
                      type="date"
                      className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500"
                    />
                    {errors.end_date && (
                      <p className="text-red-500 text-sm mt-1">{errors.end_date.message}</p>
                    )}
                  </>
                )}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Break Dates</label>
            <Controller
              name="break_dates"
              control={control}
              render={({ field }) => (
                <>
                  <input
                    {...field}
                    type="text"
                    className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500"
                    placeholder="e.g. 2024-06-15, 2024-07-04"
                    value={field.value ? field.value.join(", ") : ""}
                    onChange={(e) => field.onChange(e.target.value.split(",").map((d) => d.trim()))}
                  />
                  {errors.break_dates && (
                    <p className="text-red-500 text-sm mt-1">{errors.break_dates.message}</p>
                  )}
                </>
              )}
            />
          </div>
        </form>
      </EditModal>

      {/* Loading and Error Messages */}
      {isLoadingQuarters ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
        </div>
      ) : isErrorQuarters ? (
        <div className="text-center py-8">
          <p className="text-red-500">Error fetching quarters</p>
        </div>
      ) : quarters?.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No quarters found. Click "Create Quarter" to add one.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg">
          <Table data={quarters || []} columns={columns} loading={isLoadingQuarters} />
        </div>
      )}


      {/* Edit Modal */}
      {selectedQuarter && (
        <EditModal
          isOpen={isModalOpen}
          title="Edit Quarter"
          onClose={() => setIsModalOpen(false)}
          actions={
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit((data) => handleUpdate.mutate({ ...data, id: selectedQuarter.id }))}
                className="px-4 py-2 bg-violet-500 text-white rounded hover:bg-violet-600 cursor-pointer"
              >
                Save Changes
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to delete this quarter?')) {
                    handleDelete.mutate(selectedQuarter.id)
                  }
                }}
                className="px-4 py-2 text-red-600 border border-red-600 rounded hover:bg-red-50 cursor-pointer"
              >
                Delete
              </button>
            </div>
          }
        >
          <form className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <Controller
                name="name"
                control={control}
                defaultValue={selectedQuarter.name}
                render={({ field }) => (
                  <>
                    <input
                      {...field}
                      type="text"
                      className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500"
                    />
                    {errors.name && (
                      <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                    )}
                  </>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <Controller
                  name="start_date"
                  control={control}
                  defaultValue={selectedQuarter.start_date}
                  render={({ field }) => (
                    <>
                      <input
                        {...field}
                        type="date"
                        className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500"
                      />
                      {errors.start_date && (
                        <p className="text-red-500 text-sm mt-1">{errors.start_date.message}</p>
                      )}
                    </>
                  )}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">End Date</label>
                <Controller
                  name="end_date"
                  control={control}
                  defaultValue={selectedQuarter.end_date}
                  render={({ field }) => (
                    <>
                      <input
                        {...field}
                        type="date"
                        className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500"
                      />
                      {errors.end_date && (
                        <p className="text-red-500 text-sm mt-1">{errors.end_date.message}</p>
                      )}
                    </>
                  )}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Break Dates</label>
              <Controller
                name="break_dates"
                control={control}
                render={({ field }) => (
                  <>
                    <input
                      {...field}
                      type="text"
                      className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500"
                      placeholder="e.g. 2024-06-15, 2024-07-04"
                      value={field.value ? field.value.join(", ") : ""}
                      onChange={(e) => field.onChange(e.target.value.split(",").map((d) => d.trim()))}
                    />
                    {errors.break_dates && (
                      <p className="text-red-500 text-sm mt-1">{errors.break_dates.message}</p>
                    )}
                  </>
                )}
              />
            </div>
          </form>
        </EditModal>
      )}
    </div>
  </div>
  );
};

export default Quarters;