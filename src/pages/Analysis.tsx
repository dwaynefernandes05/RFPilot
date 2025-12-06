import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Eye,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const specItems = [
  {
    id: 1,
    itemName: "XLPE Power Cable 11kV",
    specs: "Conductor: Aluminium, Size: 3x240 sq.mm, Voltage: 11kV",
    matches: [
      { sku: "PWR-XLPE-11K-AL240", match: 96, price: 1250 },
      { sku: "PWR-XLPE-11K-AL185", match: 82, price: 980 },
      { sku: "PWR-XLPE-11K-CU240", match: 78, price: 2100 },
    ],
    status: "matched",
  },
  {
    id: 2,
    itemName: "Control Cable PVC",
    specs: "Cores: 12, Size: 1.5 sq.mm, Armoured: Yes",
    matches: [
      { sku: "CTL-PVC-12C-1.5A", match: 100, price: 320 },
      { sku: "CTL-PVC-10C-1.5A", match: 85, price: 290 },
      { sku: "CTL-PVC-12C-2.5A", match: 75, price: 380 },
    ],
    status: "matched",
  },
  {
    id: 3,
    itemName: "Instrumentation Cable",
    specs: "Pairs: 4, Size: 1.0 sq.mm, Shielded: Yes, FRLS",
    matches: [
      { sku: "INS-FRLS-4P-1.0S", match: 94, price: 450 },
      { sku: "INS-FRLS-6P-1.0S", match: 72, price: 520 },
      { sku: "INS-PVC-4P-1.0S", match: 68, price: 380 },
    ],
    status: "matched",
  },
  {
    id: 4,
    itemName: "HT Cable 33kV",
    specs: "Conductor: Copper, Size: 3x95 sq.mm, XLPE Insulation",
    matches: [
      { sku: "HT-XLPE-33K-CU95", match: 92, price: 3200 },
      { sku: "HT-XLPE-33K-CU120", match: 88, price: 3600 },
      { sku: "HT-XLPE-33K-AL95", match: 65, price: 2100 },
    ],
    status: "matched",
  },
  {
    id: 5,
    itemName: "Fire Survival Cable",
    specs: "Size: 4x16 sq.mm, 2 Hour Rating, LSZH",
    matches: [
      { sku: "FS-LSZH-4C-16-2H", match: 98, price: 890 },
      { sku: "FS-LSZH-4C-10-2H", match: 76, price: 720 },
    ],
    status: "matched",
  },
  {
    id: 6,
    itemName: "Flexible Cable",
    specs: "Size: 3x4 sq.mm, Voltage: 1.1kV, EPR Insulated",
    matches: [
      { sku: "FLX-EPR-3C-4", match: 88, price: 180 },
      { sku: "FLX-PVC-3C-4", match: 62, price: 120 },
    ],
    status: "review",
  },
];

const comparisonData = {
  specs: [
    { param: "Conductor Material", rfp: "Aluminium", sku1: "Aluminium", sku2: "Aluminium", sku3: "Copper" },
    { param: "Conductor Size", rfp: "3x240 sq.mm", sku1: "3x240 sq.mm", sku2: "3x185 sq.mm", sku3: "3x240 sq.mm" },
    { param: "Voltage Rating", rfp: "11kV", sku1: "11kV", sku2: "11kV", sku3: "11kV" },
    { param: "Insulation", rfp: "XLPE", sku1: "XLPE", sku2: "XLPE", sku3: "XLPE" },
    { param: "Armouring", rfp: "Steel Wire", sku1: "Steel Wire", sku2: "Steel Wire", sku3: "Steel Wire" },
    { param: "Sheath", rfp: "PVC", sku1: "PVC", sku2: "PVC", sku3: "PVC" },
  ],
};

export default function Analysis() {
  const [expandedRows, setExpandedRows] = useState<number[]>([]);
  const [selectedSKUs, setSelectedSKUs] = useState<Record<number, string>>({});
  const [showComparison, setShowComparison] = useState(false);
  const [showOverride, setShowOverride] = useState(false);
  const [overrideComment, setOverrideComment] = useState("");

  const toggleRow = (id: number) => {
    setExpandedRows((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const selectSKU = (itemId: number, sku: string) => {
    setSelectedSKUs((prev) => ({ ...prev, [itemId]: sku }));
  };

  const getMatchColor = (match: number) => {
    if (match >= 90) return "bg-success/10 text-success border-success/30";
    if (match >= 70) return "bg-warning/10 text-warning border-warning/30";
    return "bg-destructive/10 text-destructive border-destructive/30";
  };

  const getMatchBg = (match: number) => {
    if (match >= 90) return "bg-success";
    if (match >= 70) return "bg-warning";
    return "bg-destructive";
  };

  return (
    <MainLayout
      title="Technical Spec-Matching Workspace"
      breadcrumbs={[
        { name: "Dashboard", href: "/dashboard" },
        { name: "AI Analysis Workspace" },
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
              <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                <Sparkles className="h-3 w-3 mr-1" />
                Technical Agent Complete
              </Badge>
              <span className="text-sm text-muted-foreground">
                6 items matched • Avg Spec-Match: 91%
              </span>
            </div>
          </div>
          <Button onClick={() => setShowComparison(true)}>
            <Eye className="h-4 w-4 mr-2" />
            Show Comparison Table
          </Button>
        </motion.div>

        {/* Info Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-info/10 border border-info/30 rounded-lg p-4"
        >
          <p className="text-sm text-info">
            <strong>Automation Insight:</strong> Technical SKU matching is the most time-consuming manual task — now automated. Review and confirm matches below.
          </p>
        </motion.div>

        {/* Spec Matching Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-xl border border-border overflow-hidden"
        >
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-8"></TableHead>
                <TableHead>Item Name</TableHead>
                <TableHead>Required Technical Specs</TableHead>
                <TableHead>Best Match SKU</TableHead>
                <TableHead className="text-center">Spec-Match %</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {specItems.map((item, index) => (
                <>
                  <TableRow
                    key={item.id}
                    className={cn(
                      "cursor-pointer transition-colors",
                      expandedRows.includes(item.id) && "bg-muted/30"
                    )}
                    onClick={() => toggleRow(item.id)}
                  >
                    <TableCell>
                      <motion.div
                        animate={{ rotate: expandedRows.includes(item.id) ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </motion.div>
                    </TableCell>
                    <TableCell className="font-medium">{item.itemName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {item.specs}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {selectedSKUs[item.id] || item.matches[0].sku}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn("border", getMatchColor(item.matches[0].match))}>
                        {item.matches[0].match}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {item.status === "matched" ? (
                        <CheckCircle2 className="h-5 w-5 text-success mx-auto" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-warning mx-auto" />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowOverride(true);
                        }}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  <AnimatePresence>
                    {expandedRows.includes(item.id) && (
                      <TableRow>
                        <TableCell colSpan={7} className="p-0">
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 bg-muted/20 space-y-3">
                              <p className="text-sm font-medium">Alternative SKU Matches:</p>
                              <div className="grid grid-cols-3 gap-3">
                                {item.matches.map((match, idx) => (
                                  <motion.div
                                    key={match.sku}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      selectSKU(item.id, match.sku);
                                    }}
                                    className={cn(
                                      "p-3 rounded-lg border cursor-pointer transition-all",
                                      selectedSKUs[item.id] === match.sku || (!selectedSKUs[item.id] && idx === 0)
                                        ? "border-primary bg-primary/5"
                                        : "border-border bg-card hover:border-primary/50"
                                    )}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="font-mono text-sm">{match.sku}</span>
                                      <Badge className={cn("text-xs border", getMatchColor(match.match))}>
                                        {match.match}%
                                      </Badge>
                                    </div>
                                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className={cn("h-full rounded-full", getMatchBg(match.match))}
                                        style={{ width: `${match.match}%` }}
                                      />
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2">
                                      ₹{match.price.toLocaleString()}/unit
                                    </p>
                                  </motion.div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        </TableCell>
                      </TableRow>
                    )}
                  </AnimatePresence>
                </>
              ))}
            </TableBody>
          </Table>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-between"
        >
          <p className="text-sm text-muted-foreground">
            {Object.keys(selectedSKUs).length} of {specItems.length} items confirmed
          </p>
          <div className="flex gap-3">
            <Button variant="outline">Save Draft</Button>
            <Button>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Confirm Selected SKUs
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Comparison Dialog */}
      <Dialog open={showComparison} onOpenChange={setShowComparison}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detailed Spec Comparison - XLPE Power Cable 11kV</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Spec Parameter</TableHead>
                <TableHead>RFP Requirement</TableHead>
                <TableHead>SKU #1 (96%)</TableHead>
                <TableHead>SKU #2 (82%)</TableHead>
                <TableHead>SKU #3 (78%)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisonData.specs.map((spec) => (
                <TableRow key={spec.param}>
                  <TableCell className="font-medium">{spec.param}</TableCell>
                  <TableCell className="bg-primary/5">{spec.rfp}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {spec.sku1}
                      {spec.sku1 === spec.rfp ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {spec.sku2}
                      {spec.sku2 === spec.rfp ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {spec.sku3}
                      {spec.sku3 === spec.rfp ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      {/* Override Dialog */}
      <Dialog open={showOverride} onOpenChange={setShowOverride}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Override Comment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Provide a reason for overriding the suggested SKU match (e.g., "New MTO SKU needed").
            </p>
            <Textarea
              value={overrideComment}
              onChange={(e) => setOverrideComment(e.target.value)}
              placeholder="Enter your comment..."
              rows={4}
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowOverride(false)}>
                Cancel
              </Button>
              <Button onClick={() => setShowOverride(false)}>
                Save Override
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
