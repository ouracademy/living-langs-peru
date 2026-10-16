"use client";

import { useState } from "react";
import {
  SupportRequestForm,
  useSupportRequestForm,
} from "@/components/support-request-form";
import { Button } from "@/components/ui/button";
import { Snackbar } from "@/components/ui/snackbar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SENT_NOTICE } from "@/lib/requests/form";
import type { RequestRole } from "@/lib/requests/schema";

type SupportRequestDialogProps = {
  /** The role this card stands for; the form opens preselected on it. */
  role: RequestRole;
  triggerLabel: string;
  title: string;
  description: string;
};

export function SupportRequestDialog({
  role,
  triggerLabel,
  title,
  description,
}: SupportRequestDialogProps) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const form = useSupportRequestForm(role);

  return (
    <div className="flex flex-col gap-3">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button className="w-fit cursor-pointer rounded-full px-5 py-2.5" />
          }
        >
          {triggerLabel}
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle
              style={{ fontFamily: "'Baloo 2', sans-serif" }}
              className="text-lg font-bold"
            >
              {title}
            </DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <SupportRequestForm
            form={form}
            onSuccess={() => {
              setOpen(false);
              setSent(true);
            }}
          />
        </DialogContent>
      </Dialog>
      {/* Outside the dialog: it closes on success, and the notice must outlive it. */}
      <Snackbar open={sent} onClose={() => setSent(false)}>
        {SENT_NOTICE}
      </Snackbar>
    </div>
  );
}
