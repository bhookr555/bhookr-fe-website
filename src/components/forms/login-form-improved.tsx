"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PaymentLoader } from "@/components/shared/payment-loader";

import { loginSchema, type LoginInput } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/shared/form-field";

const DEMO_CREDENTIALS = {
  email: "demo@bhookr.com",
  password: "password123",
} as const;

const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: "Invalid email or password",
  LOGIN_FAILED: "Login failed. Please try again",
  NETWORK_ERROR: "Network error. Please check your connection",
} as const;

/**
 * Login form component with validation and error handling
 */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (_data: LoginInput) => {
    setIsLoading(true);

    try {
      // Simulate login
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      toast.success("Login successful!");
      router.push(callbackUrl);
      router.refresh();
    } catch {
      toast.error(ERROR_MESSAGES.NETWORK_ERROR);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = () => {
    onSubmit(DEMO_CREDENTIALS);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          id="email"
          label="Email"
          error={errors.email?.message}
          required
        >
          <Input
            id="email"
            type="email"
            placeholder="Enter your email"
            autoComplete="email"
            disabled={isLoading}
            {...register("email")}
          />
        </FormField>

        <FormField
          id="password"
          label="Password"
          error={errors.password?.message}
          required
        >
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={isLoading}
            {...register("password")}
          />
        </FormField>

        <Button 
          type="submit" 
          className="w-full" 
          disabled={isLoading}
        >
          {isLoading && <PaymentLoader size="sm" className="mr-2" />}
          {isLoading ? "Logging in..." : "Login"}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or
          </span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleDemoLogin}
        disabled={isLoading}
      >
        Try Demo Account
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Demo: {DEMO_CREDENTIALS.email} / {DEMO_CREDENTIALS.password}
      </p>
    </div>
  );
}
