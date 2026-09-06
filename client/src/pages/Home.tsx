import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { calculateRetailValue, calculateStockValue, isLowStock } from "../../../shared/inventory";
import { toast } from "sonner";
import {
  Barcode,
  Boxes,
  CircleDollarSign,
  PackagePlus,
  Pencil,
  Search,
  ShoppingBasket,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";

type ProductForm = {
  name: string;
  barcode: string;
  category: string;
  unit: string;
  quantity: string;
  minStock: string;
  purchasePrice: string;
  sellingPrice: string;
};

type Product = {
  id: number;
  name: string;
  barcode: string | null;
  category: string;
  unit: string;
  quantity: string;
  minStock: string;
  purchasePrice: string;
  sellingPrice: string;
};

const emptyForm: ProductForm = {
  name: "",
  barcode: "",
  category: "General",
  unit: "pcs",
  quantity: "0",
  minStock: "0",
  purchasePrice: "0",
  sellingPrice: "0",
};

const numberFormat = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const quantityFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 });
const money = (value: number) => numberFormat.format(value);
const quantity = (value: string | number) => quantityFormat.format(Number(value) || 0);

function StatCard({ label, value, detail, icon: Icon, tone = "blue" }: { label: string; value: string; detail: string; icon: LucideIcon; tone?: "blue" | "orange" | "green" | "red" }) {
  const toneStyles = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    orange: "bg-orange-50 text-orange-700 ring-orange-100",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    red: "bg-rose-50 text-rose-700 ring-rose-100",
  }[tone];

  return (
    <Card className="border-0 bg-white shadow-[0_12px_34px_rgba(20,33,61,0.06)]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
            <p className="mt-1 text-xs text-slate-500">{detail}</p>
          </div>
          <div className={`rounded-2xl p-3 ring-4 ${toneStyles}`}><Icon className="h-5 w-5" /></div>
        </div>
      </CardContent>
    </Card>
  );
}

function initialForm(product?: Product | null): ProductForm {
  if (!product) return emptyForm;
  return {
    name: product.name,
    barcode: product.barcode ?? "",
    category: product.category,
    unit: product.unit,
    quantity: product.quantity,
    minStock: product.minStock,
    purchasePrice: product.purchasePrice,
    sellingPrice: product.sellingPrice,
  };
}

export default function Home() {
  return (
    <DashboardLayout>
      <InventoryDashboard />
    </DashboardLayout>
  );
}

function InventoryDashboard() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const listInput = useMemo(() => ({ search: search.trim() || undefined }), [search]);
  const utils = trpc.useUtils();
  const productsQuery = trpc.products.list.useQuery(listInput);
  const summaryQuery = trpc.products.summary.useQuery();

  const refresh = async () => {
    await Promise.all([utils.products.list.invalidate(), utils.products.summary.invalidate()]);
  };

  const createMutation = trpc.products.create.useMutation({
    onSuccess: async () => {
      toast.success("Product added to inventory");
      setDialogOpen(false);
      await refresh();
    },
    onError: error => toast.error(error.message || "Could not add product"),
  });
  const updateMutation = trpc.products.update.useMutation({
    onSuccess: async () => {
      toast.success("Product updated");
      setDialogOpen(false);
      await refresh();
    },
    onError: error => toast.error(error.message || "Could not update product"),
  });
  const deleteMutation = trpc.products.delete.useMutation({
    onSuccess: async () => {
      toast.success("Product removed");
      await refresh();
    },
    onError: error => toast.error(error.message || "Could not remove product"),
  });

  const summary = summaryQuery.data ?? { totalProducts: 0, totalUnits: 0, purchaseValue: 0, retailValue: 0, lowStock: 0 };
  const products = (productsQuery.data ?? []) as Product[];
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const openAdd = () => {
    setEditingProduct(null);
    setForm(initialForm());
    setDialogOpen(true);
  };
  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setForm(initialForm(product));
    setDialogOpen(true);
  };
  const updateField = (field: keyof ProductForm, value: string) => setForm(current => ({ ...current, [field]: value }));
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const input = {
      ...form,
      quantity: Number(form.quantity) || 0,
      minStock: Number(form.minStock) || 0,
      purchasePrice: Number(form.purchasePrice) || 0,
      sellingPrice: Number(form.sellingPrice) || 0,
    };
    if (editingProduct) updateMutation.mutate({ id: editingProduct.id, ...input });
    else createMutation.mutate(input);
  };
  const removeProduct = (product: Product) => {
    if (window.confirm(`Remove ${product.name} from inventory?`)) deleteMutation.mutate({ id: product.id });
  };

  return (
    <div className="min-h-[calc(100vh-2rem)] bg-[#f6f8fb] -m-4 p-4 md:p-7">
      <div className="mx-auto max-w-[1500px] space-y-7">
        <header className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">
              <span className="h-2 w-2 rounded-full bg-orange-500" /> Store control center
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] text-slate-950 md:text-4xl">Inventory overview</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Keep a clear view of what is on your shelves, what it cost, and what it is worth at today’s selling price.</p>
          </div>
          <Button onClick={openAdd} className="h-11 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 hover:bg-slate-800">
            <PackagePlus className="mr-2 h-4 w-4" /> Add product
          </Button>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Products" value={quantity(summary.totalProducts)} detail="Unique items tracked" icon={Boxes} tone="blue" />
          <StatCard label="Units on hand" value={quantity(summary.totalUnits)} detail="Across all products" icon={ShoppingBasket} tone="orange" />
          <StatCard label="Purchase value" value={money(summary.purchaseValue)} detail="Quantity × purchase price" icon={CircleDollarSign} tone="green" />
          <StatCard label="Retail value" value={money(summary.retailValue)} detail="Quantity × selling price" icon={CircleDollarSign} tone="blue" />
          <StatCard label="Low stock" value={quantity(summary.lowStock)} detail="At or below minimum" icon={TriangleAlert} tone="red" />
        </section>

        <Card className="overflow-hidden border-0 bg-white shadow-[0_12px_34px_rgba(20,33,61,0.06)]">
          <CardHeader className="border-b border-slate-100 px-5 py-5 md:px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-lg font-semibold tracking-tight text-slate-950">Product inventory</CardTitle>
                <p className="mt-1 text-sm text-slate-500">Manual entry today, barcode-ready whenever you add a scanner.</p>
              </div>
              <div className="relative w-full md:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search name, category, barcode" className="h-10 rounded-xl border-slate-200 bg-slate-50 pl-9 pr-9 text-sm focus-visible:ring-orange-500" />
                {search ? <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700" aria-label="Clear search"><X className="h-4 w-4" /></button> : null}
              </div>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-100 bg-slate-50/70 hover:bg-slate-50/70">
                  <TableHead className="pl-6 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Product</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Quantity</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Purchase price</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Selling price</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Stock value</TableHead>
                  <TableHead className="text-right pr-6 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productsQuery.isLoading ? (
                  <TableRow><TableCell colSpan={6} className="h-32 text-center text-sm text-slate-500">Loading inventory…</TableCell></TableRow>
                ) : products.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="h-56 text-center"><div className="mx-auto flex max-w-sm flex-col items-center"><div className="mb-4 rounded-2xl bg-orange-50 p-4 text-orange-600"><Barcode className="h-7 w-7" /></div><p className="font-semibold text-slate-900">No products yet</p><p className="mt-1 text-sm text-slate-500">Add your first item to start calculating current inventory value.</p><Button onClick={openAdd} variant="outline" className="mt-4 rounded-xl border-slate-200">Add first product</Button></div></TableCell></TableRow>
                ) : products.map(product => {
                  const isLow = isLowStock(product.quantity, product.minStock);
                  const stockValue = calculateStockValue(product.quantity, product.purchasePrice);
                  const retailValue = calculateRetailValue(product.quantity, product.sellingPrice);
                  return (
                    <TableRow key={product.id} className="border-slate-100 hover:bg-orange-50/30">
                      <TableCell className="pl-6">
                        <div className="flex min-w-[210px] items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><ShoppingBasket className="h-4 w-4" /></div>
                          <div><p className="font-semibold text-slate-900">{product.name}</p><p className="mt-0.5 text-xs text-slate-500">{product.category} · {product.barcode || "No barcode"}</p></div>
                        </div>
                      </TableCell>
                      <TableCell><div className="flex items-center gap-2"><span className={`font-semibold ${isLow ? "text-rose-700" : "text-slate-800"}`}>{quantity(product.quantity)} {product.unit}</span>{isLow ? <Badge variant="outline" className="border-rose-200 bg-rose-50 text-[10px] text-rose-700">Low</Badge> : null}</div></TableCell>
                      <TableCell className="font-medium text-slate-700">{money(Number(product.purchasePrice))}</TableCell>
                      <TableCell className="font-medium text-slate-700">{money(Number(product.sellingPrice))}</TableCell>
                      <TableCell><div><p className="font-semibold text-slate-900">{money(stockValue)}</p><p className="text-xs text-slate-500">Retail {money(retailValue)}</p></div></TableCell>
                      <TableCell className="pr-6"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" onClick={() => openEdit(product)} className="h-9 w-9 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900" aria-label={`Edit ${product.name}`}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => removeProduct(product)} className="h-9 w-9 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-700" aria-label={`Delete ${product.name}`}><Trash2 className="h-4 w-4" /></Button></div></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-col gap-2 border-t border-slate-100 px-6 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>{products.length} {products.length === 1 ? "product" : "products"} shown</span><span>Values shown without a currency symbol; configure your store currency later.</span></div>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl sm:max-w-2xl">
          <DialogHeader><DialogTitle className="text-xl tracking-tight">{editingProduct ? "Edit product" : "Add product"}</DialogTitle><DialogDescription>Enter the item details below. All values update your inventory totals automatically.</DialogDescription></DialogHeader>
          <form onSubmit={submit} className="space-y-5 pt-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="product-name">Product name</Label><Input id="product-name" required autoFocus value={form.name} onChange={event => updateField("name", event.target.value)} placeholder="e.g. Whole milk 1L" /></div>
              <div className="space-y-2"><Label htmlFor="barcode">Barcode <span className="font-normal text-slate-400">(optional)</span></Label><Input id="barcode" value={form.barcode} onChange={event => updateField("barcode", event.target.value)} placeholder="Scan or type later" /></div>
              <div className="space-y-2"><Label htmlFor="category">Category</Label><Input id="category" required value={form.category} onChange={event => updateField("category", event.target.value)} placeholder="e.g. Dairy" /></div>
              <div className="space-y-2"><Label htmlFor="quantity">Quantity on hand</Label><Input id="quantity" required min="0" step="0.001" type="number" value={form.quantity} onChange={event => updateField("quantity", event.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="unit">Unit</Label><Input id="unit" required value={form.unit} onChange={event => updateField("unit", event.target.value)} placeholder="pcs, kg, box" /></div>
              <div className="space-y-2"><Label htmlFor="min-stock">Minimum stock alert</Label><Input id="min-stock" min="0" step="0.001" type="number" value={form.minStock} onChange={event => updateField("minStock", event.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="purchase-price">Purchase price per unit</Label><Input id="purchase-price" required min="0" step="0.01" type="number" value={form.purchasePrice} onChange={event => updateField("purchasePrice", event.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="selling-price">Selling price per unit</Label><Input id="selling-price" required min="0" step="0.01" type="number" value={form.sellingPrice} onChange={event => updateField("sellingPrice", event.target.value)} /></div>
            </div>
            <div className="rounded-xl border border-orange-100 bg-orange-50/70 px-4 py-3 text-sm text-orange-900"><span className="font-semibold">Stock value preview:</span> {money((Number(form.quantity) || 0) * (Number(form.purchasePrice) || 0))} purchase value · {money((Number(form.quantity) || 0) * (Number(form.sellingPrice) || 0))} retail value</div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="rounded-xl">Cancel</Button><Button type="submit" disabled={isSaving} className="rounded-xl bg-slate-950 text-white hover:bg-slate-800">{isSaving ? "Saving…" : editingProduct ? "Save changes" : "Add product"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
