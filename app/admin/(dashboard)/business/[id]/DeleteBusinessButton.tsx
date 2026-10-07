"use client";

import { useState } from "react";
import { deleteBusiness } from "../../business-actions";

export default function DeleteBusinessButton({
  businessId,
  businessName,
  cardCount,
}: {
  businessId: string;
  businessName: string;
  cardCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");

  const confirmed = typed.trim() === businessName.trim();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-red-300 px-5 py-2.5 font-semibold text-red-600 transition hover:bg-red-50"
      >
        Delete business
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/60 p-4">
      <p className="font-semibold text-red-700">Delete “{businessName}”?</p>
      <p className="mt-1 text-sm text-slate-600">
        This hides the business and releases{" "}
        <strong>
          {cardCount} card{cardCount === 1 ? "" : "s"}
        </strong>{" "}
        back to the unassigned pool. This can be undone by an admin, but please
        confirm.
      </p>

      <label className="mt-3 block text-sm font-medium text-slate-700">
        Type the business name to confirm
      </label>
      <input
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        placeholder={businessName}
        className="field mt-1"
        autoFocus
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <form
          action={deleteBusiness}
          onSubmit={(e) => {
            if (!confirmed) {
              e.preventDefault();
              return;
            }
            if (
              !window.confirm(
                `Final check: permanently detach ${cardCount} card(s) and delete “${businessName}”?`
              )
            ) {
              e.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={businessId} />
          <button
            type="submit"
            disabled={!confirmed}
            className="rounded-lg bg-red-600 px-5 py-2.5 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Delete permanently
          </button>
        </form>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setTyped("");
          }}
          className="btn-ghost"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
