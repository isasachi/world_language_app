import { Check, X, Clock, LucideIcon } from "lucide-react";
import { ComponentProps } from "react";

type StatusConfig = {
  icon: LucideIcon;
  color: string;
  label: string;
};

const statusConfig: Record<string, StatusConfig> = {
  present: { icon: Check, color: "text-green-500", label: "Present" },
  absent: { icon: X, color: "text-red-500", label: "Absent" },
  tardy: { icon: Clock, color: "text-yellow-500", label: "Tardy" },
};

interface AttendanceStatusProps extends ComponentProps<"button"> {
  status: string;
  onClick?: () => void;
  selected?: boolean;
}

const AttendanceStatus = ({ status, onClick, selected, ...props }: AttendanceStatusProps) => {
  const config = statusConfig[status];
  if (!config) return null;

  const Icon = config.icon;
  
  return (
    <button
      onClick={onClick}
      className={`p-2 cursor-pointer rounded-full transition-all ${
        selected 
          ? `bg-${config.color.split('-')[1]}-100 ${config.color}` 
          : "text-gray-400 hover:bg-gray-100"
      }`}
      title={config.label}
      {...props}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
};

export default AttendanceStatus;