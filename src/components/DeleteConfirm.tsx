import { useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  /** The button/element that opens the dialog. */
  trigger: ReactNode
  title: string
  description: string
  /** The word the user must type to enable confirmation. Default: "delete". */
  confirmWord?: string
  /** Async action to run when confirmed. Dialog closes after it resolves without error. */
  onConfirm: () => Promise<string | null>
}

/**
 * Generic type-to-confirm dialog. Wraps around any destructive action. The
 * confirm button only activates once the user has typed the exact confirm
 * word (case-insensitive), because a one-click "are you sure?" dialog is
 * basically just a pause — and this app's lessons are irreplaceable once
 * deleted.
 */
export function DeleteConfirm({
  trigger,
  title,
  description,
  confirmWord = 'delete',
  onConfirm,
}: Props) {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [pending, setPending] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function reset() {
    setTyped('')
    setPending(false)
    setErrorMsg(null)
  }

  const canConfirm =
    !pending && typed.trim().toLowerCase() === confirmWord.toLowerCase()

  async function handleConfirm() {
    if (!canConfirm) return
    setPending(true)
    setErrorMsg(null)
    const err = await onConfirm()
    if (err) {
      setErrorMsg(err)
      setPending(false)
      return
    }
    reset()
    setOpen(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        setOpen(next)
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="confirm-phrase">
            Type <code className="rounded bg-muted px-1">{confirmWord}</code> to confirm
          </Label>
          <Input
            id="confirm-phrase"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            disabled={pending}
            autoComplete="off"
            autoFocus
          />
          {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              reset()
              setOpen(false)
            }}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            {pending ? 'Deleting…' : 'Delete permanently'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
