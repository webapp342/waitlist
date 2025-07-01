import { cn } from "@/lib/utils";
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export type TransactionStatus = "pending" | "confirming" | "completed" | "failed";

interface TransactionStatusProps {
  status: TransactionStatus;
  message?: string;
  className?: string;
}

export function TransactionStatus({ status, message, className }: TransactionStatusProps) {
  const statusConfig = {
    pending: {
      icon: Loader2,
      text: message || "Transaction Pending",
      className: "text-yellow-500 bg-yellow-500/10"
    },
    confirming: {
      icon: AlertCircle,
      text: message || "Waiting for Confirmation",
      className: "text-blue-500 bg-blue-500/10"
    },
    completed: {
      icon: CheckCircle2,
      text: message || "Transaction Completed",
      className: "text-green-500 bg-green-500/10"
    },
    failed: {
      icon: XCircle,
      text: message || "Transaction Failed",
      className: "text-red-500 bg-red-500/10"
    }
  };

  const { icon: Icon, text, className: statusClassName } = statusConfig[status];

  return (
    <div className={cn(
      "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200",
      statusClassName,
      className
    )}>
      <Icon className={cn(
        "h-5 w-5",
        status === "pending" && "animate-spin"
      )} />
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
} 