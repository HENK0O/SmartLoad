import AuthForm from "@/components/AuthForm";
export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      <h1 className="text-3xl font-bold">
        <span className="text-[var(--primary)]">Smart</span>Load
      </h1>
      <AuthForm />
    </main>
  );
}