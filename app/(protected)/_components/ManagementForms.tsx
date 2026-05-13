import { Button } from "@/components/ui/button";

type Option = { id: string; name?: string | null; posName?: string | null; quantity?: number; cost?: number };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
      <span>{label}</span>
      {children}
    </label>
  );
}

function inputClass() {
  return "h-9 rounded-md border bg-background px-3 text-sm text-foreground";
}

export function StockAdjustmentForm({
  products,
  terminals,
  action,
}: {
  products: Option[];
  terminals: Option[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action} className="grid gap-2 rounded-md border bg-background p-3 md:grid-cols-6">
      <Field label="Product">
        <select name="productId" required className={inputClass()}>
          {products.map((product) => (
            <option key={product.id} value={product.id}>{product.name} ({product.quantity ?? 0})</option>
          ))}
        </select>
      </Field>
      <Field label="Terminal">
        <select name="terminalId" className={inputClass()}>
          <option value="">Company stock</option>
          {terminals.map((terminal) => (
            <option key={terminal.id} value={terminal.id}>{terminal.posName ?? "Unnamed terminal"}</option>
          ))}
        </select>
      </Field>
      <Field label="Type">
        <select name="direction" required className={inputClass()}>
          <option value="increase">Increase</option>
          <option value="decrease">Decrease</option>
        </select>
      </Field>
      <Field label="Qty">
        <input name="quantity" type="number" min="0.0001" step="0.0001" required className={inputClass()} />
      </Field>
      <Field label="Reason">
        <input name="reason" required placeholder="Count correction" className={inputClass()} />
      </Field>
      <div className="flex items-end">
        <Button type="submit" className="w-full">Adjust Stock</Button>
      </div>
      <input name="notes" placeholder="Notes" className={`${inputClass()} md:col-span-6`} />
    </form>
  );
}

export function ExpenseForm({
  categories,
  terminals,
  action,
}: {
  categories: Option[];
  terminals: Option[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action} className="grid gap-2 rounded-md border bg-background p-3 md:grid-cols-6">
      <Field label="Category">
        <select name="categoryId" required className={inputClass()}>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>{category.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Terminal">
        <select name="terminalId" className={inputClass()}>
          <option value="">Company expense</option>
          {terminals.map((terminal) => (
            <option key={terminal.id} value={terminal.id}>{terminal.posName ?? "Unnamed terminal"}</option>
          ))}
        </select>
      </Field>
      <Field label="Date">
        <input name="expenseDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={inputClass()} />
      </Field>
      <Field label="Amount">
        <input name="amount" type="number" min="0.01" step="0.01" required className={inputClass()} />
      </Field>
      <Field label="Notes">
        <input name="notes" placeholder="Receipt or purpose" className={inputClass()} />
      </Field>
      <div className="flex items-end">
        <Button type="submit" className="w-full">Record Expense</Button>
      </div>
    </form>
  );
}

export function SupplierForm({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  return (
    <form action={action} className="grid gap-2 rounded-md border bg-background p-3 md:grid-cols-6">
      <Field label="Supplier">
        <input name="name" required placeholder="Supplier name" className={inputClass()} />
      </Field>
      <Field label="Contact">
        <input name="contactName" placeholder="Contact person" className={inputClass()} />
      </Field>
      <Field label="Phone">
        <input name="phone" placeholder="Mobile or phone" className={inputClass()} />
      </Field>
      <Field label="Email">
        <input name="email" type="email" placeholder="email@example.com" className={inputClass()} />
      </Field>
      <Field label="Notes">
        <input name="notes" placeholder="Terms or remarks" className={inputClass()} />
      </Field>
      <div className="flex items-end">
        <Button type="submit" className="w-full">Save Supplier</Button>
      </div>
    </form>
  );
}

export function PurchaseOrderForm({
  suppliers,
  products,
  action,
}: {
  suppliers: Option[];
  products: Option[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action} className="grid gap-2 rounded-md border bg-background p-3 md:grid-cols-6">
      <Field label="Supplier">
        <select name="supplierId" required className={inputClass()}>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Product">
        <select name="productId" required className={inputClass()}>
          {products.map((product) => (
            <option key={product.id} value={product.id}>{product.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Qty">
        <input name="quantity" type="number" min="0.0001" step="0.0001" required className={inputClass()} />
      </Field>
      <Field label="Unit Cost">
        <input name="unitCost" type="number" min="0" step="0.01" required className={inputClass()} />
      </Field>
      <Field label="Expected">
        <input name="expectedAt" type="date" className={inputClass()} />
      </Field>
      <div className="flex items-end">
        <Button type="submit" className="w-full">Create PO</Button>
      </div>
      <input name="notes" placeholder="Notes" className={`${inputClass()} md:col-span-6`} />
    </form>
  );
}

export function TransferForm({
  products,
  terminals,
  action,
}: {
  products: Option[];
  terminals: Option[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action} className="grid gap-2 rounded-md border bg-background p-3 md:grid-cols-6">
      <Field label="From">
        <select name="sourceTerminalId" required className={inputClass()}>
          {terminals.map((terminal) => (
            <option key={terminal.id} value={terminal.id}>{terminal.posName ?? "Unnamed terminal"}</option>
          ))}
        </select>
      </Field>
      <Field label="To">
        <select name="destinationTerminalId" required className={inputClass()}>
          {terminals.map((terminal) => (
            <option key={terminal.id} value={terminal.id}>{terminal.posName ?? "Unnamed terminal"}</option>
          ))}
        </select>
      </Field>
      <Field label="Product">
        <select name="productId" required className={inputClass()}>
          {products.map((product) => (
            <option key={product.id} value={product.id}>{product.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Qty">
        <input name="requestedQuantity" type="number" min="0.0001" step="0.0001" required className={inputClass()} />
      </Field>
      <Field label="Notes">
        <input name="notes" placeholder="Transfer reason" className={inputClass()} />
      </Field>
      <div className="flex items-end">
        <Button type="submit" className="w-full">Request Transfer</Button>
      </div>
    </form>
  );
}

export function PromotionForm({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  return (
    <form action={action} className="grid gap-2 rounded-md border bg-background p-3 md:grid-cols-6">
      <Field label="Name">
        <input name="name" required placeholder="Happy hour" className={inputClass()} />
      </Field>
      <Field label="Type">
        <select name="promotionType" required className={inputClass()}>
          <option value="fixed_amount">Fixed amount</option>
          <option value="percentage">Percentage</option>
          <option value="item_level">Item level</option>
          <option value="order_level">Order level</option>
          <option value="buy_x_get_y">Buy X get Y</option>
          <option value="bundle_price">Bundle price</option>
          <option value="quantity_threshold">Quantity threshold</option>
        </select>
      </Field>
      <Field label="Value">
        <input name="value" type="number" min="0" step="0.01" required className={inputClass()} />
      </Field>
      <Field label="Starts">
        <input name="startsAt" type="datetime-local" className={inputClass()} />
      </Field>
      <Field label="Ends">
        <input name="endsAt" type="datetime-local" className={inputClass()} />
      </Field>
      <div className="flex items-end">
        <Button type="submit" className="w-full">Create Promo</Button>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input name="stackable" type="checkbox" value="true" />
        Stackable
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input name="exclusive" type="checkbox" value="true" />
        Exclusive
      </label>
      <input name="notes" placeholder="Rules or manager notes" className={`${inputClass()} md:col-span-4`} />
    </form>
  );
}
