import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ConfirmationModalProps {
  isOpen: boolean;
  toolName: string;
  args: any;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationModal({ isOpen, toolName, args, onConfirm, onCancel }: ConfirmationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Action Requires Confirmation</DialogTitle>
          <DialogDescription>
            The assistant wants to perform the following action: <strong>{toolName}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="bg-muted p-4 rounded-md text-sm font-mono overflow-auto max-h-[300px]">
          <pre>{JSON.stringify(args, null, 2)}</pre>
        </div>
        <DialogFooter className="sm:justify-end">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel Action
          </Button>
          <Button type="button" onClick={onConfirm}>
            Approve Action
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
