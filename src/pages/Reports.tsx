import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "../supabase/supabaseClient";
import { useQuery } from "@tanstack/react-query";
import { useQuarterStore } from "../store/quartersStore";
import { parseISO, eachMonthOfInterval, format, startOfMonth, endOfMonth } from "date-fns";
import { ColumnDef } from "@tanstack/react-table";
import Table from "../components/Table";
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

interface Classroom {
  id: string;
  name: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
}

interface AttendanceRecord {
  id: string;
  class_date: string;
  status: string;
  student_id: string;
  student: Student;
}

interface AttendanceReportRow {
  student_id: string;
  student_name: string;
  [date: string]: string | undefined; // Dynamic columns for each class date
}

interface GradingReport {
  id: string;
  listening: number | null;
  reading: number | null;
  writing: number | null;
  speaking: number | null;
  grammar_vocab: number | null;
  project: number | null;
  conversation: number | null;
  comment: string | null;
  student: Student;
}

interface MonthOption {
  value: string;
  label: string;
}

const Reports = () => {
  const { activeQuarter } = useQuarterStore();
  const [selectedClassroom, setSelectedClassroom] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [reportType, setReportType] = useState<string>("Attendance");
  const [availableMonths, setAvailableMonths] = useState<MonthOption[]>([]);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Calculate available months based on quarter dates
  useEffect(() => {
    if (activeQuarter?.start_date && activeQuarter?.end_date) {
      const startDate = parseISO(activeQuarter.start_date);
      const endDate = parseISO(activeQuarter.end_date);
      
      const monthsInRange = eachMonthOfInterval({ start: startDate, end: endDate });
      
      const months: MonthOption[] = monthsInRange.map(month => ({
        value: format(month, 'yyyy-MM'),
        label: format(month, 'MMMM yyyy')
      }));

      setAvailableMonths(months);
    }
  }, [activeQuarter]);

  // Fetch classrooms
  const { data: classrooms } = useQuery<Classroom[]>({
    queryKey: ["classrooms", activeQuarter?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classrooms")
        .select("id, name")
        .eq("quarter_id", activeQuarter?.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeQuarter?.id,
  });

  // Fetch attendance data
  const {
    data: attendanceData,
    isLoading: attendanceLoading,
    error: attendanceError,
  } = useQuery<AttendanceRecord[]>({
    queryKey: ["attendanceReport", activeQuarter?.id, selectedClassroom, selectedMonth],
    queryFn: async () => {
      let query = supabase
        .from("attendance")
        .select(`
          id,
          class_date,
          status,
          student_id,
          students:student_id (
            id,
            first_name,
            last_name
          )
        `)
        .eq("quarter_id", activeQuarter?.id);

      // Filter by classroom if selected
      if (selectedClassroom) {
        query = query.eq("classroom_id", selectedClassroom);
      }

      // Filter by month if selected
      if (selectedMonth) {
        const monthStart = startOfMonth(parseISO(`${selectedMonth}-01`));
        const monthEnd = endOfMonth(parseISO(`${selectedMonth}-01`));
        query = query
          .gte("class_date", format(monthStart, 'yyyy-MM-dd'))
          .lte("class_date", format(monthEnd, 'yyyy-MM-dd'));
      }

      const { data, error } = await query.order("class_date", { ascending: true });

      if (error) throw error;
      
      return data?.map(record => ({
        ...record,
        student: Array.isArray(record.students) ? record.students[0] : record.students
      })) || [];
    },
    enabled: !!activeQuarter?.id,
  });

  // Fetch grading data
  const { 
    data: gradingData,
    isLoading: gradingLoading,
    error: gradingError 
  } = useQuery<GradingReport[]>({
    queryKey: ["gradingReport", activeQuarter?.id, selectedClassroom],
    queryFn: async () => {
      let query = supabase
        .from("grading")
        .select(`
          id,
          listening,
          reading,
          writing,
          speaking,
          grammar_vocab,
          project,
          conversation,
          comment,
          student_id,
          students:student_id (
            id,
            first_name,
            last_name
          )
        `)
        .eq("quarter_id", activeQuarter?.id);

      // Filter by classroom if selected
      if (selectedClassroom) {
        query = query.eq("classroom_id", selectedClassroom);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data?.map(record => ({
        ...record,
        student: Array.isArray(record.students) ? record.students[0] : record.students
      })) || [];
    },
    enabled: !!activeQuarter?.id,
  });

  // Transform attendance data for pivot table display
  const attendanceReportData = useMemo(() => {
    if (!attendanceData || attendanceData.length === 0) {
      return { data: [], dates: [] };
    }

    // Get unique dates and sort them
    const uniqueDates = [...new Set(attendanceData.map(record => record.class_date))]
      .sort();

    // Get unique students
    const studentsMap = new Map<string, Student>();
    attendanceData.forEach(record => {
      if (record.student) {
        studentsMap.set(record.student_id, record.student);
      }
    });

    // Create pivot table data
    const pivotData: AttendanceReportRow[] = Array.from(studentsMap.values()).map(student => {
      const row: AttendanceReportRow = {
        student_id: student.id,
        student_name: `${student.first_name} ${student.last_name}`,
      };

      // Add attendance status for each date
      uniqueDates.forEach(date => {
        const attendanceRecord = attendanceData.find(
          record => record.student_id === student.id && record.class_date === date
        );
        row[date] = attendanceRecord?.status || 'No Record';
      });

      return row;
    });

    return { data: pivotData, dates: uniqueDates };
  }, [attendanceData]);

  // Define dynamic attendance columns
  const attendanceColumns: ColumnDef<AttendanceReportRow>[] = useMemo(() => {
    const baseColumns: ColumnDef<AttendanceReportRow>[] = [
      {
        accessorKey: 'student_name',
        header: 'Student Name',
      }
    ];

    // Add dynamic date columns
    const dateColumns: ColumnDef<AttendanceReportRow>[] = attendanceReportData.dates.map((date: string) => ({
      accessorKey: date,
      header: format(parseISO(date), 'MMM dd'),
      cell: ({ row }: { row: { original: AttendanceReportRow } }) => {
        const status = row.original[date] as string;
        
        // Get display value and styling - using case insensitive comparison
        let displayValue = '';
        let className = '';
        
        const statusLower = status?.toLowerCase();
        
        if (statusLower === 'present') {
          displayValue = 'P';
          className = 'bg-green-100 text-green-800';
        } else if (statusLower === 'absent') {
          displayValue = 'A';
          className = 'bg-red-100 text-red-800';
        } else if (statusLower === 'late' || statusLower === 'tardy') {
          displayValue = 'T';
          className = 'bg-yellow-100 text-yellow-800';
        } else if (status && status !== 'No Record') {
          // Show the actual status if it's something else
          displayValue = status.charAt(0).toUpperCase();
          className = 'bg-blue-100 text-blue-800';
        } else {
          displayValue = '-';
          className = 'bg-gray-100 text-gray-800';
        }
        
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${className}`}>
            {displayValue}
          </span>
        );
      }
    }));

    return [...baseColumns, ...dateColumns];
  }, [attendanceReportData.dates]);

  // Define grading table columns
  const gradingColumns: ColumnDef<GradingReport>[] = useMemo(() => [
    {
      accessorKey: 'student.name',
      header: 'Student Name',
      cell: ({ row }) => `${row.original.student?.first_name || ''} ${row.original.student?.last_name || ''}`
    },
    {
      accessorKey: 'listening',
      header: 'Listening',
      cell: ({ row }) => {
        const value = row.original.listening;
        const isLowGrade = value !== null && value < 70;
        return (
          <span className={isLowGrade ? 'bg-red-100 px-2 py-1 rounded' : ''}>
            {value ?? 'N/A'}
          </span>
        );
      }
    },
    {
      accessorKey: 'reading',
      header: 'Reading',
      cell: ({ row }) => {
        const value = row.original.reading;
        const isLowGrade = value !== null && value < 70;
        return (
          <span className={isLowGrade ? 'bg-red-100 px-2 py-1 rounded' : ''}>
            {value ?? 'N/A'}
          </span>
        );
      }
    },
    {
      accessorKey: 'writing',
      header: 'Writing',
      cell: ({ row }) => {
        const value = row.original.writing;
        const isLowGrade = value !== null && value < 70;
        return (
          <span className={isLowGrade ? 'bg-red-100 px-2 py-1 rounded' : ''}>
            {value ?? 'N/A'}
          </span>
        );
      }
    },
    {
      accessorKey: 'speaking',
      header: 'Speaking',
      cell: ({ row }) => {
        const value = row.original.speaking;
        const isLowGrade = value !== null && value < 70;
        return (
          <span className={isLowGrade ? 'bg-red-100 px-2 py-1 rounded' : ''}>
            {value ?? 'N/A'}
          </span>
        );
      }
    },
    {
      accessorKey: 'grammar_vocab',
      header: 'Grammar/Vocab',
      cell: ({ row }) => {
        const value = row.original.grammar_vocab;
        const isLowGrade = value !== null && value < 70;
        return (
          <span className={isLowGrade ? 'bg-red-100 px-2 py-1 rounded' : ''}>
            {value ?? 'N/A'}
          </span>
        );
      }
    },
    {
      accessorKey: 'project',
      header: 'Project',
      cell: ({ row }) => {
        const value = row.original.project;
        const isLowGrade = value !== null && value < 70;
        return (
          <span className={isLowGrade ? 'bg-red-100 px-2 py-1 rounded' : ''}>
            {value ?? 'N/A'}
          </span>
        );
      }
    },
    {
      accessorKey: 'conversation',
      header: 'Conversation',
      cell: ({ row }) => {
        const value = row.original.conversation;
        const isLowGrade = value !== null && value < 70;
        return (
          <span className={isLowGrade ? 'bg-red-100 px-2 py-1 rounded' : ''}>
            {value ?? 'N/A'}
          </span>
        );
      }
    },
    {
      accessorKey: 'comment',
      header: 'Comment',
      cell: ({ row }) => row.original.comment || 'No comment'
    }
  ], []);

  const downloadPDF = async () => {
    if (!reportRef.current) {
      alert("Report not found. Please make sure the report is loaded.");
      return;
    }

    setIsDownloading(true);

    try {
      // Build filename
      const classroomName =
        classrooms?.find((c) => c.id === selectedClassroom)?.name || "All";
      const monthLabel =
        availableMonths.find((m) => m.value === selectedMonth)?.label ||
        "All";
      const filename = `${reportType}_Report_${classroomName}_${monthLabel}.pdf`;

      // Capture DOM as PNG data URL
      const dataUrl = await toPng(reportRef.current, {
        cacheBust: true,
      });

      // Measure the image so we know how big it is:
      const img = new Image();
      img.src = dataUrl;
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
      });

      // Create a new jsPDF, auto‐choose orientation
      const pdf = new jsPDF({
        orientation:
          img.naturalWidth > img.naturalHeight ? "landscape" : "portrait",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(
        pdfWidth / img.naturalWidth,
        pdfHeight / img.naturalHeight
      );
      const imgX = (pdfWidth - img.naturalWidth * ratio) / 2;
      const imgY = 10; // top margin

      pdf.addImage(
        dataUrl,
        "PNG",
        imgX,
        imgY,
        img.naturalWidth * ratio,
        img.naturalHeight * ratio
      );

      pdf.save(filename);
    } catch (err) {
      console.error("Error generating PDF with html-to-image:", err);
      alert(`Error generating PDF: ${err instanceof Error ? err.message : err}`);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Reports Dashboard</h1>
        <p className="mt-2 text-gray-600">Generate and view attendance and grading reports for your classrooms</p>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex gap-4">
          <select 
            value={selectedClassroom} 
            onChange={(e) => setSelectedClassroom(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">All Classrooms</option>
            {classrooms?.map(classroom => (
              <option key={classroom.id} value={classroom.id}>
                {classroom.name}
              </option>
            ))}
          </select>

          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">All Months</option>
            {availableMonths.map(month => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>

          <select 
            value={reportType} 
            onChange={(e) => setReportType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="Attendance">Attendance</option>
            <option value="Grading">Grading</option>
          </select>

          {/* Download PDF Button */}
      {selectedClassroom && selectedMonth && (
        <button
          onClick={downloadPDF}
          disabled={isDownloading}
          className="px-4 py-2 bg-violet-600 text-white rounded-md hover:bg-violet-700 disabled:bg-violet-400 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isDownloading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Generating PDF...
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Download PDF
            </>
          )}
        </button>
      )}
        </div>
      </div>

      {/* Display any errors */}
      {attendanceError && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          Attendance Error: {attendanceError.message}
        </div>
      )}
      
      {gradingError && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          Grading Error: {gradingError.message}
        </div>
      )}

      {/* Show selection prompt when filters are not selected */}
      {(!selectedClassroom || !selectedMonth) && (
        <div className="mt-6 p-6 bg-blue-50 border border-blue-200 rounded-lg text-center">
          <h3 className="text-lg font-medium text-blue-900 mb-2">Select Filters to View Report</h3>
          <p className="text-blue-700">
            Please select both a classroom and a month to generate your {reportType.toLowerCase()} report.
          </p>
        </div>
      )}

      {/* Attendance Report Table */}
      {reportType === 'Attendance' && selectedClassroom && selectedMonth && (
        <div className="mt-6" ref={reportRef}>
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-xl font-bold text-gray-900">Attendance Report</h2>
            <div className="text-sm text-gray-600 mt-1">
              <p>Classroom: {classrooms?.find(c => c.id === selectedClassroom)?.name}</p>
              <p>Month: {availableMonths.find(m => m.value === selectedMonth)?.label}</p>
              <p>Quarter: {activeQuarter?.name}</p>
            </div>
          </div>
          <Table 
            data={attendanceReportData.data} 
            columns={attendanceColumns}
            loading={attendanceLoading}
            enableHorizontalScroll={true}
          />
        </div>
      )}

      {/* Grading Report Table */}
      {reportType === 'Grading' && selectedClassroom && selectedMonth && (
        <div className="mt-6" ref={reportRef}>
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h2 className="text-xl font-bold text-gray-900">Grading Report</h2>
            <div className="text-sm text-gray-600 mt-1">
              <p>Classroom: {classrooms?.find(c => c.id === selectedClassroom)?.name}</p>
              <p>Month: {availableMonths.find(m => m.value === selectedMonth)?.label}</p>
              <p>Quarter: {activeQuarter?.name}</p>
            </div>
          </div>
          <Table 
            data={gradingData || []} 
            columns={gradingColumns}
            loading={gradingLoading}
            enableHorizontalScroll={true}
          />
        </div>
      )}
    </div>
  );
};

export default Reports;