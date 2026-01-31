import { useState, useEffect, useRef } from "react";
import Papa from "papaparse";
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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Database,
  DollarSign,
  Eye,
  Pencil,
  Trash2,
  Upload,
  Download,
} from "lucide-react";

const API = "http://localhost:5000/api/products";

export default function Repository() {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [editProduct, setEditProduct] = useState<any | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [skuCode, setSkuCode] = useState("");
  const [productName, setProductName] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [customFields, setCustomFields] = useState<{ key: string; value: string }[]>([]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // RESTORED: Dummy Testing Matrix data
  const testingPrices = [
    { id: 1, testType: "Routine Test - LT Cable", standard: "IS 7098", price: 5000 },
    { id: 2, testType: "Routine Test - HT Cable", standard: "IS 7098", price: 15000 },
  ];

  const loadProducts = () => {
    fetch(API)
      .then((res) => res.json())
      .then(setProducts)
      .catch(console.error);
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const filteredProducts = products.filter(
    (p) =>
      p.sku_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getExtraFields = (product: any) => {
    const ignore = ["_id", "__v", "sku_code", "product_name", "unit_price_inr"];
    return Object.entries(product).filter(([k]) => !ignore.includes(k));
  };

  const resetForm = () => {
    setSkuCode("");
    setProductName("");
    setUnitPrice("");
    setCustomFields([]);
    setShowAddDialog(false);
  };

  // ---------------- ACTIONS ----------------

  const saveProduct = async () => {
    if (!skuCode || !productName || !unitPrice) {
      alert("Mandatory fields missing");
      return;
    }
    const payload: any = {
      sku_code: skuCode,
      product_name: productName,
      unit_price_inr: Number(unitPrice),
    };
    customFields.forEach((f) => f.key && (payload[f.key] = f.value));

    await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    resetForm();
    loadProducts();
  };

  const updateProduct = async () => {
    const payload: any = {
      sku_code: skuCode,
      product_name: productName,
      unit_price_inr: Number(unitPrice),
    };
    customFields.forEach((f) => f.key && (payload[f.key] = f.value));

    await fetch(`${API}/${editProduct._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    resetForm();
    setEditProduct(null);
    loadProducts();
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Delete this product permanently?")) return;
    await fetch(`${API}/${id}`, { method: "DELETE" });
    loadProducts();
  };

  // ---------------- EXPORT / IMPORT LOGIC ----------------

  // NEW: Export function to download all current products to CSV
  const exportCSV = () => {
    if (products.length === 0) return alert("No data to export");
    const csv = Papa.unparse(products);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "product_repository_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCSVUpload = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => 
        header.toLowerCase().replace(/\uFEFF/g, "").trim().replace(/\s+/g, "_"),
      complete: async (results) => {
        const rows = results.data as any[];
        if (!rows.length) return alert("CSV is empty");

        let success = 0;
        let failed = 0;

        for (const row of rows) {
          if (!row.sku_code || !row.product_name || !row.unit_price_inr) {
            failed++;
            continue;
          }

          const payload: any = {
            sku_code: String(row.sku_code).trim(),
            product_name: String(row.product_name).trim(),
            unit_price_inr: Number(row.unit_price_inr),
          };

          Object.keys(row).forEach((k) => {
            if (!["sku_code", "product_name", "unit_price_inr"].includes(k) && row[k]) {
              payload[k] = row[k];
            }
          });

          try {
            const res = await fetch(API, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
            res.ok ? success++ : failed++;
          } catch {
            failed++;
          }
        }
        alert(`✅ Imported ${success} products\n❌ Failed ${failed}`);
        loadProducts();
      },
    });
  };

  return (
    <MainLayout title="Product Repository">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleCSVUpload(file);
          e.target.value = "";
        }}
      />

      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-3 items-center">
          <Input
            placeholder="Search SKU or Product..."
            value={searchTerm}
            className="w-64"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Badge variant="outline">{products.length} Products</Badge>
        </div>

        <div className="flex gap-2">
          {/* UPDATED: Export Button replaces Template button */}
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" /> Import CSV
          </Button>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Product
          </Button>
        </div>
      </div>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products">
            <Database className="h-4 w-4 mr-1" /> Product Catalog
          </TabsTrigger>
          <TabsTrigger value="testing">
            <DollarSign className="h-4 w-4 mr-1" /> Testing Matrix
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <div className="rounded-xl border mt-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((p) => (
                  <TableRow key={p._id}>
                    <TableCell className="font-mono">{p.sku_code}</TableCell>
                    <TableCell>{p.product_name}</TableCell>
                    <TableCell className="text-right">₹{p.unit_price_inr}</TableCell>
                    <TableCell className="flex justify-center gap-2">
                      <Button size="icon" variant="ghost" onClick={() => setSelectedProduct(p)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => {
                        setEditProduct(p);
                        setSkuCode(p.sku_code);
                        setProductName(p.product_name);
                        setUnitPrice(String(p.unit_price_inr));
                        setCustomFields(getExtraFields(p).map(([k, v]) => ({ key: k, value: String(v) })));
                      }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => deleteProduct(p._id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* RESTORED: Testing Matrix Content */}
        <TabsContent value="testing">
          <div className="rounded-xl border mt-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test Type</TableHead>
                  <TableHead>Standard</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {testingPrices.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.testType}</TableCell>
                    <TableCell>{t.standard}</TableCell>
                    <TableCell className="text-right">₹{t.price}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* VIEW MODAL */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Product Details</DialogTitle></DialogHeader>
          {selectedProduct && (
            <div className="space-y-2">
              <p><b>SKU:</b> {selectedProduct.sku_code}</p>
              <p><b>Name:</b> {selectedProduct.product_name}</p>
              <p><b>Price:</b> ₹{selectedProduct.unit_price_inr}</p>
              <hr />
              {getExtraFields(selectedProduct).map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="capitalize">{k.replace(/_/g, " ")}</span>
                  <span>{String(v)}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ADD/EDIT MODAL */}
      <Dialog open={showAddDialog || !!editProduct} onOpenChange={() => { resetForm(); setEditProduct(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editProduct ? "Edit Product" : "Add Product"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>SKU</Label><Input value={skuCode} onChange={(e) => setSkuCode(e.target.value)} /></div>
            <div><Label>Name</Label><Input value={productName} onChange={(e) => setProductName(e.target.value)} /></div>
            <div><Label>Price</Label><Input type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} /></div>
            <div>
              <Label>Extra Attributes</Label>
              {customFields.map((f, i) => (
                <div key={i} className="flex gap-2 mt-2">
                  <Input placeholder="Field Name" value={f.key} onChange={(e) => {
                    const c = [...customFields]; c[i].key = e.target.value; setCustomFields(c);
                  }} />
                  <Input placeholder="Value" value={f.value} onChange={(e) => {
                    const c = [...customFields]; c[i].value = e.target.value; setCustomFields(c);
                  }} />
                  <Button variant="ghost" onClick={() => setCustomFields(customFields.filter((_, idx) => idx !== i))}>✕</Button>
                </div>
              ))}
              <Button variant="outline" size="sm" className="mt-2" onClick={() => setCustomFields([...customFields, { key: "", value: "" }])}>+ Add Field</Button>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { resetForm(); setEditProduct(null); }}>Cancel</Button>
              <Button onClick={editProduct ? updateProduct : saveProduct}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}