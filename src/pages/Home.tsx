import { useEffect, useState } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useQuarterStore } from '../store/quartersStore';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';

interface GradeData {
  student_id: string;
  student_name: string;
  classroom_id: string;
  classroom_name: string;
  average: number;
  listening: number;
  reading: number;
  writing: number;
  speaking: number;
  grammar_vocab: number;
  project: number;
  conversation: number;
}

interface AttendanceData {
  student_id: string;
  student_name: string;
  classroom_id: string;
  classroom_name: string;
  present: number;
  absent: number;
  tardy: number;
  total: number;
  absent_percentage: number;
}

interface ClassroomDistribution {
  name: string;
  value: number;
}

interface SkillPerformance {
  name: string;
  average: number;
}

interface AttendanceTrend {
  date: string;
  present: number;
  absent: number;
  tardy: number;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28'];

const Home = () => {
  const { activeQuarter } = useQuarterStore();
  const [loading, setLoading] = useState(true);
  const [atRiskStudents, setAtRiskStudents] = useState<GradeData[]>([]);
  const [attendanceRiskStudents, setAttendanceRiskStudents] = useState<AttendanceData[]>([]);
  const [classroomDistribution, setClassroomDistribution] = useState<ClassroomDistribution[]>([]);
  const [skillPerformance, setSkillPerformance] = useState<SkillPerformance[]>([]);
  const [attendanceTrend, setAttendanceTrend] = useState<AttendanceTrend[]>([]);

  useEffect(() => {
    if (!activeQuarter?.id) return;
    
    const fetchStatistics = async () => {
      setLoading(true);
      try {
        // Fetch grades data
        const { data: gradesData, error: gradesError } = await supabase
          .from('grading')
          .select(`
            student_id,
            classroom_id,
            listening,
            reading,
            writing,
            speaking,
            grammar_vocab,
            project,
            conversation
          `)
          .eq('quarter_id', activeQuarter.id);

        if (gradesError) throw gradesError;

        // Fetch students data
        const { data: studentsData, error: studentsError } = await supabase
          .from('students')
          .select('id, first_name, last_name');

        if (studentsError) throw studentsError;

        // Fetch classrooms data
        const { data: classroomsData, error: classroomsError } = await supabase
          .from('classrooms')
          .select('id, name');

        if (classroomsError) throw classroomsError;

        // Fetch attendance data
        const { data: attendanceData, error: attendanceError } = await supabase
          .from('attendance')
          .select('student_id, classroom_id, class_date, status')
          .eq('quarter_id', activeQuarter.id);

        if (attendanceError) throw attendanceError;

        // Process grades data
        const processedGrades = gradesData.map(grade => {
          const student = studentsData.find(s => s.id === grade.student_id);
          const classroom = classroomsData.find(c => c.id === grade.classroom_id);
          
          const skills = ['listening', 'reading', 'writing', 'speaking', 'grammar_vocab', 'project', 'conversation'] as const;
          const sum = skills.reduce((acc, skill) => acc + (grade[skill as keyof typeof grade] || 0), 0);
          const average = sum / skills.length;
          
          return {
            student_id: grade.student_id,
            student_name: student ? `${student.first_name} ${student.last_name}` : 'Unknown Student',
            classroom_id: grade.classroom_id,
            classroom_name: classroom ? classroom.name : 'Unknown Classroom',
            average,
            listening: grade.listening || 0,
            reading: grade.reading || 0,
            writing: grade.writing || 0,
            speaking: grade.speaking || 0,
            grammar_vocab: grade.grammar_vocab || 0,
            project: grade.project || 0,
            conversation: grade.conversation || 0
          };
        });

        // Find at-risk students (average grade below 70)
        const atRisk = processedGrades
          .filter(grade => grade.average < 70)
          .sort((a, b) => a.average - b.average)
          .slice(0, 5);

        setAtRiskStudents(atRisk);

        // Calculate skill performance averages across all students
        const skills = [
          { name: 'Listening', key: 'listening' },
          { name: 'Reading', key: 'reading' },
          { name: 'Writing', key: 'writing' },
          { name: 'Speaking', key: 'speaking' },
          { name: 'Grammar', key: 'grammar_vocab' },
          { name: 'Project', key: 'project' },
          { name: 'Conversation', key: 'conversation' }
        ];

        const skillAverages = skills.map(skill => {
          const sum = processedGrades.reduce((acc, grade) => acc + grade[skill.key as keyof typeof grade], 0);
          return {
            name: skill.name,
            average: processedGrades.length ? sum / processedGrades.length : 0
          };
        });

        setSkillPerformance(skillAverages);

        // Process attendance data
        interface AttendanceRecord {
          student_id: string;
          classroom_id: string;
          class_date: string;
          status: 'present' | 'absent' | 'tardy';
        }
        
        interface StudentAttendance {
          student_id: string;
          classroom_id: string;
          present: number;
          absent: number;
          tardy: number;
          total: number;
        }
        
        const attendanceByStudent: Record<string, StudentAttendance> = {};
        
        (attendanceData as AttendanceRecord[]).forEach(record => {
          if (!attendanceByStudent[record.student_id]) {
            attendanceByStudent[record.student_id] = {
              student_id: record.student_id,
              classroom_id: record.classroom_id,
              present: 0,
              absent: 0,
              tardy: 0,
              total: 0
            };
          }
          
          attendanceByStudent[record.student_id][record.status as keyof Pick<StudentAttendance, 'present' | 'absent' | 'tardy'>]++;
          attendanceByStudent[record.student_id].total++;
        });

        const processedAttendance = Object.values(attendanceByStudent).map((record: StudentAttendance) => {
          const student = studentsData.find(s => s.id === record.student_id);
          const classroom = classroomsData.find(c => c.id === record.classroom_id);
          
          return {
            student_id: record.student_id,
            student_name: student ? `${student.first_name} ${student.last_name}` : 'Unknown Student',
            classroom_id: record.classroom_id,
            classroom_name: classroom ? classroom.name : 'Unknown Classroom',
            present: record.present || 0,
            absent: record.absent || 0,
            tardy: record.tardy || 0,
            total: record.total,
            absent_percentage: record.total ? (record.absent / record.total) * 100 : 0
          };
        });

        // Find students at risk due to attendance (more than 3 absences or high absence rate)
        const attendanceRisk = processedAttendance
          .filter(record => record.absent >= 3 || record.absent_percentage > 20)
          .sort((a, b) => b.absent - a.absent)
          .slice(0, 5);

        setAttendanceRiskStudents(attendanceRisk);

        // Calculate classroom distribution
        interface ClassroomStudent {
          classroom_id: string;
        }
        
        const classroomCounts: Record<string, number> = {};
        
        // Count students in each classroom from the classroom_students table
        const { data: classroomStudents, error: classroomStudentsError } = await supabase
          .from('classroom_students')
          .select('classroom_id');

        if (classroomStudentsError) throw classroomStudentsError;

        (classroomStudents as ClassroomStudent[]).forEach(record => {
          if (!classroomCounts[record.classroom_id]) {
            classroomCounts[record.classroom_id] = 0;
          }
          classroomCounts[record.classroom_id]++;
        });

        const distribution = classroomsData.map(classroom => ({
          name: classroom.name,
          value: classroomCounts[classroom.id] || 0
        }));

        setClassroomDistribution(distribution);

        // Calculate attendance trends over time
        interface DateAttendance {
          date: string;
          present: number;
          absent: number;
          tardy: number;
        }
        
        const attendanceByDate: Record<string, DateAttendance> = {};
        
        (attendanceData as AttendanceRecord[]).forEach(record => {
          if (!attendanceByDate[record.class_date]) {
            attendanceByDate[record.class_date] = {
              date: record.class_date,
              present: 0,
              absent: 0,
              tardy: 0
            };
          }
          
          attendanceByDate[record.class_date][record.status as keyof Pick<DateAttendance, 'present' | 'absent' | 'tardy'>]++;
        });

        const trends = Object.values(attendanceByDate)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(-10); // Get the last 10 days with attendance records

        setAttendanceTrend(trends as AttendanceTrend[]);

      } catch (error) {
        console.error('Error fetching statistics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, [activeQuarter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">School Statistics Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Students at Risk (Grades) */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Students at Risk (Grades)</h2>
          {atRiskStudents.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={atRiskStudents}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="student_name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="average" name="Average Grade" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No at-risk students found
            </div>
          )}
        </div>

        {/* Students at Risk (Attendance) */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Students at Risk (Attendance)</h2>
          {attendanceRiskStudents.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={attendanceRiskStudents}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="student_name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="absent" name="Absences" fill="#ff8042" />
                <Bar dataKey="tardy" name="Tardies" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No attendance issues found
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Skill Performance */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Average Performance by Skill</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={skillPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Area type="monotone" dataKey="average" name="Average Score" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Classroom Distribution */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Student Distribution by Classroom</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={classroomDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {classroomDistribution.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} students`, 'Count']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Attendance Trend */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Attendance Trend</h2>
        {attendanceTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={attendanceTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="present" name="Present" stroke="#82ca9d" />
              <Line type="monotone" dataKey="absent" name="Absent" stroke="#ff8042" />
              <Line type="monotone" dataKey="tardy" name="Tardy" stroke="#ffc658" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500">
            No attendance trend data available
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Key Insights */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Key Insights</h2>
          <ul className="list-disc pl-5 space-y-2">
            {atRiskStudents.length > 0 && (
              <li>
                <span className="font-medium">{atRiskStudents.length} students</span> are at risk of failing with grades below 70%
              </li>
            )}
            {attendanceRiskStudents.length > 0 && (
              <li>
                <span className="font-medium">{attendanceRiskStudents.length} students</span> have concerning attendance patterns
              </li>
            )}
            {skillPerformance.length > 0 && (
              <li>
                <span className="font-medium">{skillPerformance.reduce((lowest, skill) => 
                  skill.average < lowest.average ? skill : lowest, skillPerformance[0]).name}</span> is the skill with the lowest average performance
              </li>
            )}
            {classroomDistribution.length > 0 && (
              <li>
                <span className="font-medium">{classroomDistribution.reduce((largest, classroom) => 
                  classroom.value > largest.value ? classroom : largest, classroomDistribution[0]).name}</span> has the most students
              </li>
            )}
          </ul>
        </div>

        {/* Recommendations */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Recommendations</h2>
          <ul className="list-disc pl-5 space-y-2">
            {atRiskStudents.length > 0 && (
              <li>
                Schedule additional tutoring sessions for students with grades below 70%
              </li>
            )}
            {attendanceRiskStudents.length > 0 && (
              <li>
                Contact parents of students with 3+ absences to discuss attendance concerns
              </li>
            )}
            {skillPerformance.length > 0 && (
              <li>
                Focus on improving curriculum for {skillPerformance.reduce((lowest, skill) => 
                  skill.average < lowest.average ? skill : lowest, skillPerformance[0]).name.toLowerCase()} skills
              </li>
            )}
            <li>
              Consider implementing progress tracking for individual students
            </li>
            <li>
              Develop intervention strategies for students showing declining performance
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Home;