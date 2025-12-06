import { useState } from "react";
import { motion } from "framer-motion";
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
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Calculator,
  FileText,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const pricingItems = [
  {
    id: 1,
    skuCode: "PWR-XLPE-11K-AL240",
    itemName: "XLPE Power Cable 11kV",
    quantity: 5000,
    unit: "meters",
    unitPrice: 1250,
    testingCost: 45000,
    specMatch: 96,
  },
  {
    id: 2,
    skuCode: "CTL-PVC-12C-1.5A",
    itemName: "Control Cable PVC",
    quantity: 8000,
    unit: "meters",
    unitPrice: 320,
    testingCost: 28000,
    specMatch: 100,
  },
  {
    id: 3,
    skuCode: "INS-FRLS-4P-1.0S",
    itemName: "Instrumentation Cable",
    quantity: 3000,
    unit: "meters",
    unitPrice: 450,
    testingCost: 32000,
    specMatch: 94,
  },
  {
    id: 4,
    skuCode: "HT-XLPE-33K-CU95",
    itemName: "HT Cable 33kV",
    quantity: 2000,
    unit: "meters",
    unitPrice: 3200,
    testingCost: 85000,
    specMatch: 92,
  },
  {
    id: 5,
    skuCode: "FS-LSZH-4C-16-2H",
    itemName: "Fire Survival Cable",
    quantity: 1500,
    unit: "meters",
    unitPrice: 890,
    testingCost: 38000,
    specMatch: 98,
  },
  {
    id: 6,
    skuCode: "FLX-EPR-3C-4",
    itemName: "Flexible Cable",
    quantity: 2500,
    unit: "meters",
    unitPrice: 180,
    testingCost: 15000,
    specMatch: 68,
  },
];

export default function Pricing() {
  const [items, setItems] = useState(pricingItems);

  const updateQuantity = (id: number, quantity: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const materialTotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const testingTotal = items.reduce((sum, item) => sum + item.testingCost, 0);
  const grandTotal = materialTotal + testingTotal;

  const lowMatchItems = items.filter((item) => item.specMatch < 70);

  return (
    <MainLayout
      title="Pricing Workspace"
      breadcrumbs={[
        { name: "Dashboard", href: "/dashboard" },
        { name: "Pricing & Summary" },
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
              <Badge variant="outline" className="bg-agent-pricing/10 text-agent-pricing border-agent-pricing/30">
                <Sparkles className="h-3 w-3 mr-1" />
                Pricing Agent Complete
              </Badge>
              <span className="text-sm text-muted-foreground">
                Auto-generated from confirmed SKUs
              </span>
            </div>
          </div>
        </motion.div>

        {/* Risk Warning */}
        {lowMatchItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3"
          >
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Risk Flag: Low Spec-Match Items</p>
              <p className="text-sm text-destructive/80 mt-1">
                {lowMatchItems.length} item(s) have spec-match below 70%. Consider reviewing technical specifications or adjusting pricing for risk.
              </p>
            </div>
          </motion.div>
        )}

        {/* Pricing Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-xl border border-border overflow-hidden"
        >
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>SKU Code</TableHead>
                <TableHead>Item Description</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Unit Price (₹)</TableHead>
                <TableHead className="text-right">Material Total (₹)</TableHead>
                <TableHead className="text-right">Testing Cost (₹)</TableHead>
                <TableHead className="text-right">Line Total (₹)</TableHead>
                <TableHead className="text-center">Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => {
                const materialCost = item.quantity * item.unitPrice;
                const lineTotal = materialCost + item.testingCost;
                const isLowMatch = item.specMatch < 70;

                return (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={cn(
                      "border-b border-border",
                      isLowMatch && "bg-destructive/5"
                    )}
                  >
                    <TableCell className="font-mono text-sm">{item.skuCode}</TableCell>
                    <TableCell>{item.itemName}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            updateQuantity(item.id, parseInt(e.target.value) || 0)
                          }
                          className="w-24 text-right"
                        />
                        <span className="text-xs text-muted-foreground">{item.unit}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ₹{item.unitPrice.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ₹{materialCost.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ₹{item.testingCost.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      ₹{lineTotal.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      {isLowMatch ? (
                        <Badge className="bg-destructive/10 text-destructive border border-destructive/30">
                          {item.specMatch}%
                        </Badge>
                      ) : (
                        <CheckCircle2 className="h-5 w-5 text-success mx-auto" />
                      )}
                    </TableCell>
                  </motion.tr>
                );
              })}
            </TableBody>
          </Table>
        </motion.div>

        {/* Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-3 gap-4"
        >
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Material Price</span>
            </div>
            <p className="text-2xl font-bold font-mono">
              ₹{materialTotal.toLocaleString()}
            </p>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-info/10">
                <Calculator className="h-5 w-5 text-info" />
              </div>
              <span className="text-sm text-muted-foreground">Testing & Services</span>
            </div>
            <p className="text-2xl font-bold font-mono">
              ₹{testingTotal.toLocaleString()}
            </p>
          </div>

          <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl border border-primary/30 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary">
                <FileText className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-sm text-primary">Grand Total Bid Price</span>
            </div>
            <p className="text-3xl font-bold font-mono text-primary">
              ₹{grandTotal.toLocaleString()}
            </p>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-between pt-4"
        >
          <p className="text-sm text-muted-foreground">
            Pricing auto-generated from Product & Pricing Repository
          </p>
          <div className="flex gap-3">
            <Button variant="outline">
              <Calculator className="h-4 w-4 mr-2" />
              Recalculate
            </Button>
            <Button>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Finalize Pricing & Proceed
            </Button>
          </div>
        </motion.div>
      </div>
    </MainLayout>
  );
}
