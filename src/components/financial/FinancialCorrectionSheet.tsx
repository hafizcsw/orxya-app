import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FinancialEvent } from '@/types/financial';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FinancialCorrectionSheetProps {
  event: FinancialEvent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (corrected: { amount: number; direction: 1 | -1; merchant?: string; currency: string }) => void;
}

export function FinancialCorrectionSheet({ 
  event, 
  open, 
  onOpenChange, 
  onSave 
}: FinancialCorrectionSheetProps) {
  const [amount, setAmount] = useState(event.amount.toString());
  const [direction, setDirection] = useState<1 | -1>(event.direction);
  const [merchant, setMerchant] = useState(event.merchant || '');
  const [currency, setCurrency] = useState(event.currency);

  const handleSave = () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;
    
    onSave({
      amount: parsedAmount,
      direction,
      merchant: merchant.trim() || undefined,
      currency
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh]">
        <SheetHeader>
          <SheetTitle>Correct Transaction</SheetTitle>
        </SheetHeader>
        
        <div className="space-y-6 pt-6">
          <div className="space-y-2">
            <Label>Type</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={direction === -1 ? "default" : "outline"}
                className={cn(
                  "justify-start gap-2",
                  direction === -1 && "bg-destructive hover:bg-destructive/90"
                )}
                onClick={() => setDirection(-1)}
              >
                <TrendingDown className="w-4 h-4" />
                Expense
              </Button>
              <Button
                type="button"
                variant={direction === 1 ? "default" : "outline"}
                className={cn(
                  "justify-start gap-2",
                  direction === 1 && "bg-success hover:bg-success/90"
                )}
                onClick={() => setDirection(1)}
              >
                <TrendingUp className="w-4 h-4" />
                Income
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="flex gap-2">
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1"
              />
              <Input
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                className="w-20"
                maxLength={3}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="merchant">Merchant (Optional)</Label>
            <Input
              id="merchant"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="e.g., Starbucks"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1"
            >
              Save
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
