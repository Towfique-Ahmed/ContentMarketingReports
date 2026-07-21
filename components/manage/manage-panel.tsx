import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddRowForm, ImportForm, SettingsForm, SyncButton, type FieldDescriptor } from "./forms";
import { deleteRowAction } from "@/lib/actions";
import { MANAGE_CONFIG } from "@/lib/manage-config";
import { DATASETS, type Field } from "@/lib/datasets/config";
import { lookupOptions, recentRows } from "@/lib/datasets/import";
import { getSetting } from "@/lib/settings";
import { SYNC_LABELS } from "@/lib/sync/runner";

function descriptor(name: string, f: Field): FieldDescriptor {
  const base = { name, label: f.label ?? name.replace(/_/g, " "), required: f.required };
  if (f.type === "lookup") return { ...base, kind: "lookup", lookup: lookupOptions(f) };
  if (f.type === "select") return { ...base, kind: "select", options: f.options };
  if (f.type === "date") return { ...base, kind: "date" };
  if (f.type === "int") return { ...base, kind: "number", step: "1" };
  if (f.type === "float") return { ...base, kind: "number", step: "0.01" };
  return { ...base, kind: "text" };
}

export function ManagePanel({ pageKey }: { pageKey: string }) {
  const cfg = MANAGE_CONFIG[pageKey];
  if (!cfg) return null;

  const values: Record<string, string> = {};
  for (const f of cfg.settings) values[f.name] = getSetting(f.name) ?? "";

  return (
    <details className="mt-8 rounded-xl border border-border bg-card">
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground">
        ⚙︎ Manage {cfg.label} data &amp; settings
      </summary>
      <div className="space-y-4 border-t border-border p-4">
        {(cfg.sync.length > 0 || cfg.settings.length > 0) && (
          <Card>
            <CardHeader><CardTitle>Settings &amp; sync</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {cfg.sync.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {cfg.sync.map((s) => (
                    <SyncButton key={s} source={s} label={SYNC_LABELS[s] ?? s} last={getSetting(`last_sync_${s}`) ?? undefined} />
                  ))}
                </div>
              )}
              {cfg.settings.length > 0 && <SettingsForm fields={cfg.settings} values={values} />}
            </CardContent>
          </Card>
        )}

        {cfg.datasets.map((key) => {
          const set = DATASETS[key];
          if (!set) return null;
          const isMatrix = Boolean(set.matrix);
          const fields = set.fields
            ? Object.entries(set.fields)
                .filter(([, f]) => !f.totalsOnly)
                .map(([n, f]) => descriptor(n, f))
            : [];
          const recent = isMatrix ? [] : recentRows(key, 8);
          const variant = key === "content_items" ? "content" : set.matrix === "channels" ? "channels" : undefined;

          return (
            <Card key={key}>
              <CardHeader><CardTitle>{set.label}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {set.help && <p className="text-xs text-muted-foreground">{set.help}</p>}
                <div className="grid gap-6 md:grid-cols-2">
                  {!isMatrix && (
                    <div>
                      <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Add / update</h3>
                      <AddRowForm setKey={key} fields={fields} />
                    </div>
                  )}
                  <div className={isMatrix ? "md:col-span-2" : ""}>
                    <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Import CSV</h3>
                    <ImportForm setKey={key} variant={variant} />
                  </div>
                </div>

                {recent.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Latest entries</h3>
                    <div className="overflow-x-auto rounded-md border border-border">
                      <table className="w-full text-xs">
                        <tbody>
                          {recent.map((row) => (
                            <tr key={String(row._rowid)} className="border-b border-border/60 last:border-0">
                              {Object.entries(row)
                                .filter(([k]) => k !== "_rowid")
                                .slice(0, 6)
                                .map(([k, v]) => (
                                  <td key={k} className="max-w-[16rem] truncate px-2 py-1.5">
                                    {String(v ?? "")}
                                  </td>
                                ))}
                              <td className="px-2 py-1.5 text-right">
                                <form action={deleteRowAction}>
                                  <input type="hidden" name="__set" value={key} />
                                  <input type="hidden" name="__rowid" value={String(row._rowid)} />
                                  <button type="submit" className="text-danger hover:underline" aria-label="Delete row">
                                    Delete
                                  </button>
                                </form>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </details>
  );
}
