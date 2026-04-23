import {
  LayoutDashboard,
  History,
  ShoppingBag,
  Plus,
  CalendarClock,
  Tags,
  PieChart,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  mobile?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/compras", label: "Compras", icon: ShoppingBag, mobile: true },
  { href: "/", label: "Painel", icon: LayoutDashboard, mobile: true },
  { href: "/historico", label: "Histórico", icon: History, mobile: true },
  { href: "/adicionar", label: "Adicionar", icon: Plus, mobile: true },
  { href: "/previsoes", label: "Previsões", icon: CalendarClock, mobile: true },
  { href: "/categories", label: "Categorias", icon: Tags },
  { href: "/reports", label: "Relatórios", icon: PieChart },
];
