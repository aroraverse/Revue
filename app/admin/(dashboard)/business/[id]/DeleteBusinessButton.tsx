"use client";

import { deleteBusiness } from "../../business-actions";

export default function DeleteBusinessButton({
  businessId,
}: {
  businessId: string;
}) {
  return (
    <form
      action={deleteBusiness}
      onSubmit={(e) => {
        if (
          !window.confirm(
            "Delete this business? Its cards stay intact and it can be restored later."
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={businessId} />
      <button className="rounded-lg border border-red-300 px-5 py-2.5 font-semibold text-red-600 hover:bg-red-50">
        Delete business
      </button>
    </form>
  );
}
