"use client";

import { useTransition, useState } from "react";
import { LogIn, LogOut, MapPin, Clock } from "lucide-react";
import { toast } from "sonner";
import { checkIn, checkOut } from "@/app/(dashboard)/teams/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { User, Attendance } from "@/lib/supabase/types";

type Member = {
  user_id: string;
  user: Pick<User, "full_name" | "role">;
  openAttendance: Pick<Attendance, "id" | "check_in" | "project_id"> | null;
};

type Project = { id: string; name: string };

type HistoryEntry = Pick<
  Attendance,
  "id" | "user_id" | "check_in" | "check_out" | "hours_worked" | "project_id"
> & {
  user: Pick<User, "full_name"> | null;
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function useGeoLocation(): () => Promise<{ lat: number | null; lng: number | null }> {
  return () =>
    new Promise((resolve) => {
      if (!navigator.geolocation) return resolve({ lat: null, lng: null });
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({ lat: null, lng: null }),
        { timeout: 5000 },
      );
    });
}

export function AttendanceTab({
  teamId,
  members,
  projects,
  history,
}: {
  teamId: string;
  members: Member[];
  projects: Project[];
  history: HistoryEntry[];
}) {
  const [isPending, startTransition] = useTransition();
  const [selectedProject, setSelectedProject] = useState<Record<string, string>>({});
  const getGeo = useGeoLocation();

  function handleCheckIn(userId: string) {
    startTransition(async () => {
      const { lat, lng } = await getGeo();
      const projectId = selectedProject[userId] || null;
      const result = await checkIn(userId, projectId, lat, lng, teamId);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Pointage d'entrée enregistré.");
    });
  }

  function handleCheckOut(attendanceId: string) {
    startTransition(async () => {
      const { lat, lng } = await getGeo();
      const result = await checkOut(attendanceId, lat, lng, teamId);
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Pointage de sortie enregistré.");
    });
  }

  return (
    <div className="space-y-4">
      {/* Active members */}
      <Card>
        <CardHeader>
          <CardTitle>Pointage en cours</CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              Aucun membre dans l'équipe.
            </p>
          ) : (
            <ul className="space-y-1">
              {members.map((m, i) => (
                <li key={m.user_id}>
                  <div className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{m.user.full_name ?? "—"}</p>
                        {m.openAttendance ? (
                          <Badge
                            variant="default"
                            className="bg-green-500 text-xs hover:bg-green-600"
                          >
                            <Clock className="mr-1 h-2.5 w-2.5" />
                            {formatTime(m.openAttendance.check_in)}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground text-xs">
                            Absent
                          </Badge>
                        )}
                      </div>
                      {!m.openAttendance && projects.length > 0 && (
                        <select
                          value={selectedProject[m.user_id] ?? ""}
                          onChange={(e) =>
                            setSelectedProject((p) => ({ ...p, [m.user_id]: e.target.value }))
                          }
                          className="border-input bg-background focus-visible:ring-ring mt-1.5 flex h-7 w-full max-w-[200px] rounded-md border px-2 text-xs focus-visible:ring-1 focus-visible:outline-none"
                        >
                          <option value="">Chantier (optionnel)</option>
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    {m.openAttendance ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-shrink-0 border-red-200 text-red-600 hover:bg-red-50"
                        disabled={isPending}
                        onClick={() => handleCheckOut(m.openAttendance!.id)}
                      >
                        <LogOut className="mr-1.5 h-3.5 w-3.5" />
                        Sortie
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="flex-shrink-0"
                        disabled={isPending}
                        onClick={() => handleCheckIn(m.user_id)}
                      >
                        <LogIn className="mr-1.5 h-3.5 w-3.5" />
                        Entrée
                      </Button>
                    )}
                  </div>
                  {i < members.length - 1 && <Separator />}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>Historique récent</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              Aucun pointage enregistré.
            </p>
          ) : (
            <ul className="space-y-1">
              {history.map((h, i) => (
                <li key={h.id}>
                  <div className="flex items-center gap-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{h.user?.full_name ?? "—"}</p>
                      <p className="text-muted-foreground text-xs">
                        {formatDate(h.check_in)} · {formatTime(h.check_in)}
                        {h.check_out && ` → ${formatTime(h.check_out)}`}
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      {h.check_out ? (
                        <span className="font-medium text-green-600">
                          {h.hours_worked != null ? `${h.hours_worked}h` : "—"}
                        </span>
                      ) : (
                        <Badge
                          variant="default"
                          className="bg-green-500 text-xs hover:bg-green-600"
                        >
                          En cours
                        </Badge>
                      )}
                    </div>
                  </div>
                  {i < history.length - 1 && <Separator />}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
