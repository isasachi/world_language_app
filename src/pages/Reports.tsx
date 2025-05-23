import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabase/supabaseClient";
import { format, parseISO } from "date-fns";
import React from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Calendar, Download } from "lucide-react";

// Import or recreate Select component interface
interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  value: string;
}

// Simple Select component
const Select: React.FC<SelectProps> = ({
  options,
  className = "",
  ...props
}) => {
  return (
    <select
      className={`w-full p-2 border rounded focus:ring-1 focus:ring-violet-500 ${className}`}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

// Define types
interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
}

interface Classroom {
  id: string;
  name: string;
  teacher_id: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  attendanceRecords?: AttendanceRecord[];
  grades?: Grade[];
}

interface DisplayGrade {
  id: string;
  student_id: string;
  skill_id: string;
  skill_name: string;
  score: number;
  date?: string;
  comment?: string;
}

interface Quarter {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
}

interface AttendanceRecord {
  id: string;
  classroom_id: string;
  student_id: string;
  quarter_id: string;
  class_date: string;
  status: "present" | "absent" | "tardy";
  comment?: string;
}

// Database Grade Schema
interface Grade {
  id: string;
  student_id: string;
  classroom_id: string;
  quarter_id: string;
  listening: number;
  reading: number;
  writing: number;
  speaking: number;
  grammar_vocab: number;
  project: number;
  conversation: number;
  comment?: string;
}

interface ReportData {
  students: Student[];
  startDate: string;
  endDate: string;
  quarter: Quarter | null;
}

const Reports = () => {
  console.log("Reports component loading");

  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const [selectedClassroom, setSelectedClassroom] = useState<string>("");
  const [selectedQuarter, setSelectedQuarter] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [reportType, setReportType] = useState<"attendance" | "grades">(
    "attendance",
  );
  const [reportData, setReportData] = useState<ReportData | null>(null);

  // Fetch teachers
  const { data: teachers } = useQuery<Teacher[]>({
    queryKey: ["teachers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teachers")
        .select("id, first_name, last_name");

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch quarters
  const { data: quarters } = useQuery<Quarter[]>({
    queryKey: ["quarters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quarters")
        .select("id, name, start_date, end_date");

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch classrooms when teacher is selected
  const { data: classrooms } = useQuery<Classroom[]>({
    queryKey: ["classrooms", selectedTeacher],
    queryFn: async () => {
      if (!selectedTeacher) return [];

      const { data, error } = await supabase
        .from("classroom_teachers")
        .select(
          `
          classroom_id,
          classrooms (
            id,
            name
          )
        `,
        )
        .eq("teacher_id", selectedTeacher);

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (
        data?.map((item: any) => ({
          id: item.classroom_id,
          name: item.classrooms.name,
          teacher_id: selectedTeacher,
        })) || []
      );
    },
    enabled: !!selectedTeacher,
  });

  // Fetch students and their attendance/grades
  const { data: students, isLoading: isLoadingStudents } = useQuery<Student[]>({
    queryKey: ["students", selectedClassroom, reportType],
    queryFn: async () => {
      if (!selectedClassroom) return [];

      const { data, error } = await supabase
        .from("classroom_students")
        .select(
          `
          student_id,
          student:student_id (
            id,
            first_name,
            last_name
          )
        `,
        )
        .eq("classroom_id", selectedClassroom);

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (
        data?.map((item: any) => ({
          id: item.student.id,
          first_name: item.student.first_name,
          last_name: item.student.last_name,
        })) || []
      );
    },
    enabled: !!selectedClassroom,
  });

  // Get available months based on the selected quarter
  const getAvailableMonths = () => {
    if (!selectedQuarter || !quarters) return [];

    const quarter = quarters.find((q) => q.id === selectedQuarter);
    if (!quarter) return [];

    const startDate = parseISO(quarter.start_date);
    const endDate = parseISO(quarter.end_date);

    const months: SelectOption[] = [];
    let currentDate = startDate;

    while (currentDate <= endDate) {
      const monthKey = format(currentDate, "yyyy-MM");
      const monthName = format(currentDate, "MMMM yyyy");

      if (!months.find((m) => m.value === monthKey)) {
        months.push({ value: monthKey, label: monthName });
      }

      // Move to the next month
      currentDate = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        1,
      );
    }

    return months;
  };

  // Fetch attendance or grades data
  useEffect(() => {
    const fetchReportData = async () => {
      if (
        !selectedClassroom ||
        !selectedQuarter ||
        !selectedMonth ||
        !quarters ||
        !students
      ) {
        setReportData(null);
        return;
      }

      const quarter = quarters.find((q) => q.id === selectedQuarter);
      if (!quarter) {
        setReportData(null);
        return;
      }

      // Parse dates
      const quarterStartDate = parseISO(quarter.start_date);
      const quarterEndDate = parseISO(quarter.end_date);

      // Parse selected month (format: "yyyy-MM")
      const [year, month] = selectedMonth.split("-").map(Number);

      // Create start and end date for the selected month
      let monthStartDate = new Date(year, month - 1, 1);
      let monthEndDate = new Date(year, month, 0); // Last day of the month

      // Adjust dates to be within quarter boundaries
      if (monthStartDate < quarterStartDate) {
        monthStartDate = quarterStartDate;
      }

      if (monthEndDate > quarterEndDate) {
        monthEndDate = quarterEndDate;
      }

      // Format dates for queries
      const startDateStr = format(monthStartDate, "yyyy-MM-dd");
      const endDateStr = format(monthEndDate, "yyyy-MM-dd");

      // Clone students array
      const studentsWithData = [...students];

      if (reportType === "attendance") {
        // Fetch attendance records
        const { data: attendanceData, error: attendanceError } = await supabase
          .from("attendance")
          .select(
            "id, classroom_id, student_id, quarter_id, class_date, status, notes",
          )
          .eq("classroom_id", selectedClassroom)
          .gte("class_date", startDateStr)
          .lte("class_date", endDateStr);

        if (attendanceError) {
          console.error("Error fetching attendance:", attendanceError);
          // Set empty attendance records for display
          for (const student of studentsWithData) {
            student.attendanceRecords = [];
          }
        } else {
          // Assign attendance records to students
          for (const student of studentsWithData) {
            student.attendanceRecords =
              attendanceData
                ?.filter((record) => record.student_id === student.id)
                .sort(
                  (a, b) =>
                    new Date(a.class_date).getTime() -
                    new Date(b.class_date).getTime(),
                ) || [];
          }
        }
      } else if (reportType === "grades") {
        // Fetch grades
        const { data: gradesData, error: gradesError } = await supabase
          .from("grading")
          .select("*")
          .eq("classroom_id", selectedClassroom)
          .eq("quarter_id", quarter.id);

        if (gradesError) {
          console.error("Error fetching grades:", gradesError);
          // Set empty grades records for display
          for (const student of studentsWithData) {
            student.grades = [];
          }
        } else {
          // Assign grades to students with converted format for display
          for (const student of studentsWithData) {
            const studentGrade = gradesData.find(
              (grade) => grade.student_id === student.id,
            );

            if (studentGrade) {
              // Convert to display format with skill_name and score
              student.grades = [
                {
                  id: `${studentGrade.id}-listening`,
                  student_id: student.id,
                  skill_id: "listening",
                  skill_name: "Listening",
                  score: studentGrade.listening || 0,
                  date: startDateStr,
                  comment: studentGrade.comment,
                },
                {
                  id: `${studentGrade.id}-reading`,
                  student_id: student.id,
                  skill_id: "reading",
                  skill_name: "Reading",
                  score: studentGrade.reading || 0,
                  date: startDateStr,
                  comment: studentGrade.comment,
                },
                {
                  id: `${studentGrade.id}-writing`,
                  student_id: student.id,
                  skill_id: "writing",
                  skill_name: "Writing",
                  score: studentGrade.writing || 0,
                  date: startDateStr,
                  comment: studentGrade.comment,
                },
                {
                  id: `${studentGrade.id}-speaking`,
                  student_id: student.id,
                  skill_id: "speaking",
                  skill_name: "Speaking",
                  score: studentGrade.speaking || 0,
                  date: startDateStr,
                  comment: studentGrade.comment,
                },
                {
                  id: `${studentGrade.id}-grammar`,
                  student_id: student.id,
                  skill_id: "grammar_vocab",
                  skill_name: "Grammar & Vocabulary",
                  score: studentGrade.grammar_vocab || 0,
                  date: startDateStr,
                  comment: studentGrade.comment,
                },
                {
                  id: `${studentGrade.id}-project`,
                  student_id: student.id,
                  skill_id: "project",
                  skill_name: "Project",
                  score: studentGrade.project || 0,
                  date: startDateStr,
                  comment: studentGrade.comment,
                },
                {
                  id: `${studentGrade.id}-conversation`,
                  student_id: student.id,
                  skill_id: "conversation",
                  skill_name: "Conversation",
                  score: studentGrade.conversation || 0,
                  date: startDateStr,
                  comment: studentGrade.comment,
                },
              ];
            } else {
              student.grades = [];
            }
          }
        }
      }

      setReportData({
        students: studentsWithData,
        startDate: startDateStr,
        endDate: endDateStr,
        quarter: quarter,
      });
    };

    fetchReportData();
  }, [
    selectedClassroom,
    selectedQuarter,
    selectedMonth,
    reportType,
    quarters,
    students,
  ]);

  // Generate PDF report
  const downloadPdf = async () => {
    if (
      !reportData ||
      !reportData.students ||
      reportData.students.length === 0
    ) {
      alert("No data available to generate report");
      return;
    }

    try {
      console.log("Starting PDF generation", {
        reportType,
        selectedTeacher,
        selectedClassroom,
      });

      // Create a new PDF document
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      // Add report title and metadata
      const title = `${reportType === "attendance" ? "Attendance" : "Grades"} Report`;
      const dateRange = `${format(parseISO(reportData.startDate), "MMMM d, yyyy")} - ${format(parseISO(reportData.endDate), "MMMM d, yyyy")}`;
      const classroom =
        classrooms?.find((c) => c.id === selectedClassroom)?.name || "";
      const teacher =
        teachers?.find((t) => t.id === selectedTeacher)?.last_name || "";

      // Add title to PDF
      doc.setFontSize(18);
      doc.text(title, doc.internal.pageSize.width / 2, 20, { align: "center" });

      doc.setFontSize(14);
      doc.text(
        `${classroom} - ${teacher}`,
        doc.internal.pageSize.width / 2,
        30,
        { align: "center" },
      );

      doc.setFontSize(12);
      doc.text(dateRange, doc.internal.pageSize.width / 2, 40, {
        align: "center",
      });

      if (reportType === "attendance") {
        // Get all unique dates from attendance records
        const allDates = new Set<string>();
        reportData.students.forEach((student) => {
          student.attendanceRecords?.forEach((record) => {
            allDates.add(record.class_date);
          });
        });

        // Sort dates chronologically
        const dates = Array.from(allDates).sort();

        if (dates.length === 0) {
          doc.text("No attendance records found for this period", 20, 60);
          doc.save(
            `${reportType}-report-${format(new Date(), "yyyy-MM-dd")}.pdf`,
          );
          return;
        }

        // Prepare table headers and body
        const headers = ["Student Name"];
        dates.forEach((date) => {
          headers.push(format(parseISO(date), "MMM dd"));
        });
        headers.push("Comments");

        // Prepare rows for each student
        const rows = reportData.students.map((student) => {
          const row = [`${student.first_name} ${student.last_name}`];

          // Add attendance status for each date
          dates.forEach((date) => {
            const record = student.attendanceRecords?.find(
              (r) => r.class_date === date,
            );
            const status = record?.status || "-";

            // Convert status to symbols for clarity
            const statusSymbol =
              status === "present"
                ? "/"
                : status === "absent"
                  ? "X"
                  : status === "tardy"
                    ? "T"
                    : "-";

            row.push(statusSymbol);
          });

          // Add comments
          const comments = student.attendanceRecords
            ?.filter((r) => r.comment)
            .map(
              (r) => `${format(parseISO(r.class_date), "MM/dd")}: ${r.comment}`,
            )
            .join("; ");

          row.push(comments || "");

          return row;
        });

        // Generate table in PDF
        autoTable(doc, {
          head: [headers],
          body: rows,
          startY: 50,
          theme: "striped",
          styles: {
            overflow: "linebreak",
            cellWidth: "wrap",
            fontSize: 9,
            cellPadding: 3,
          },
          columnStyles: {
            0: { cellWidth: 40 },
            [headers.length - 1]: { cellWidth: 60 },
          },
          headStyles: {
            fillColor: [90, 50, 160],
            textColor: 255,
            fontStyle: "bold",
          },
        });
      } else {
        // Get all skills from grades
        const allSkills = new Set<string>();
        reportData.students.forEach((student) => {
          student.grades?.forEach((grade) => {
            if (grade.skill_name) allSkills.add(grade.skill_name);
          });
        });

        // Use default skills if none found
        if (allSkills.size === 0) {
          [
            "Listening",
            "Reading",
            "Writing",
            "Speaking",
            "Grammar & Vocabulary",
            "Project",
            "Conversation",
          ].forEach((skill) => allSkills.add(skill));
        }

        // Sort skills alphabetically
        const skills = Array.from(allSkills).sort();

        // Prepare table headers and body
        const headers = ["Student Name", ...skills, "Comments"];

        // Prepare rows for each student
        const rows = reportData.students.map((student) => {
          const row = [`${student.first_name} ${student.last_name}`];

          // Add grade for each skill
          skills.forEach((skill) => {
            const grade = student.grades?.find((g) => g.skill_name === skill);
            row.push(
              grade && typeof grade.score === "number"
                ? grade.score.toString()
                : "-",
            );
          });

          // Add comments
          const comments = student.grades
            ?.filter((g) => g.comment)
            .map((g) => `${g.skill_name}: ${g.comment}`)
            .join("; ");

          row.push(comments || "");

          return row;
        });

        // Generate table in PDF
        autoTable(doc, {
          head: [headers],
          body: rows,
          startY: 50,
          theme: "striped",
          styles: {
            overflow: "linebreak",
            cellWidth: "wrap",
            fontSize: 9,
            cellPadding: 3,
          },
          columnStyles: {
            0: { cellWidth: 40 },
            [headers.length - 1]: { cellWidth: 60 },
          },
          headStyles: {
            fillColor: [90, 50, 160],
            textColor: 255,
            fontStyle: "bold",
          },
        });
      }

      // Save the PDF with a small delay to prevent browser issues
      setTimeout(() => {
        doc.save(
          `${reportType}-report-${format(new Date(), "yyyy-MM-dd")}.pdf`,
        );
        console.log("PDF saved successfully");
      }, 100);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert(
        `Failed to generate PDF report: ${error.message || "Unknown error"}. Please try again.`,
      );
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Reports</h1>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1">Teacher</label>
            <Select
              value={selectedTeacher}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                setSelectedTeacher(e.target.value);
                setSelectedClassroom("");
              }}
              options={[
                { value: "", label: "Select Teacher" },
                ...(teachers?.map((teacher) => ({
                  value: teacher.id,
                  label: `${teacher.first_name} ${teacher.last_name}`,
                })) || []),
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Classroom</label>
            <Select
              value={selectedClassroom}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setSelectedClassroom(e.target.value)
              }
              disabled={!selectedTeacher}
              options={[
                { value: "", label: "Select Classroom" },
                ...(classrooms?.map((classroom) => ({
                  value: classroom.id,
                  label: classroom.name,
                })) || []),
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Quarter</label>
            <Select
              value={selectedQuarter}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                setSelectedQuarter(e.target.value);
                setSelectedMonth("");
              }}
              disabled={!selectedClassroom}
              options={[
                { value: "", label: "Select Quarter" },
                ...(quarters?.map((quarter) => ({
                  value: quarter.id,
                  label: quarter.name,
                })) || []),
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Month</label>
            <Select
              value={selectedMonth}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setSelectedMonth(e.target.value)
              }
              disabled={!selectedQuarter}
              options={[
                { value: "", label: "Select Month" },
                ...getAvailableMonths(),
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Report Type
            </label>
            <Select
              value={reportType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setReportType(e.target.value as "attendance" | "grades")
              }
              options={[
                { value: "attendance", label: "Attendance" },
                { value: "grades", label: "Grades" },
              ]}
            />
          </div>
        </div>

        {/* Export button */}
        {reportData && (
          <div className="flex justify-end mb-4">
            <button
              type="button"
              onClick={() => {
                console.log("Download button clicked");
                downloadPdf();
              }}
              className="px-4 py-2 bg-violet-500 text-white rounded flex items-center gap-2 hover:bg-violet-600 transition-colors duration-200 cursor-pointer"
            >
              <Download size={16} />
              Download PDF
            </button>
          </div>
        )}

        {/* Report Content */}
        {isLoadingStudents ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
          </div>
        ) : reportData &&
          selectedTeacher &&
          selectedClassroom &&
          selectedQuarter &&
          selectedMonth ? (
          <div className="overflow-x-auto">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={18} />
              <span className="font-medium">
                {format(parseISO(reportData.startDate), "MMMM d, yyyy")} -{" "}
                {format(parseISO(reportData.endDate), "MMMM d, yyyy")}
              </span>
            </div>

            {reportType === "attendance" ? (
              <AttendanceReport reportData={reportData} />
            ) : (
              <GradesReport reportData={reportData} />
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            {!selectedTeacher
              ? "Select a teacher to start"
              : !selectedClassroom
                ? "Select a classroom"
                : !selectedQuarter
                  ? "Select a quarter"
                  : !selectedMonth
                    ? "Select a month"
                    : "No data available for the selected filters. Please try a different selection."}
          </div>
        )}
      </div>
    </div>
  );
};

// Attendance Report Component
const AttendanceReport = ({ reportData }: { reportData: ReportData }) => {
  // Get all unique dates from attendance records
  const allDates = new Set<string>();

  // Add existing dates from records
  reportData.students.forEach((student) => {
    student.attendanceRecords?.forEach((record) => {
      allDates.add(record.class_date);
    });
  });

  // Sort dates
  const dates = Array.from(allDates).sort();

  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Student
          </th>
          {dates.map((date) => (
            <th
              key={date}
              className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              {format(parseISO(date), "MMM d")}
            </th>
          ))}
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Comments
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {reportData.students.map((student) => (
          <tr key={student.id}>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="text-sm font-medium text-gray-900">
                {student.first_name} {student.last_name}
              </div>
            </td>

            {dates.map((date) => {
              const record = student.attendanceRecords?.find(
                (r) => r.class_date === date,
              );
              const status = record?.status || "-";

              return (
                <td
                  key={date}
                  className="px-6 py-4 whitespace-nowrap text-center"
                >
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      status === "present"
                        ? "bg-green-100 text-green-800"
                        : status === "absent"
                          ? "bg-red-100 text-red-800"
                          : status === "tardy"
                            ? "bg-yellow-100 text-yellow-800"
                            : ""
                    }`}
                  >
                    {status === "present"
                      ? "✓"
                      : status === "absent"
                        ? "A"
                        : status === "tardy"
                          ? "T"
                          : "-"}
                  </span>
                </td>
              );
            })}

            <td className="px-6 py-4">
              <div className="text-sm text-gray-900">
                {student.attendanceRecords?.length === 0 ? (
                  <div className="text-gray-500 italic">
                    No attendance records available
                  </div>
                ) : student.attendanceRecords?.filter((r) => r.comment)
                    .length === 0 ? (
                  <div className="text-gray-500 italic">
                    No comments available
                  </div>
                ) : (
                  student.attendanceRecords
                    ?.filter((r) => r.comment)
                    .map((r, i) => (
                      <div key={i} className="mb-1">
                        <span className="font-medium">
                          {format(parseISO(r.class_date), "MM/dd")}:
                        </span>{" "}
                        {r.comment}
                      </div>
                    ))
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// Grades Report Component
const GradesReport = ({ reportData }: { reportData: ReportData }) => {
  // Get all unique skills or use default skills if none exist
  const allSkills = new Set<string>();

  // Add existing skills from grades
  reportData.students.forEach((student) => {
    if (student.grades && student.grades.length > 0) {
      student.grades?.forEach((grade) => {
        if (grade.skill_name) allSkills.add(grade.skill_name);
      });
    }
  });

  // If no skills are found (empty grades), add default language skills
  if (allSkills.size === 0) {
    const defaultSkills = [
      "Listening",
      "Reading",
      "Writing",
      "Speaking",
      "Grammar & Vocabulary",
      "Project",
      "Conversation",
    ];
    defaultSkills.forEach((skill) => allSkills.add(skill));
  }

  // Sort skills alphabetically
  const skills = Array.from(allSkills).sort();

  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Student
          </th>
          {skills.map((skill) => (
            <th
              key={skill}
              className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              {skill}
            </th>
          ))}
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Comments
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {reportData.students.map((student) => (
          <tr key={student.id}>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="text-sm font-medium text-gray-900">
                {student.first_name} {student.last_name}
              </div>
            </td>

            {skills.map((skill) => {
              const grade = student.grades?.find((g) => g.skill_name === skill);

              return (
                <td
                  key={skill}
                  className="px-6 py-4 whitespace-nowrap text-center"
                >
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      grade
                        ? grade.score >= 90
                          ? "bg-green-100 text-green-800"
                          : grade.score >= 70
                            ? "bg-blue-100 text-blue-800"
                            : grade.score >= 60
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        : ""
                    }`}
                  >
                    {grade ? grade.score : "-"}
                  </span>
                </td>
              );
            })}

            <td className="px-6 py-4">
              <div className="text-sm text-gray-900">
                {student.grades?.length === 0 ? (
                  <div className="text-gray-500 italic">
                    No grade records available
                  </div>
                ) : (
                  student.grades
                    ?.filter((g) => g.comment)
                    .map((g, i) => (
                      <div key={i} className="mb-1">
                        <span className="font-medium">{g.skill_name}:</span>{" "}
                        {g.comment}
                      </div>
                    ))
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default Reports;
