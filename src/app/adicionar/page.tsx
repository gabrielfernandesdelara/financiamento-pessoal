"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { Pencil, Trash2, ShoppingCart, User, Bell } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Fab } from "@/components/shared/fab";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PurchaseForm } from "@/components/purchases/purchase-form";
import { ProfileForm } from "@/components/profile/profile-form";
import { BonusesList } from "@/components/profile/bonuses-list";
import { CobrancaForm } from "@/components/cobrancas/cobranca-form";
import { SignInRequired } from "@/components/shared/sign-in-required";
import { EmptyState } from "@/components/shared/empty-state";
import { useCompras, useCreateCompra, useUpdateCompra, useDeleteCompra } from "@/hooks/use-compras";
import { useProfile, useUpsertProfile } from "@/hooks/use-profile";
import { useCobrancas, useCreateCobranca, useUpdateCobranca, useDeleteCobranca } from "@/hooks/use-cobrancas";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { Compra, CompraInput } from "@/types/compra";
import type { ProfileInput } from "@/types/profile";
import type { Cobranca, CobrancaInput } from "@/types/cobranca";

const TABS = ["Compra", "Perfil", "Cobrança"] as const;
type Tab = (typeof TABS)[number];

export default function AdicionarPage() {
  const { status } = useSession();
  const [activeTab, setActiveTab] = React.useState<Tab>("Compra");

  const { data: comprasData, isLoading: comprasLoading } = useCompras();
  const createCompra = useCreateCompra();
  const updateCompra = useUpdateCompra();
  const deleteCompra = useDeleteCompra();
  const [compraOpen, setCompraOpen] = React.useState(false);
  const [editingCompra, setEditingCompra] = React.useState<Compra | null>(null);

  const { data: profile, isLoading: profileLoading } = useProfile();
  const upsertProfile = useUpsertProfile();

  const { data: cobrancasData, isLoading: cobrancasLoading } = useCobrancas();
  const createCobranca = useCreateCobranca();
  const updateCobranca = useUpdateCobranca();
  const deleteCobranca = useDeleteCobranca();
  const [cobrancaOpen, setCobrancaOpen] = React.useState(false);
  const [editingCobranca, setEditingCobranca] = React.useState<Cobranca | null>(null);

  const compras = comprasData ?? [];
  const cobrancas = cobrancasData ?? [];

  async function handleCompraSubmit(input: CompraInput) {
    try {
      if (editingCompra) {
        await updateCompra.mutateAsync({ id: editingCompra.id, input });
        toast({ title: "Compra atualizada", variant: "success" });
      } else {
        await createCompra.mutateAsync(input);
        toast({ title: "Compra adicionada", variant: "success" });
      }
      setCompraOpen(false);
    } catch (err) {
      toast({ title: "Algo deu errado", description: err instanceof Error ? err.message : "Tente novamente.", variant: "destructive" });
    }
  }

  async function handleCompraDelete(c: Compra) {
    if (!confirm(`Excluir "${c.nome}"?`)) return;
    try {
      await deleteCompra.mutateAsync(c.id);
      toast({ title: "Compra removida", variant: "success" });
    } catch (err) {
      toast({ title: "Falha ao excluir", description: err instanceof Error ? err.message : "Tente novamente.", variant: "destructive" });
    }
  }

  async function handleProfileSubmit(input: ProfileInput) {
    try {
      await upsertProfile.mutateAsync(input);
      toast({ title: "Perfil salvo", variant: "success" });
    } catch (err) {
      toast({ title: "Algo deu errado", description: err instanceof Error ? err.message : "Tente novamente.", variant: "destructive" });
    }
  }

  async function handleCobrancaSubmit(input: CobrancaInput) {
    try {
      if (editingCobranca) {
        await updateCobranca.mutateAsync({ id: editingCobranca.id, input });
        toast({ title: "Cobrança atualizada", variant: "success" });
      } else {
        await createCobranca.mutateAsync(input);
        toast({ title: "Cobrança adicionada", variant: "success" });
      }
      setCobrancaOpen(false);
    } catch (err) {
      toast({ title: "Algo deu errado", description: err instanceof Error ? err.message : "Tente novamente.", variant: "destructive" });
    }
  }

  async function handleCobrancaDelete(c: Cobranca) {
    if (!confirm(`Excluir cobrança de "${c.nomePessoa}"?`)) return;
    try {
      await deleteCobranca.mutateAsync(c.id);
      toast({ title: "Cobrança removida", variant: "success" });
    } catch (err) {
      toast({ title: "Falha ao excluir", description: err instanceof Error ? err.message : "Tente novamente.", variant: "destructive" });
    }
  }

  if (status === "loading") {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-12" />
        {[0, 1].map((i) => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }
  if (status === "unauthenticated") return <SignInRequired />;

  return (
    <>
      <PageHeader title="Adicionar" description="Registre compras, configure seu perfil ou adicione cobranças." />

      <div className="mb-6 flex gap-1 rounded-full bg-muted p-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors",
              activeTab === tab
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab === "Compra"   && <ShoppingCart className="h-3.5 w-3.5" />}
            {tab === "Perfil"   && <User className="h-3.5 w-3.5" />}
            {tab === "Cobrança" && <Bell className="h-3.5 w-3.5" />}
            {tab}
          </button>
        ))}
      </div>

      {/* ── Compra ─────────────────────────────────────────────────────────── */}
      {activeTab === "Compra" && (
        <div className="space-y-3">
          <div className="hidden justify-end md:flex">
            <Button onClick={() => { setEditingCompra(null); setCompraOpen(true); }}>Nova compra</Button>
          </div>
          {comprasLoading ? (
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)
          ) : compras.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="Nenhuma compra registrada"
              description="Adicione uma compra para começar."
              action={<Button onClick={() => { setEditingCompra(null); setCompraOpen(true); }}>Nova compra</Button>}
            />
          ) : (
            compras.map((c) => (
              <Card key={c.id}>
                <CardContent className="flex items-start justify-between gap-4 p-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate font-medium">{c.nome}</p>
                    <p className="text-sm text-muted-foreground">{c.cartaoOuPessoa}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm">
                      <span className="text-muted-foreground">Início: {formatDate(c.dataInicio)}</span>
                      {c.parcelada && c.totalParcelas
                        ? <span className="text-muted-foreground">{c.totalParcelas}x {formatCurrency(c.valorParcela)}</span>
                        : <span className="text-muted-foreground">À vista</span>
                      }
                      <span className="font-medium">Total: {formatCurrency(c.valorTotal)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditingCompra(c); setCompraOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleCompraDelete(c)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
          <Fab onClick={() => { setEditingCompra(null); setCompraOpen(true); }} label="Nova compra" className="md:hidden" />
        </div>
      )}

      {/* ── Perfil ─────────────────────────────────────────────────────────── */}
      {activeTab === "Perfil" && (
        <div className="space-y-4">
          {profileLoading ? (
            <Skeleton className="h-64" />
          ) : (
            <ProfileForm
              profile={profile ?? null}
              onSubmit={handleProfileSubmit}
              isSubmitting={upsertProfile.isPending}
            />
          )}
          <BonusesList />
        </div>
      )}

      {/* ── Cobrança ───────────────────────────────────────────────────────── */}
      {activeTab === "Cobrança" && (
        <div className="space-y-3">
          <div className="hidden justify-end md:flex">
            <Button onClick={() => { setEditingCobranca(null); setCobrancaOpen(true); }}>Nova cobrança</Button>
          </div>
          {cobrancasLoading ? (
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)
          ) : cobrancas.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="Nenhuma cobrança registrada"
              description="Adicione uma cobrança para rastrear valores a receber."
              action={<Button onClick={() => { setEditingCobranca(null); setCobrancaOpen(true); }}>Nova cobrança</Button>}
            />
          ) : (
            cobrancas.map((c) => (
              <Card key={c.id}>
                <CardContent className="flex items-start justify-between gap-4 p-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate font-medium">{c.nomePessoa}</p>
                    <p className="text-sm text-muted-foreground">{c.nomeCompra}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm">
                      <span className="font-medium text-destructive">Devido: {formatCurrency(c.valorDevido)}</span>
                      <span className="text-muted-foreground">Venc.: {formatDate(c.dataVencimento)}</span>
                      {c.ehParcelado && c.quantidadeParcelas && <span className="text-muted-foreground">{c.quantidadeParcelas}x</span>}
                      <span className="text-muted-foreground">Total: {formatCurrency(c.valorTotal)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditingCobranca(c); setCobrancaOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleCobrancaDelete(c)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
          <Fab onClick={() => { setEditingCobranca(null); setCobrancaOpen(true); }} label="Nova cobrança" className="md:hidden" />
        </div>
      )}

      <PurchaseForm
        open={compraOpen}
        onOpenChange={setCompraOpen}
        initial={editingCompra}
        onSubmit={handleCompraSubmit}
        isSubmitting={createCompra.isPending || updateCompra.isPending}
      />
      <CobrancaForm
        open={cobrancaOpen}
        onOpenChange={setCobrancaOpen}
        initial={editingCobranca}
        onSubmit={handleCobrancaSubmit}
        isSubmitting={createCobranca.isPending || updateCobranca.isPending}
      />
    </>
  );
}
