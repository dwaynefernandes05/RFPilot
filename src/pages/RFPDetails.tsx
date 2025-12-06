import { useState } from "react";
import { motion } from "framer-motion";
import { useParams, Link } from "react-router-dom";
import {
  Calendar,
  Building2,
  Clock,
  Package,
  FileText,
  ExternalLink,
  Play,
  Cpu,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// Mock RFP data
const mockRFP = {
  id: "1023",
  title: "132kV XLPE Power Cables Supply for Substation Augmentation",
  buyer: "PGCIL (Power Grid Corporation of India Limited)",
  projectType: "LSTK - Turnkey Substation Project",
  portal: "GeM Portal",
  portalLink: "https://gem.gov.in",
  deadline: "2024-02-15",
  daysRemaining: 3,
  scopeItems: 18,
  estimatedValue: "₹45.2 Cr",
  priority: "critical" as const,
  status: "extracted" as const,
  description:
    "Supply of 132kV XLPE Power Cables with associated accessories for substation augmentation project in Northern Region. Includes installation support and 24-month warranty.",
  scopeSummary: [
    "12 categories of power cables",
    "Cable accessories (joints, terminations)",
    "Installation supervision",
    "Testing & commissioning support",
  ],
  testingRequirements: [
    "Factory Acceptance Tests (FAT)",
    "Site Acceptance Tests (SAT)",
    "Type Tests as per IS/IEC standards",
    "Routine Tests for all batches",
  ],
};

const activityLog = [
  {
    agent: "sales",
    action: "RFP discovered on GeM portal",
    timestamp: "2024-02-10 09:15 AM",
    status: "completed",
  },
  {
    agent: "sales",
    action: "Scope of supply extracted (18 line items)",
    timestamp: "2024-02-10 09:22 AM",
    status: "completed",
  },
  {
    agent: "technical",
    action: "Spec matching initiated",
    timestamp: "2024-02-10 10:00 AM",
    status: "in-progress",
  },
];

export default function RFPDetails() {
  const { id } = useParams();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleRunAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => setIsAnalyzing(false), 3000);
  };

  return (
    <MainLayout
      title={`RFP #${id}`}
      breadcrumbs={[
        { name: "Dashboard", href: "/dashboard" },
        { name: "RFP Discovery", href: "/discovery" },
        { name: `RFP #${id}` },
      ]}
    >
      {/* Header Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="lg:col-span-2 card-elevated p-6"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-muted-foreground">#{mockRFP.id}</span>
                <span className="badge-status badge-urgent">{mockRFP.priority}</span>
                <span className="badge-status badge-extracted">{mockRFP.status}</span>
              </div>
              <h1 className="text-2xl font-bold text-foreground">{mockRFP.title}</h1>
            </div>
            <Button variant="ghost" size="icon" asChild>
              <a href={mockRFP.portalLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-5 w-5" />
              </a>
            </Button>
          </div>

          <p className="mt-4 text-muted-foreground">{mockRFP.description}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Buyer</p>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="font-medium text-foreground">PGCIL</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Project Type</p>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="font-medium text-foreground">LSTK</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Scope Size</p>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <span className="font-medium text-foreground">{mockRFP.scopeItems} items</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Est. Value</p>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="font-medium text-foreground">{mockRFP.estimatedValue}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Deadline Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="card-elevated p-6 border-destructive/30 bg-destructive/5"
        >
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h3 className="font-semibold text-foreground">Urgent Deadline</h3>
          </div>

          <div className="text-center py-4">
            <p className="text-5xl font-bold text-destructive">{mockRFP.daysRemaining}</p>
            <p className="text-lg text-muted-foreground">days remaining</p>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-4">
            <Calendar className="h-4 w-4" />
            <span>Due: {mockRFP.deadline}</span>
          </div>

          <div className="mt-6 p-3 rounded-lg bg-destructive/10">
            <p className="text-xs text-destructive text-center">
              <strong>90% of wins</strong> correlate with timely action
            </p>
          </div>
        </motion.div>
      </div>

      {/* Actions Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="card-elevated p-4 mt-6 flex flex-wrap items-center gap-4"
      >
        <Button
          variant="default"
          size="lg"
          className="gap-2"
          onClick={handleRunAnalysis}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Play className="h-5 w-5" />
              Run Full AI Analysis
            </>
          )}
        </Button>
        <div className="h-8 w-px bg-border hidden sm:block" />
        <Button variant="outline" className="gap-2">
          <Cpu className="h-4 w-4" />
          Run Technical Analysis
        </Button>
        <Button variant="outline" className="gap-2">
          <DollarSign className="h-4 w-4" />
          Run Pricing Analysis
        </Button>
      </motion.div>

      {/* Tabs Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="mt-6"
      >
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="specs">Specifications</TabsTrigger>
            <TabsTrigger value="testing">Testing Req.</TabsTrigger>
            <TabsTrigger value="attachments">Attachments</TabsTrigger>
            <TabsTrigger value="activity">Activity Log</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Scope Summary */}
              <div className="card-elevated p-6">
                <h3 className="font-semibold text-foreground mb-4">Scope of Supply Summary</h3>
                <ul className="space-y-3">
                  {mockRFP.scopeSummary.map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <ChevronRight className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Testing Requirements */}
              <div className="card-elevated p-6">
                <h3 className="font-semibold text-foreground mb-4">Testing & Acceptance</h3>
                <ul className="space-y-3">
                  {mockRFP.testingRequirements.map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <ChevronRight className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-muted-foreground">
                  Est. site acceptance tests = significant cost driver
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="specs">
            <div className="card-elevated p-6">
              <p className="text-muted-foreground text-center py-8">
                Specifications will be populated after Technical Agent analysis
              </p>
            </div>
          </TabsContent>

          <TabsContent value="testing">
            <div className="card-elevated p-6">
              <p className="text-muted-foreground text-center py-8">
                Detailed testing requirements will be extracted by Technical Agent
              </p>
            </div>
          </TabsContent>

          <TabsContent value="attachments">
            <div className="card-elevated p-6">
              <p className="text-muted-foreground text-center py-8">
                RFP documents and attachments viewer
              </p>
            </div>
          </TabsContent>

          <TabsContent value="activity">
            <div className="card-elevated p-6">
              <h3 className="font-semibold text-foreground mb-6">Agent Activity Log</h3>
              <div className="space-y-4">
                {activityLog.map((log, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 pb-4 border-b border-border last:border-0"
                  >
                    <div
                      className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                        log.agent === "sales" && "bg-agent-sales/10",
                        log.agent === "technical" && "bg-agent-technical/10"
                      )}
                    >
                      {log.status === "completed" ? (
                        <CheckCircle
                          className={cn(
                            "h-4 w-4",
                            log.agent === "sales" && "text-agent-sales",
                            log.agent === "technical" && "text-agent-technical"
                          )}
                        />
                      ) : (
                        <Loader2
                          className={cn(
                            "h-4 w-4 animate-spin",
                            log.agent === "technical" && "text-agent-technical"
                          )}
                        />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{log.action}</p>
                      <p className="text-xs text-muted-foreground">{log.timestamp}</p>
                    </div>
                    <span
                      className={cn(
                        "badge-status text-xs",
                        log.status === "completed" && "badge-analyzed",
                        log.status === "in-progress" && "badge-extracted"
                      )}
                    >
                      {log.status === "completed" ? "Completed" : "In Progress"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </MainLayout>
  );
}
