import React from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Funnel, Zap, Eye, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ModelFilter = "fast" | "vision" | "search";

const FILTERS: { key: ModelFilter; label: string; icon: React.ReactNode }[] = [
  {
    key: "fast",
    label: "Fast",
    icon: <Zap className="h-4 w-4 text-yellow-400" />,
  },
  {
    key: "vision",
    label: "Vision",
    icon: <Eye className="h-4 w-4 text-green-500" />,
  },
  {
    key: "search",
    label: "Search",
    icon: <Globe className="h-4 w-4 text-blue-500" />,
  },
];

interface ModelSelectorFilterProps {
  selectedFilters: ModelFilter[];
  onChange: (filters: ModelFilter[]) => void;
  className?: string;
}

export const ModelSelectorFilter: React.FC<ModelSelectorFilterProps> = ({
  selectedFilters,
  onChange,
  className,
}) => {
  const handleToggle = (filter: ModelFilter) => {
    if (selectedFilters.includes(filter)) {
      onChange(selectedFilters.filter((f) => f !== filter));
    } else {
      onChange([...selectedFilters, filter]);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className={className}>
          <Funnel className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Filter Models</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {FILTERS.map((filter) => (
          <DropdownMenuItem
            key={filter.key}
            className="flex items-center gap-2 group"
            onClick={() => handleToggle(filter.key)}
          >
            {filter.icon}
            <span>{filter.label}</span>
            <div className="ml-auto">
              <DropdownMenuCheckboxItem
                checked={selectedFilters.includes(filter.key)}
                onCheckedChange={() => handleToggle(filter.key)}
                onClick={e => e.stopPropagation()}
                className="flex justify-end items-center gap-2"
              ></DropdownMenuCheckboxItem>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
