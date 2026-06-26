import { Button } from "@/components/ui/button";

type Option = {
  id: string;
  name?: string | null;
  posName?: string | null;
  quantity?: number;
  cost?: number;
  productId?: string | null;
  barcode?: string | null;
  status?: string | null;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      <span>{label}</span>
      {children}
    </label>
  );
}

function inputClass() {
  return "h-8 min-w-0 rounded-md border bg-background px-2 text-sm normal-case tracking-normal text-foreground";
}

function formClass(columns = "md:grid-cols-6") {
  return `grid gap-2 rounded-md border bg-background/80 p-2 ${columns}`;
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
    <form action={action} className={formClass()}>
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
        <Button type="submit" size="sm" className="h-8 w-full">Adjust Stock</Button>
      </div>
      <input name="notes" placeholder="Notes" className={`${inputClass()} md:col-span-6`} />
    </form>
  );
}

export function StockCountForm({
  products,
  terminals,
  stockLots,
  profiles,
  action,
}: {
  products: Option[];
  terminals: Option[];
  stockLots: Option[];
  profiles: Option[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action} className={formClass("md:grid-cols-8")}>
      <Field label="Product">
        <select name="productId" className={inputClass()}>
          <option value="">Use barcode or batch</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>{product.name} ({product.quantity ?? 0})</option>
          ))}
        </select>
      </Field>
      <Field label="Barcode / Scan">
        <input name="productBarcode" placeholder="Scan or type barcode" className={inputClass()} />
      </Field>
      <Field label="Batch">
        <select name="stockLotId" className={inputClass()}>
          <option value="">Product total</option>
          {stockLots.map((lot) => (
            <option key={lot.id} value={lot.id}>{lot.name}</option>
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
      <Field label="Assigned">
        <select name="assignedToId" className={inputClass()}>
          <option value="">Current user</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>{profile.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Counted Qty">
        <input name="countedQuantity" type="number" min="0" step="0.0001" placeholder="Optional" className={inputClass()} />
      </Field>
      <Field label="Notes">
        <input name="notes" placeholder="Count area or reason" className={inputClass()} />
      </Field>
      <div className="flex items-end">
        <Button type="submit" size="sm" className="h-8 w-full">Start Count</Button>
      </div>
    </form>
  );
}

export function StockDispositionForm({
  products,
  terminals,
  stockLots,
  action,
}: {
  products: Option[];
  terminals: Option[];
  stockLots: Option[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action} className={formClass("md:grid-cols-8")}>
      <Field label="Reason">
        <select name="reason" required className={inputClass()}>
          <option value="damaged">Damaged</option>
          <option value="lost">Lost</option>
          <option value="expired">Expired</option>
          <option value="disposed">Disposed</option>
        </select>
      </Field>
      <Field label="Product">
        <select name="productId" className={inputClass()}>
          <option value="">Use barcode or batch</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>{product.name} ({product.quantity ?? 0})</option>
          ))}
        </select>
      </Field>
      <Field label="Barcode / Scan">
        <input name="productBarcode" placeholder="Scan or type barcode" className={inputClass()} />
      </Field>
      <Field label="Batch">
        <select name="stockLotId" className={inputClass()}>
          <option value="">FEFO product stock</option>
          {stockLots.map((lot) => (
            <option key={lot.id} value={lot.id}>{lot.name}</option>
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
      <Field label="Qty">
        <input name="quantity" type="number" min="0.0001" step="0.0001" required className={inputClass()} />
      </Field>
      <Field label="Notes">
        <input name="notes" placeholder="Reason details" className={inputClass()} />
      </Field>
      <div className="flex items-end">
        <Button type="submit" size="sm" className="h-8 w-full">Record Loss</Button>
      </div>
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
    <form action={action} className={formClass()}>
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
        <Button type="submit" size="sm" className="h-8 w-full">Record Expense</Button>
      </div>
    </form>
  );
}

export function NonSalesIncomeForm({
  terminals,
  action,
}: {
  terminals: Option[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={action} className={formClass()}>
      <Field label="Source">
        <input name="source" required placeholder="Service fee, rebate, other" className={inputClass()} />
      </Field>
      <Field label="Terminal">
        <select name="terminalId" className={inputClass()}>
          <option value="">Company income</option>
          {terminals.map((terminal) => (
            <option key={terminal.id} value={terminal.id}>{terminal.posName ?? "Unnamed terminal"}</option>
          ))}
        </select>
      </Field>
      <Field label="Date">
        <input name="incomeDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={inputClass()} />
      </Field>
      <Field label="Amount">
        <input name="amount" type="number" min="0.01" step="0.01" required className={inputClass()} />
      </Field>
      <Field label="Reference">
        <input name="externalReference" placeholder="OR/ref no." className={inputClass()} />
      </Field>
      <div className="flex items-end">
        <Button type="submit" size="sm" className="h-8 w-full">Record Income</Button>
      </div>
      <input name="notes" placeholder="Notes" className={`${inputClass()} md:col-span-6`} />
    </form>
  );
}

export function SupplierForm({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  return (
    <form action={action} className={formClass()}>
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
        <Button type="submit" size="sm" className="h-8 w-full">Save Supplier</Button>
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
    <form action={action} className={formClass()}>
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
        <Button type="submit" size="sm" className="h-8 w-full">Create PO</Button>
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
    <form action={action} className={formClass()}>
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
        <Button type="submit" size="sm" className="h-8 w-full">Request Transfer</Button>
      </div>
    </form>
  );
}

export function PromotionForm({ action }: { action: (formData: FormData) => void | Promise<void> }) {
  return (
    <form action={action} className={formClass()}>
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
        <Button type="submit" size="sm" className="h-8 w-full">Create Promo</Button>
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
