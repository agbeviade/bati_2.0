import { Construction } from "lucide-react";

export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
        <div className="p-4 rounded-full bg-muted">
          <Construction className="h-10 w-10 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">En cours de développement</p>
          <p className="text-sm text-muted-foreground mt-1">
            Cette section sera disponible prochainement.
          </p>
        </div>
      </div>
    </div>
  );
}
