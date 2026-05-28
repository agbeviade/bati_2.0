"use client";

import { useRef, useTransition } from "react";
import { toast } from "sonner";
import { updateProfile, updateCompany, updatePassword } from "@/app/(dashboard)/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { User, Company } from "@/lib/supabase/types";

const CURRENCIES = [
  { value: "XOF", label: "XOF — Franc CFA (UEMOA)" },
  { value: "XAF", label: "XAF — Franc CFA (CEMAC)" },
  { value: "MAD", label: "MAD — Dirham marocain" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "USD", label: "USD — Dollar américain" },
  { value: "GHS", label: "GHS — Cedi ghanéen" },
  { value: "NGN", label: "NGN — Naira nigérian" },
];

const SPECIALTIES = [
  "Maçonnerie", "Charpente / Toiture", "Électricité", "Plomberie",
  "Carrelage", "Peinture", "Menuiserie", "Gros œuvre", "Génie civil", "Autre",
];

export function ProfileForm({ profile }: { profile: Pick<User, "full_name" | "phone" | "specialty" | "daily_rate"> }) {
  const [isPending, startTransition] = useTransition();
  const [isPwPending, startPwTransition] = useTransition();
  const pwFormRef = useRef<HTMLFormElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateProfile(fd);
      if (result?.error) { toast.error(result.error); return; }
      toast.success("Profil mis à jour.");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mon profil</CardTitle>
        <CardDescription>Informations personnelles et compétences.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Nom complet</Label>
              <Input id="full_name" name="full_name" defaultValue={profile.full_name ?? ""} placeholder="Kofi Mensah" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" name="phone" defaultValue={profile.phone ?? ""} placeholder="+225 07 00 00 00 00" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="specialty">Spécialité</Label>
              <select
                name="specialty" id="specialty"
                defaultValue={profile.specialty ?? ""}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Non définie</option>
                {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="daily_rate">Taux journalier</Label>
              <Input
                id="daily_rate" name="daily_rate" type="number" min="0" step="100"
                defaultValue={profile.daily_rate ?? ""}
                placeholder="25000"
              />
            </div>
          </div>

          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Enregistrement..." : "Enregistrer le profil"}
          </Button>
        </form>

        <Separator />

        <div>
          <p className="text-sm font-medium mb-3">Changer le mot de passe</p>
          <form
            ref={pwFormRef}
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              startPwTransition(async () => {
                const result = await updatePassword(fd);
                if (result?.error) { toast.error(result.error); return; }
                toast.success("Mot de passe modifié.");
                pwFormRef.current?.reset();
              });
            }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            <div className="space-y-1.5">
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <Input id="password" name="password" type="password" minLength={6} required placeholder="••••••••" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirmer</Label>
              <Input id="confirm" name="confirm" type="password" minLength={6} required placeholder="••••••••" />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" size="sm" variant="outline" disabled={isPwPending}>
                {isPwPending ? "Modification..." : "Changer le mot de passe"}
              </Button>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}

export function CompanyForm({ company }: { company: Pick<Company, "id" | "name" | "address" | "phone" | "email" | "currency" | "plan" | "subscription_status"> }) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateCompany(fd);
      if (result?.error) { toast.error(result.error); return; }
      toast.success("Entreprise mise à jour.");
    });
  }

  const PLAN_LABELS: Record<string, string> = { free: "Gratuit", pro: "Pro", enterprise: "Enterprise" };
  const STATUS_LABELS: Record<string, string> = { active: "Actif", past_due: "Impayé", canceled: "Annulé", trialing: "Essai" };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mon entreprise</CardTitle>
        <CardDescription>Coordonnées et devise affichée sur les devis/factures.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="company_name">Nom de l'entreprise *</Label>
            <Input id="company_name" name="name" defaultValue={company.name} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="company_phone">Téléphone</Label>
              <Input id="company_phone" name="phone" defaultValue={company.phone ?? ""} placeholder="+225 07 00 00 00 00" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company_email">Email professionnel</Label>
              <Input id="company_email" name="email" type="email" defaultValue={company.email ?? ""} placeholder="contact@monentreprise.ci" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company_address">Adresse</Label>
            <Input id="company_address" name="address" defaultValue={company.address ?? ""} placeholder="Abidjan, Cocody Riviera 3..." />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="currency">Devise</Label>
            <select
              name="currency" id="currency"
              defaultValue={company.currency}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Enregistrement..." : "Enregistrer l'entreprise"}
          </Button>
        </form>

        <Separator />

        {/* Plan */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Abonnement</p>
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div>
              <p className="font-medium">{PLAN_LABELS[company.plan] ?? company.plan}</p>
              <p className="text-xs text-muted-foreground">{STATUS_LABELS[company.subscription_status] ?? company.subscription_status}</p>
            </div>
            {company.plan === "free" && (
              <Button size="sm" variant="outline" disabled>
                Passer à Pro
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
