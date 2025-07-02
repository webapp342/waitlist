import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { CreditCard, Wallet, ShieldCheck, Settings, Bell } from "lucide-react";

interface CardPrioritiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardType: 'bronze' | 'silver' | 'black';
}

export default function CardPrioritiesModal({ isOpen, onClose, cardType }: CardPrioritiesModalProps) {
  const getCardColor = () => {
    switch (cardType) {
      case 'bronze':
        return 'text-amber-600';
      case 'silver':
        return 'text-gray-400';
      case 'black':
        return 'text-gray-900';
      default:
        return 'text-amber-600';
    }
  };

  const features = [
    {
      icon: <Wallet className="w-5 h-5" />,
      title: "Spending Priorities",
      description: "Set preferred spending categories"
    },
    {
      icon: <ShieldCheck className="w-5 h-5" />,
      title: "Security Settings",
      description: "Configure limits and restrictions"
    },
    {
      icon: <Bell className="w-5 h-5" />,
      title: "Notifications",
      description: "Set up transaction alerts"
    },
    {
      icon: <Settings className="w-5 h-5" />,
      title: "Card Management",
      description: "Manage card settings"
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-black/95 border border-gray-800">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className={`w-5 h-5 ${getCardColor()}`} />
            <span>Card Settings</span>
          </DialogTitle>
          <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <span className="text-yellow-500 text-lg">⚡</span>
            <p className="text-sm text-yellow-500/90">
              Beta Feature - Coming Soon
            </p>
          </div>
        </DialogHeader>

        <div className="grid gap-3 mt-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition-colors"
            >
              <div className={`p-2 rounded-full bg-gray-800 ${getCardColor()}`}>
                {feature.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-200 text-sm">{feature.title}</h3>
                <p className="text-xs text-gray-400">{feature.description}</p>
              </div>
              <button 
                disabled
                className="shrink-0 px-3 py-1.5 text-xs font-medium text-gray-400 bg-gray-800/50 rounded-full cursor-not-allowed"
              >
                Coming Soon
              </button>
            </motion.div>
          ))}
        </div>

        <div className="mt-4 p-3 text-xs text-center text-gray-400">
          These settings will be available once the card payment system exits beta phase. We&apos;ll notify you when you can start customizing your experience.
        </div>
      </DialogContent>
    </Dialog>
  );
} 