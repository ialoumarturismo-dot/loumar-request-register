import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import DemandForm from "@/components/forms/demand-form";

export default function Home() {
  return (
    <main className="min-h-screen gradient-background flex items-center justify-center py-8 px-4">
      <div className="max-w-3xl w-full">
        <Card className="gradient-card border-border/50 shadow-lg">
          <CardHeader className="border-b border-border/30 pb-4">
            <CardTitle className="text-2xl font-semibold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              Registrar Demanda
            </CardTitle>
            <CardDescription className="text-muted-foreground/80 mt-1.5">
              Preencha o formulário abaixo para registrar uma nova demanda à
              algum setor da empresa.{" "}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <DemandForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
