"use client";

import { useEffect, useState } from "react";
import {
  SupportRequestForm,
  useSupportRequestForm,
} from "@/components/support-request-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { RequestRole } from "@/lib/requests/schema";

const NOTICE_MS = 8000;

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
  const [notice, setNotice] = useState<string | null>(null);
  const form = useSupportRequestForm(role);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

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
            onSuccess={(message) => {
              setOpen(false);
              setNotice(message);
            }}
          />
        </DialogContent>
      </Dialog>
      {/* Outside the dialog: it closes on success, and the thanks must outlive it. */}
      <p role="status" className="text-sm font-bold text-[#1B6E4A]">
        {notice}
      </p>
    </div>
  );
}
