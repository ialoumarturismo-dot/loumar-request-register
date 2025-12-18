import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import DemandForm from "@/components/forms/demand-form"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Registrar Demanda</CardTitle>
            <CardDescription>
              Preencha o formulário abaixo para registrar uma nova demanda ao setor de Tecnologia, IA e Automação.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DemandForm />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

