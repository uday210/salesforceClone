"use client";
import {
  Box, Building2, User, UserPlus, TrendingUp, CheckSquare, Briefcase,
  AppWindow, Home, Settings, Search, Bell, Grid3x3, ChevronDown, Plus,
  Pencil, Trash2, X, Check, Loader2, Database, Shield, Users, Workflow,
  Code2, FileCode, Tag, SlidersHorizontal, Layout, List, Phone, Mail,
  Globe, Calendar, DollarSign, Hash, Percent, Type, AlignLeft, ToggleLeft,
  ChevronRight, LogOut, Star, Filter, ArrowLeft, Save, Eye, Zap, Layers,
  Columns, GitBranch, Play, MoreHorizontal, LinkIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const map: Record<string, LucideIcon> = {
  Box, Building2, User, UserPlus, TrendingUp, CheckSquare, Briefcase,
  AppWindow, Home, Settings, Search, Bell, Grid3x3, ChevronDown, Plus,
  Pencil, Trash2, X, Check, Loader2, Database, Shield, Users, Workflow,
  Code2, FileCode, Tag, SlidersHorizontal, Layout, List, Phone, Mail,
  Globe, Calendar, DollarSign, Hash, Percent, Type, AlignLeft, ToggleLeft,
  ChevronRight, LogOut, Star, Filter, ArrowLeft, Save, Eye, Zap, Layers,
  Columns, GitBranch, Play, MoreHorizontal, Link: LinkIcon,
};

export function Icon({ name, size = 16, className, color }: { name: string; size?: number; className?: string; color?: string }) {
  const Cmp = map[name] || Box;
  return <Cmp size={size} className={className} color={color} />;
}

export function fieldTypeIcon(type: string): string {
  const m: Record<string, string> = {
    text: "Type", textarea: "AlignLeft", number: "Hash", currency: "DollarSign",
    percent: "Percent", checkbox: "ToggleLeft", date: "Calendar", datetime: "Calendar",
    email: "Mail", phone: "Phone", url: "Globe", picklist: "List", multipicklist: "List",
    lookup: "Link", formula: "Hash", autonumber: "Hash",
  };
  return m[type] || "Type";
}
