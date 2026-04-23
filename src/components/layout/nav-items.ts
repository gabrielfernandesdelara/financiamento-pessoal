import {
  LayoutDashboard,
  ArrowLeftRight,
  CalendarClock,
  Tags,
  PieChart,
  Upload,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  mobile?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Painel", icon: LayoutDashboard, mobile: true },
  { href: "/transactions", label: "Transações", icon: ArrowLeftRight, mobile: true },
  { href: "/previsoes", label: "Previsões", icon: CalendarClock, mobile: true },
  { href: "/categories", label: "Categorias", icon: Tags, mobile: true },
  { href: "/reports", label: "Relatórios", icon: PieChart },
  { href: "/import", label: "Importar", icon: Upload },
];
