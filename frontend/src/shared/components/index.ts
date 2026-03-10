// Re-export new shadcn/ui-based components
export {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
  Input,
  Badge,
  EmptyState,
} from "@/shared/ui";
export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/shared/ui";

// Layout
export { TabLayout } from "./TabLayout";

// Legacy re-exports (kept for backward compatibility — prefer importing from @/shared/ui)
export { Modal } from "./Modal";
