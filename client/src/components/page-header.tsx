import { cn } from "@/lib/utils";

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  heading: string;
  text?: string;
  className?: string;
  buttonSlot?: React.ReactNode;
}

export function PageHeader({
  heading,
  text,
  className,
  buttonSlot,
  ...props
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)} {...props}>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{heading}</h1>
        {buttonSlot}
      </div>
      {text && <p className="text-lg text-muted-foreground">{text}</p>}
    </div>
  );
}