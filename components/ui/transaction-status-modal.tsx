import { Dialog, DialogContent } from "./dialog";
import { useEffect, useState } from "react";
import { XCircle, CheckCircle2, Loader2 } from "lucide-react";

interface TransactionStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: 'pending' | 'success' | 'error' | 'cancelled';
  message?: string;
}

export function TransactionStatusModal({
  isOpen,
  onClose,
  status,
  message
}: TransactionStatusModalProps) {
  const [showModal, setShowModal] = useState(isOpen);

  useEffect(() => {
    setShowModal(isOpen);
    
    // Auto close after 3 seconds for success/error/cancelled
    if (isOpen && status !== 'pending') {
      const timer = setTimeout(() => {
        setShowModal(false);
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, status, onClose]);

  const statusConfig = {
    pending: {
      icon: <Loader2 className="h-12 w-12 animate-spin text-yellow-500" />,
      title: "Transaction Pending",
      color: "text-yellow-500"
    },
    success: {
      icon: <CheckCircle2 className="h-12 w-12 text-green-500" />,
      title: "Transaction Successful",
      color: "text-green-500"
    },
    error: {
      icon: <XCircle className="h-12 w-12 text-red-500" />,
      title: "Transaction Failed",
      color: "text-red-500"
    },
    cancelled: {
      icon: <XCircle className="h-12 w-12 text-red-500" />,
      title: "Transaction Cancelled",
      color: "text-red-500"
    }
  };

  const currentStatus = statusConfig[status];

  return (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col items-center justify-center space-y-4 p-6">
          {currentStatus.icon}
          <h3 className={`text-lg font-semibold ${currentStatus.color}`}>
            {currentStatus.title}
          </h3>
          {message && (
            <p className="text-center text-sm text-gray-500">
              {message}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 