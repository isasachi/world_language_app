import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabase/supabaseClient";
import { differenceInYears } from "date-fns";
import Table from "../components/Table";
import type { ColumnDef } from "@tanstack/react-table";
import { useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  gender: string;
  birth_date: string;
  country: string;
}

const Students = () => {
  const navigate = useNavigate();

  const { data: students = [], isLoading } = useQuery<Student[]>({
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("id, first_name, last_name, email, phone, gender, birth_date, country");

      if (error) throw new Error(error.message);
      return data;
    },
  });

  const columns: ColumnDef<Student>[] = [
    {
      accessorKey: "first_name",
      header: "First Name",
    },
    {
      accessorKey: "last_name",
      header: "Last Name",
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "phone",
      header: "Phone",
    },
    {
      accessorKey: "gender",
      header: "Gender",
      cell: ({ row }) => (
        <span className="capitalize">{row.original.gender}</span>
      ),
    },
    {
      accessorKey: "birth_date",
      header: "Age",
      cell: ({ row }) => {
        const birthDate = new Date(row.original.birth_date);
        const age = differenceInYears(new Date(), birthDate);
        return <span>{age} years</span>;
      },
    },
    {
      accessorKey: "country",
      header: "Country",
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <button
          onClick={() => navigate(`/dashboard/students/${row.original.id}`)}
          className="p-2 text-violet-600 hover:text-violet-800 flex items-center cursor-pointer gap-1 border border-violet-600 rounded-md hover:bg-violet-50"
          title="View Details"
        >
          <Eye className="w-4 h-4" />
          <span>View</span>
        </button>
      ),
    }
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Students</h1>
      </div>

      <div className="bg-white rounded-lg shadow">
        <Table 
          data={students} 
          columns={columns} 
          loading={isLoading}
        />
      </div>
    </div>
  );
};

export default Students;