import { z } from "zod";

export const quarterSchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    start_date: z.string().min(1, "Start date is required"),
    end_date: z.string().min(1, "End date is required"),
    break_dates: z.array(z.string()).optional(),
  });

export const studentSchema = z.object({
    first_name: z.string()
      .min(2, { message: "First name must be at least 2 characters long." })
      .max(50, { message: "First name must not exceed 50 characters." })
      .regex(/^[A-Za-z\s]+$/, { message: "First name must contain only letters and spaces." }),
  
    last_name: z.string()
      .min(2, { message: "Last name must be at least 2 characters long." })
      .max(50, { message: "Last name must not exceed 50 characters." })
      .regex(/^[A-Za-z\s]+$/, { message: "Last name must contain only letters and spaces." }),
  
    preferred_name: z.string()
      .max(50, { message: "Preferred name must not exceed 50 characters." })
      .optional(),
  
    email: z.string()
      .email({ message: "Invalid email address." }),
  
    phone: z.string()
      .min(7, { message: "Phone number must be at least 7 digits long." })
      .max(15, { message: "Phone number must not exceed 15 digits." })
      .regex(/^\+?[0-9\s-]+$/, { message: "Phone number can only contain numbers, spaces, hyphens, and an optional '+'." }),
  
    gender: z.union([z.enum(["male", "female"]), z.literal("")]),
  
    birth_date: z.string().refine(
      (date) => {
        const parsedDate = Date.parse(date);
        return !isNaN(parsedDate) && new Date(parsedDate) < new Date();
      },
      { message: "Birth date must be a valid past date." }
    ),
  
    country: z.string()
      .min(2, { message: "Country must be at least 2 characters long." }),
  
    address: z.string()
      .min(5, { message: "Address must be at least 5 characters long." }),
  
    parent_full_name: z.string()
      .min(5, { message: "Parent's full name must be at least 5 characters long." })
      .max(100, { message: "Parent's full name must not exceed 100 characters." }),
  
    parent_phone: z.string()
      .min(7, { message: "Parent's phone number must be at least 7 digits long." })
      .max(15, { message: "Parent's phone number must not exceed 15 digits." })
      .regex(/^\+?[0-9\s-]+$/, { message: "Phone number can only contain numbers, spaces, hyphens, and an optional '+'." }),
  });

export const teacherSchema = z.object({
    first_name: z.string()
      .min(2, { message: "First name must be at least 2 characters long." })
      .max(50, { message: "First name must not exceed 50 characters." })
      .regex(/^[A-Za-z\s]+$/, { message: "First name must contain only letters and spaces." }),
  
    last_name: z.string()
      .min(2, { message: "Last name must be at least 2 characters long." })
      .max(50, { message: "Last name must not exceed 50 characters." })
      .regex(/^[A-Za-z\s]+$/, { message: "Last name must contain only letters and spaces." }),
  
    email: z.string()
      .email({ message: "Invalid email address." }),
  
    phone: z.string()
      .min(7, { message: "Phone number must be at least 7 digits long." })
      .max(15, { message: "Phone number must not exceed 15 digits." })
      .regex(/^\+?[0-9\s-]+$/, { message: "Phone number can only contain numbers, spaces, hyphens, and an optional '+'." }),
  
    gender: z.union([z.enum(["male", "female"]), z.literal("")]),
  
    birth_date: z.string().refine(
      (date) => {
        const parsedDate = Date.parse(date);
        return !isNaN(parsedDate) && new Date(parsedDate) < new Date();
      },
      { message: "Birth date must be a valid past date." }
    ),
  
    country: z.string()
      .min(2, { message: "Country must be at least 2 characters long." }),
  });

  // Define the proficiency level schema
const ProficiencyLevelSchema = z.object({
  id: z.string(),    // id of the proficiency level
  name: z.string()   // name of the proficiency level
});

// Define the class schedule schema
const ClassScheduleSchema = z.object({
  id: z.string(),           // id of the class schedule
  days: z.array(z.string()),         // days the class is held
  start_time: z.string(),   // start time of the class
  end_time: z.string()      // end time of the class
});

// Define the teacher schema
const TeacherSchema = z.object({
  id: z.string(),         // id of the teacher
  first_name: z.string(), // first name of the teacher
  last_name: z.string()   // last name of the teacher
});

// Define the student schema
const StudentSchema = z.object({
  id: z.string(),          // id of the student
  first_name: z.string(),  // first name of the student
  last_name: z.string(),   // last name of the student
  email: z.string().email(), // email of the student
  birth_date: z.string(),  // birth date of the student
  country: z.string()      // country of the student
});

// Define the classroom schema
export const ClassroomSchema = z.object({
  id: z.string(),             
  name: z.string(),           
  proficiency_level: ProficiencyLevelSchema, 
  class_schedule: ClassScheduleSchema,       
  teacher: TeacherSchema,  
  students: z.array(StudentSchema)
});

export const ClassroomEditSchema = z.object({
  name: z.string().min(2),
  proficiency_level_id: z.string(),
  teacher_id: z.string(),
  days: z.array(z.string()),
  start_time: z.string(),
  end_time: z.string(),
});

export const createClassroomSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  proficiency_level_id: z.string().min(1, "Proficiency level is required"),
  days: z.array(z.string()).min(1, "At least one day must be selected"),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().min(1, "End time is required"),
  teacher_id: z.string().min(1, "Teacher is required"),
  student_ids: z.array(z.string()).optional(),
});