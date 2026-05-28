import { Construction } from "lucide-react";

export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-col items-center justify-center space-y-4 py-24 text-center">
        <div className="bg-muted rounded-full p-4">
          <Construction className="text-muted-foreground h-10 w-10" />
        </div>
        <div>
          <p className="font-medium">En cours de développement</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Cette section sera disponible prochainement.
          </p>
        </div>
      </div>
    </div>
  );
}
