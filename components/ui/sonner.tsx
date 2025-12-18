"use client";

import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border/50 group-[.toaster]:shadow-lg",
          description:
            "group-[.toast]:text-muted-foreground group-[.toast]:opacity-90",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:hover:bg-primary/90",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:hover:bg-muted/80",
          success:
            "group-[.toaster]:bg-green-950/95 group-[.toaster]:text-green-50 group-[.toaster]:border-green-800/50 group-[.toaster]:shadow-lg",
          error:
            "group-[.toaster]:bg-red-950/95 group-[.toaster]:text-red-50 group-[.toaster]:border-red-800/50 group-[.toaster]:shadow-lg",
          warning:
            "group-[.toaster]:bg-yellow-950/95 group-[.toaster]:text-yellow-50 group-[.toaster]:border-yellow-800/50 group-[.toaster]:shadow-lg",
          info: "group-[.toaster]:bg-blue-950/95 group-[.toaster]:text-blue-50 group-[.toaster]:border-blue-800/50 group-[.toaster]:shadow-lg",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
