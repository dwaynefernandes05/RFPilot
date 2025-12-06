import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Search,
  Filter,
  Calendar,
  ArrowUpDown,
  ExternalLink,
  Eye,
  Clock,
  Building2,
  Package,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface RFP {
  id: string;
  title: string;
  buyer: string;
  portal: string;
  deadline: string;
  daysRemaining: number;
  scopeItems: number;
  estimatedValue: string;
  priority: "critical" | "high" | "medium" | "low";
  status: "new" | "extracted" | "analyzed";
}

const mockRFPs: RFP[] = [
  {
    id: "1023",
    title: "132kV XLPE Power Cables Supply for Substation Augmentation",
    buyer: "PGCIL",
    portal: "GeM",
    deadline: "2024-02-15",
    daysRemaining: 3,
    scopeItems: 18,
    estimatedValue: "₹45.2 Cr",
    priority: "critical",
    status: "extracted",
  },
  {
    id: "1024",
    title: "LT Aerial Bunched Cables Package for Rural Electrification",
    buyer: "MSEDCL",
    portal: "E-Tender",
    deadline: "2024-02-22",
    daysRemaining: 10,
    scopeItems: 12,
    estimatedValue: "₹12.8 Cr",
    priority: "high",
    status: "new",
  },
  {
    id: "1025",
    title: "Control & Instrumentation Cables for Thermal Power Plant",
    buyer: "NTPC",
    portal: "E-Tender",
    deadline: "2024-02-25",
    daysRemaining: 13,
    scopeItems: 24,
    estimatedValue: "₹8.5 Cr",
    priority: "medium",
    status: "analyzed",
  },
  {
    id: "1026",
    title: "HT Power Cables with Accessories for Industrial Complex",
    buyer: "BHEL",
    portal: "GeM",
    deadline: "2024-03-01",
    daysRemaining: 17,
    scopeItems: 8,
    estimatedValue: "₹22.1 Cr",
    priority: "high",
    status: "new",
  },
  {
    id: "1027",
    title: "Fiber Optic Cables for Communication Network Expansion",
    buyer: "BSNL",
    portal: "E-Tender",
    deadline: "2024-03-05",
    daysRemaining: 21,
    scopeItems: 15,
    estimatedValue: "₹6.3 Cr",
    priority: "medium",
    status: "new",
  },
  {
    id: "1028",
    title: "Marine Cables for Offshore Platform",
    buyer: "ONGC",
    portal: "E-Tender",
    deadline: "2024-03-10",
    daysRemaining: 26,
    scopeItems: 6,
    estimatedValue: "₹18.7 Cr",
    priority: "low",
    status: "new",
  },
];

const priorityConfig = {
  critical: { label: "Critical", className: "badge-urgent" },
  high: { label: "High", className: "bg-warning/10 text-warning" },
  medium: { label: "Medium", className: "bg-info/10 text-info" },
  low: { label: "Low", className: "bg-muted text-muted-foreground" },
};

const statusConfig = {
  new: { label: "New", className: "badge-new" },
  extracted: { label: "Extracted", className: "badge-extracted" },
  analyzed: { label: "Analyzed", className: "badge-analyzed" },
};

export default function Discovery() {
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredRFPs = mockRFPs.filter((rfp) => {
    const matchesSearch =
      rfp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rfp.buyer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === "all" || rfp.priority === priorityFilter;
    const matchesStatus = statusFilter === "all" || rfp.status === statusFilter;
    return matchesSearch && matchesPriority && matchesStatus;
  });

  return (
    <MainLayout
      title="RFP Discovery"
      breadcrumbs={[{ name: "Dashboard", href: "/dashboard" }, { name: "RFP Discovery" }]}
    >
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="card-elevated p-6 mb-6"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Discovered RFPs</h2>
            <p className="text-sm text-muted-foreground">
              Sales Agent monitors 12 PSU portals and extracts matching opportunities
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search RFPs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-9"
              />
            </div>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-32">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="extracted">Extracted</SelectItem>
                <SelectItem value="analyzed">Analyzed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </motion.div>

      {/* RFP Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="card-elevated overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead className="bg-muted/50">
              <tr>
                <th className="w-12">#</th>
                <th>RFP Details</th>
                <th>
                  <button className="flex items-center gap-1 hover:text-foreground transition-colors">
                    Deadline <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th>Scope</th>
                <th>Est. Value</th>
                <th>Priority</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRFPs.map((rfp, index) => (
                <motion.tr
                  key={rfp.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.15 + index * 0.05 }}
                  className="group"
                >
                  <td className="font-mono text-muted-foreground">#{rfp.id}</td>
                  <td>
                    <div className="max-w-md">
                      <p className="font-medium text-foreground truncate">{rfp.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {rfp.buyer}
                        </span>
                        <span className="text-border">•</span>
                        <span>{rfp.portal}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <Clock
                        className={cn(
                          "h-4 w-4",
                          rfp.daysRemaining <= 5 && "text-destructive",
                          rfp.daysRemaining > 5 && rfp.daysRemaining <= 14 && "text-warning",
                          rfp.daysRemaining > 14 && "text-muted-foreground"
                        )}
                      />
                      <div>
                        <p
                          className={cn(
                            "font-medium",
                            rfp.daysRemaining <= 5 && "text-destructive",
                            rfp.daysRemaining > 5 && rfp.daysRemaining <= 14 && "text-warning"
                          )}
                        >
                          {rfp.daysRemaining} days
                        </p>
                        <p className="text-xs text-muted-foreground">{rfp.deadline}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span>{rfp.scopeItems} items</span>
                    </div>
                  </td>
                  <td className="font-semibold text-foreground">{rfp.estimatedValue}</td>
                  <td>
                    <span className={cn("badge-status", priorityConfig[rfp.priority].className)}>
                      {priorityConfig[rfp.priority].label}
                    </span>
                  </td>
                  <td>
                    <span className={cn("badge-status", statusConfig[rfp.status].className)}>
                      {statusConfig[rfp.status].label}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link to={`/rfp/${rfp.id}`}>
                        <Button variant="ghost" size="sm" className="gap-1.5">
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      </Link>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Info Banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="mt-6 p-4 rounded-lg bg-info/10 border border-info/20"
      >
        <p className="text-sm text-info">
          <strong>Business Insight:</strong> Technical SKU matching is the most time-consuming step —
          now automated by AI. Focus on reviewing high-priority RFPs to maximize win rates.
        </p>
      </motion.div>
    </MainLayout>
  );
}
