import { useState } from "react";
import { motion } from "framer-motion";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Clock,
  Download,
  FileText,
  History,
  Save,
  Send,
  Sparkles,
} from "lucide-react";

const complianceItems = [
  { item: "XLPE Power Cable 11kV", sku: "PWR-XLPE-11K-AL240", compliance: "Full", specMatch: 96 },
  { item: "Control Cable PVC", sku: "CTL-PVC-12C-1.5A", compliance: "Full", specMatch: 100 },
  { item: "Instrumentation Cable", sku: "INS-FRLS-4P-1.0S", compliance: "Full", specMatch: 94 },
  { item: "HT Cable 33kV", sku: "HT-XLPE-33K-CU95", compliance: "Full", specMatch: 92 },
  { item: "Fire Survival Cable", sku: "FS-LSZH-4C-16-2H", compliance: "Full", specMatch: 98 },
  { item: "Flexible Cable", sku: "FLX-EPR-3C-4", compliance: "Partial", specMatch: 68 },
];

const versions = [
  { id: 1, version: "v1.0", date: "2024-01-15 10:30", author: "System", status: "Draft" },
  { id: 2, version: "v1.1", date: "2024-01-15 14:45", author: "Sales Lead", status: "Draft" },
  { id: 3, version: "v1.2", date: "2024-01-16 09:15", author: "Sales Lead", status: "Review" },
];

export default function Proposal() {
  const [coverContent, setCoverContent] = useState(`Subject: Bid Response for Power Cable Supply

Dear Sir/Madam,

We are pleased to submit our technical and commercial bid for the supply of Power Cables and accessories as per your RFP reference number RFP/SEB/2024/1023.

Our company, with over 25 years of experience in the cable manufacturing industry, is well-positioned to meet all the technical specifications and delivery requirements outlined in your tender document.

Key Highlights of Our Bid:
• 100% compliance with IS/IEC standards
• Proven track record with government PSUs
• In-house testing facilities with NABL accreditation
• Committed delivery timelines

We look forward to your favorable consideration.

Respectfully submitted,
[Company Name]`);

  return (
    <MainLayout
      title="Proposal Builder"
      breadcrumbs={[
        { name: "Dashboard", href: "/dashboard" },
        { name: "Proposal Builder" },
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <p className="text-muted-foreground">
              RFP #1023 - State Electricity Board - Power Cable Supply
            </p>
            <div className="flex items-center gap-4 mt-2">
              <Badge variant="outline" className="bg-agent-master/10 text-agent-master border-agent-master/30">
                <Sparkles className="h-3 w-3 mr-1" />
                Master Agent Consolidated
              </Badge>
            </div>
          </div>
          <div className="flex gap-3">
            <Select defaultValue="v1.2">
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={v.version}>
                    {v.version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline">
              <History className="h-4 w-4 mr-2" />
              History
            </Button>
          </div>
        </motion.div>

        {/* Status Line */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-6 p-4 bg-card rounded-xl border border-border"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <span className="text-sm">Technical aligned</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <span className="text-sm">Pricing aligned</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning" />
            <span className="text-sm">Submission pending</span>
          </div>
          <div className="ml-auto">
            <Badge className="bg-warning/10 text-warning border border-warning/30">
              Due in 8 days
            </Badge>
          </div>
        </motion.div>

        {/* Proposal Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs defaultValue="cover" className="space-y-4">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="cover">Cover Letter</TabsTrigger>
              <TabsTrigger value="compliance">Product Compliance</TabsTrigger>
              <TabsTrigger value="pricing">Pricing Summary</TabsTrigger>
              <TabsTrigger value="preview">Full Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="cover" className="space-y-4">
              <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Cover Summary</h3>
                  <span className="text-xs text-muted-foreground">
                    Formatted for LSTK submission
                  </span>
                </div>
                <Textarea
                  value={coverContent}
                  onChange={(e) => setCoverContent(e.target.value)}
                  className="min-h-[400px] font-mono text-sm"
                />
              </div>
            </TabsContent>

            <TabsContent value="compliance" className="space-y-4">
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h3 className="font-semibold">Product Compliance Table</h3>
                  <p className="text-sm text-muted-foreground">
                    Auto-generated from Technical Agent analysis
                  </p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>RFP Item</TableHead>
                      <TableHead>Offered SKU</TableHead>
                      <TableHead className="text-center">Compliance</TableHead>
                      <TableHead className="text-center">Spec-Match</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {complianceItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.item}</TableCell>
                        <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            className={
                              item.compliance === "Full"
                                ? "bg-success/10 text-success border border-success/30"
                                : "bg-warning/10 text-warning border border-warning/30"
                            }
                          >
                            {item.compliance}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            className={
                              item.specMatch >= 90
                                ? "bg-success/10 text-success border border-success/30"
                                : item.specMatch >= 70
                                ? "bg-warning/10 text-warning border border-warning/30"
                                : "bg-destructive/10 text-destructive border border-destructive/30"
                            }
                          >
                            {item.specMatch}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="pricing" className="space-y-4">
              <div className="bg-card rounded-xl border border-border p-6">
                <div className="mb-4">
                  <h3 className="font-semibold">Consolidated Pricing</h3>
                  <p className="text-sm text-muted-foreground">
                    From Pricing Agent calculation
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-6">
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">Material Cost</p>
                    <p className="text-2xl font-bold font-mono mt-1">₹18,485,000</p>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">Testing & Services</p>
                    <p className="text-2xl font-bold font-mono mt-1">₹243,000</p>
                  </div>
                  <div className="p-4 bg-primary/10 rounded-lg border border-primary/30">
                    <p className="text-sm text-primary">Grand Total</p>
                    <p className="text-2xl font-bold font-mono mt-1 text-primary">₹18,728,000</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              <div className="bg-card rounded-xl border border-border p-8">
                <div className="max-w-3xl mx-auto space-y-8">
                  <div className="text-center border-b border-border pb-6">
                    <h1 className="text-2xl font-bold">BID RESPONSE</h1>
                    <p className="text-muted-foreground mt-2">
                      RFP Reference: RFP/SEB/2024/1023
                    </p>
                    <p className="text-muted-foreground">
                      State Electricity Board - Power Cable Supply
                    </p>
                  </div>
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-foreground bg-transparent p-0 border-0">
                      {coverContent}
                    </pre>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Version History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-xl border border-border p-4"
        >
          <h3 className="font-semibold mb-4">Version History</h3>
          <div className="space-y-2">
            {versions.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <Badge variant="outline">{v.version}</Badge>
                  <span className="text-sm">{v.date}</span>
                  <span className="text-sm text-muted-foreground">by {v.author}</span>
                </div>
                <Badge
                  className={
                    v.status === "Review"
                      ? "bg-info/10 text-info border border-info/30"
                      : "bg-muted text-muted-foreground"
                  }
                >
                  {v.status}
                </Badge>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-between pt-4"
        >
          <Button variant="outline">
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <div className="flex gap-3">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Export Word
            </Button>
            <Button>
              <Send className="h-4 w-4 mr-2" />
              Mark Ready to Submit
            </Button>
          </div>
        </motion.div>
      </div>
    </MainLayout>
  );
}
