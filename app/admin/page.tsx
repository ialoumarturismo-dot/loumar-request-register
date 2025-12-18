import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDemands } from "@/app/actions/demands";
import DemandsTable from "@/components/admin/demands-table";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const result = await getDemands();

  if (!result.ok) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Erro</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">{result.error}</p>
        </CardContent>
      </Card>
    );
  }

  const demands = result.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Listagem de Demandas</CardTitle>
        <CardDescription>
          Visualize e gerencie todas as demandas registradas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {demands.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhuma demanda registrada ainda.</p>
          </div>
        ) : (
          <DemandsTable demands={demands} />
        )}
      </CardContent>
    </Card>
  );
}
