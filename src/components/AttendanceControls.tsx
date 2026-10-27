"use client";

import { useActionState, useState } from "react";
import { importHejaAttendance, runHejaSync, type ImportState, type SyncState } from "@/app/admin/actions";

export function StatusSelect({ memberId, name, initial }: { memberId: number; name: string; initial: string }) {
  const [value, setValue] = useState(initial);
  return (
    <select
      className="seg-select"
      name={`status_${memberId}`}
      data-status=""
      data-v={value}
      value={value}
      aria-label={`Attendance for ${name}`}
      onChange={(e) => setValue(e.target.value)}
    >
      <option value="">—</option>
      <option value="present">Present</option>
      <option value="late">Late</option>
      <option value="excused">Excused</option>
      <option value="absent">Absent</option>
    </select>
  );
}

/** Sets every blank status in the surrounding form. */
export function FillBlanks({ status, children }: { status: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="btn btn-sm btn-ghost"
      onClick={(e) => {
        const form = e.currentTarget.closest("form");
        form?.querySelectorAll<HTMLSelectElement>("select[data-status]").forEach((sel) => {
          if (!sel.value) {
            const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
            setter?.call(sel, status);
            sel.dispatchEvent(new Event("change", { bubbles: true }));
          }
        });
      }}
    >
      {children}
    </button>
  );
}

export function HejaPasteForm({ sessionId }: { sessionId: number }) {
  const [state, action, pending] = useActionState<ImportState, FormData>(importHejaAttendance, null);
  return (
    <form action={action} className="aform">
      <input type="hidden" name="session_id" value={sessionId} />
      <label className="f">
        <span>Paste the attended / &ldquo;Going&rdquo; list from Heja</span>
        <textarea name="pasted" placeholder={"Alex Smith\nJamie Lee\n…"} style={{ minHeight: 130 }} />
        <small>One name per line. Copy from the activity&apos;s attendance list in Heja (app or web.heja.io).</small>
      </label>
      <label className="check">
        <input type="checkbox" name="others_absent" /> Mark everyone else on this team absent
      </label>
      <button className="btn btn-sm btn-dark" type="submit" disabled={pending} style={{ justifySelf: "start" }}>
        {pending ? "Importing…" : "Import from Heja"}
      </button>
      {state && !state.ok && <div className="notice notice-err">{state.error}</div>}
      {state?.ok && (
        <div className="callout report" role="status">
          <strong>
            Marked {state.report.matched.length} present
            {state.report.markedAbsent ? `, others absent where not already marked` : ""}.
          </strong>
          {state.report.unmatched.length > 0 && (
            <div>
              Not matched (add them as members, or set their &ldquo;Name in Heja&rdquo;):
              <ul>
                {state.report.unmatched.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          )}
          {state.report.ambiguous.length > 0 && (
            <div>
              More than one possible match — mark these by hand:
              <ul>
                {state.report.ambiguous.map((a) => (
                  <li key={a.input}>
                    {a.input} ({a.candidates.map((c) => c.name).join(" / ")})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </form>
  );
}

export function HejaSyncButton() {
  const [state, action, pending] = useActionState<SyncState>(runHejaSync, null);
  return (
    <form action={action} className="aform">
      <button className="btn btn-sm btn-dark" type="submit" disabled={pending} style={{ justifySelf: "start" }}>
        {pending ? "Syncing…" : "Sync Heja schedule now"}
      </button>
      {state && !state.ok && <div className="notice notice-err">{state.error}</div>}
      {state?.ok && (
        <div className="callout" role="status">
          Synced {state.report.total} events: {state.report.added} new, {state.report.updated} updated
          {state.report.games ? `, ${state.report.games} new games` : ""}
          {state.report.cancelled ? `, ${state.report.cancelled} cancelled removed` : ""}.
        </div>
      )}
    </form>
  );
}
