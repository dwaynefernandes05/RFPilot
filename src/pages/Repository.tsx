import { useState } from "react";
import { motion } from "framer-motion";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Edit,
  Plus,
  Search,
  Trash2,
  Upload,
  Database,
  DollarSign,
} from "lucide-react";

const skuData = [
  {
    id: 1,
    skuCode: "PWR-XLPE-11K-AL240",
    name: "XLPE Power Cable 11kV",
    conductor: "Aluminium",
    size: "3x240 sq.mm",
    voltage: "11kV",
    insulation: "XLPE",
    unitPrice: 1250,
  },
  {
    id: 2,
    skuCode: "CTL-PVC-12C-1.5A",
    name: "Control Cable PVC",
    conductor: "Copper",
    size: "12C x 1.5 sq.mm",
    voltage: "1.1kV",
    insulation: "PVC",
    unitPrice: 320,
  },
  {
    id: 3,
    skuCode: "INS-FRLS-4P-1.0S",
    name: "Instrumentation Cable",
    conductor: "Copper",
    size: "4P x 1.0 sq.mm",
    voltage: "650V",
    insulation: "FRLS",
    unitPrice: 450,
  },
  {
    id: 4,
    skuCode: "HT-XLPE-33K-CU95",
    name: "HT Cable 33kV",
    conductor: "Copper",
    size: "3x95 sq.mm",
    voltage: "33kV",
    insulation: "XLPE",
    unitPrice: 3200,
  },
  {
    id: 5,
    skuCode: "FS-LSZH-4C-16-2H",
    name: "Fire Survival Cable",
    conductor: "Copper",
    size: "4x16 sq.mm",
    voltage: "1.1kV",
    insulation: "LSZH",
    unitPrice: 890,
  },
  {
    id: 6,
    skuCode: "FLX-EPR-3C-4",
    name: "Flexible Cable",
    conductor: "Copper",
    size: "3x4 sq.mm",
    voltage: "1.1kV",
    insulation: "EPR",
    unitPrice: 180,
  },
];

const testingPrices = [
  { id: 1, testType: "Routine Test - LT Cable", standard: "IS 7098", price: 5000 },
  { id: 2, testType: "Routine Test - HT Cable", standard: "IS 7098", price: 15000 },
  { id: 3, testType: "Type Test - Power Cable", standard: "IEC 60502", price: 85000 },
  { id: 4, testType: "Acceptance Test - Site", standard: "Client Spec", price: 25000 },
  { id: 5, testType: "Fire Survival Test", standard: "IEC 60331", price: 45000 },
  { id: 6, testType: "Smoke Density Test", standard: "IEC 61034", price: 32000 },
  { id: 7, testType: "Halogen Content Test", standard: "IEC 60754", price: 18000 },
  { id: 8, testType: "Partial Discharge Test", standard: "IEC 60270", price: 55000 },
];

export default function Repository() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);

  const filteredSKUs = skuData.filter(
    (sku) =>
      sku.skuCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sku.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MainLayout
      title="Product & Pricing Repository"
      breadcrumbs={[
        { name: "Dashboard", href: "/dashboard" },
        { name: "Product Repository" },
      ]}
    >
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search SKUs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-80"
              />
            </div>
            <Badge variant="outline">{skuData.length} Products</Badge>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Product</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>SKU Code</Label>
                      <Input placeholder="e.g., PWR-XLPE-11K-AL240" />
                    </div>
                    <div className="space-y-2">
                      <Label>Product Name</Label>
                      <Input placeholder="e.g., XLPE Power Cable 11kV" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Conductor</Label>
                      <Input placeholder="e.g., Aluminium" />
                    </div>
                    <div className="space-y-2">
                      <Label>Size</Label>
                      <Input placeholder="e.g., 3x240 sq.mm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Voltage Rating</Label>
                      <Input placeholder="e.g., 11kV" />
                    </div>
                    <div className="space-y-2">
                      <Label>Unit Price (₹)</Label>
                      <Input type="number" placeholder="e.g., 1250" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={() => setShowAddDialog(false)}>Save Product</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs defaultValue="products">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="products" className="gap-2">
                <Database className="h-4 w-4" />
                Product Catalog
              </TabsTrigger>
              <TabsTrigger value="testing" className="gap-2">
                <DollarSign className="h-4 w-4" />
                Testing Price Matrix
              </TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="mt-6">
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>SKU Code</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Conductor</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Voltage</TableHead>
                      <TableHead>Insulation</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSKUs.map((sku, index) => (
                      <motion.tr
                        key={sku.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="border-b border-border"
                      >
                        <TableCell className="font-mono text-sm font-medium">
                          {sku.skuCode}
                        </TableCell>
                        <TableCell>{sku.name}</TableCell>
                        <TableCell>{sku.conductor}</TableCell>
                        <TableCell className="text-sm">{sku.size}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{sku.voltage}</Badge>
                        </TableCell>
                        <TableCell>{sku.insulation}</TableCell>
                        <TableCell className="text-right font-mono">
                          ₹{sku.unitPrice.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="testing" className="mt-6">
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Test Type</TableHead>
                      <TableHead>Standard Reference</TableHead>
                      <TableHead className="text-right">Price (₹)</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {testingPrices.map((test, index) => (
                      <motion.tr
                        key={test.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="border-b border-border"
                      >
                        <TableCell className="font-medium">{test.testType}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{test.standard}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ₹{test.price.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Footer Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-info/10 border border-info/30 rounded-lg p-4"
        >
          <p className="text-sm text-info">
            <strong>Repository Info:</strong> Product catalog and pricing data is used by AI agents for spec-matching and bid pricing. Keep this data updated for accurate analysis.
          </p>
        </motion.div>
      </div>
    </MainLayout>
  );
}
