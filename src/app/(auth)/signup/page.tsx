"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ROUTES } from "@/constants/routes";
import { toast } from "sonner";

export default function SignupPage() {
  const { signUp, isSigningUp, signUpError } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Паролі не співпадають");
      return;
    }
    if (password.length < 8) {
      toast.error("Пароль повинен містити мінімум 8 символів");
      return;
    }
    await signUp({ name, email, password });
    toast.success("Акаунт створено! Тепер увійдіть.");
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="text-4xl mb-2">🎙️</div>
        <CardTitle className="text-2xl">Реєстрація</CardTitle>
        <CardDescription>Створіть акаунт в Transcriber</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {signUpError && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {signUpError.message || "Помилка реєстрації"}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Ім'я</Label>
            <Input
              id="name"
              type="text"
              placeholder="Ваше ім'я"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              placeholder="Мінімум 8 символів"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Підтвердити пароль</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isSigningUp}>
            {isSigningUp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Зареєструватися
          </Button>
          <p className="text-sm text-muted-foreground">
            Вже є акаунт?{" "}
            <Link href={ROUTES.LOGIN} className="text-primary underline">
              Увійти
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
