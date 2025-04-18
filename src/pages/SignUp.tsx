import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "../supabase/supabaseClient";

// Define Zod schema
const signUpSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Generate TypeScript type from Zod schema
type SignUpFormData = z.infer<typeof signUpSchema>;

const SignUp = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    mode: "onBlur",
  });

  const onSubmit = async (data: SignUpFormData) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            display_name: data.name, // Store name in Supabase auth.users table
          },
        },
      });

      if (signUpError) throw signUpError

      const user = signUpData?.user;
      if (user) {
        const { error: dbError } = await supabase.from("users").insert([
          {
            id: user.id,
            email: user.email,
            full_name: data.name,
            role: "pending", // Default role
            created_at: user.created_at,
          },
        ]);

        if (dbError) throw dbError;

      setSuccess("Sign-up successful! Check your email to confirm your account.");
      setTimeout(() => reset(), 2000);
      }
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-center mb-6">Sign Up</h2>

          {(error || success) && (
            <div className={`mb-6 p-4 border rounded-md ${
              error 
                ? 'bg-red-50 border-red-200' 
                : 'bg-green-50 border-green-200'
            }`}>
              <p className={`text-center text-sm ${
                error ? 'text-red-600' : 'text-green-600'
              }`}>
                {error || success}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <input 
                    {...field} 
                    type="text" 
                    className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500 focus:border-violet-500" 
                  />
                )}
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <input 
                    {...field} 
                    type="email" 
                    className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500 focus:border-violet-500" 
                  />
                )}
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <Controller
                name="password"
                control={control}
                render={({ field }) => (
                  <input 
                    {...field} 
                    type="password" 
                    className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500 focus:border-violet-500" 
                  />
                )}
              />
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Confirm Password</label>
              <Controller
                name="confirmPassword"
                control={control}
                render={({ field }) => (
                  <input 
                    {...field} 
                    type="password" 
                    className="w-full p-2 border rounded focus:ring-1 focus:ring-violet-500 focus:border-violet-500" 
                  />
                )}
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-violet-500 text-white rounded hover:bg-violet-600 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>{loading ? "Signing up..." : "Sign Up"}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
