import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: "primary" | "warning" | "success" | "accent";
}

export default function StatsCard({ title, value, icon: Icon, color }: StatsCardProps) {
  const getColorClasses = () => {
    switch (color) {
      case "primary":
        return "bg-primary/10 text-primary";
      case "warning":
        return "bg-amber-500/10 text-amber-500";
      case "success":
        return "bg-green-500/10 text-green-500";
      case "accent":
        return "bg-amber-400/10 text-amber-400";
      default:
        return "bg-primary/10 text-primary";
    }
  };
  
  return (
    <Card>
      <CardContent className="p-0">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center">
            <div className={`flex-shrink-0 rounded-md p-3 ${getColorClasses()}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-neutral-500 truncate">
                  {title}
                </dt>
                <dd>
                  <div className="text-lg font-semibold text-neutral-900">
                    {value}
                  </div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
