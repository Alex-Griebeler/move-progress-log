import { useState } from "react";
import { Search, X, FolderOpen, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PrescriptionFolder } from "@/hooks/useFolders";
import { Badge } from "@/components/ui/badge";

interface PrescriptionSearchBarProps {
  onSearchChange: (searchText: string) => void;
  onFolderFilter: (folderId: string | null | undefined) => void;
  onDayFilter: (day: string | undefined) => void;
  folders: PrescriptionFolder[];
  activeFilters: {
    searchText?: string;
    folderId?: string | null;
    dayOfWeek?: string;
  };
}

const DAYS_OF_WEEK = [
  { value: "segunda", label: "Segunda-feira" },
  { value: "terça", label: "Terça-feira" },
  { value: "quarta", label: "Quarta-feira" },
  { value: "quinta", label: "Quinta-feira" },
  { value: "sexta", label: "Sexta-feira" },
  { value: "sábado", label: "Sábado" },
  { value: "domingo", label: "Domingo" },
];

// Flatten folder tree for selection
const flattenFolders = (folders: PrescriptionFolder[], level = 0): Array<{ id: string; name: string; level: number }> => {
  return folders.reduce((acc, folder) => {
    acc.push({ id: folder.id, name: folder.name, level });
    if (folder.children && folder.children.length > 0) {
      acc.push(...flattenFolders(folder.children, level + 1));
    }
    return acc;
  }, [] as Array<{ id: string; name: string; level: number }>);
};

export function PrescriptionSearchBar({
  onSearchChange,
  onFolderFilter,
  onDayFilter,
  folders,
  activeFilters,
}: PrescriptionSearchBarProps) {
  const [searchText, setSearchText] = useState(activeFilters.searchText || "");
  
  const flatFolders = flattenFolders(folders);
  const hasActiveFilters = !!(activeFilters.searchText || activeFilters.folderId !== undefined || activeFilters.dayOfWeek);

  const handleSearchChange = (value: string) => {
    setSearchText(value);
    onSearchChange(value);
  };

  const clearAllFilters = () => {
    setSearchText("");
    onSearchChange("");
    onFolderFilter(undefined);
    onDayFilter(undefined);
  };

  return (
    <div className="space-y-3">
      {/* Main search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar prescrições por nome ou objetivo..."
          value={searchText}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10 pr-10"
          aria-label="Buscar prescrições"
        />
        {searchText && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
            onClick={() => handleSearchChange("")}
            aria-label="Limpar busca"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Folder filter */}
        <Select
          value={activeFilters.folderId === null ? "no-folder" : activeFilters.folderId || "all"}
          onValueChange={(value) => {
            if (value === "all") {
              onFolderFilter(undefined);
            } else if (value === "no-folder") {
              onFolderFilter(null);
            } else {
              onFolderFilter(value);
            }
          }}
        >
          <SelectTrigger className="w-[200px] h-9">
            <FolderOpen className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Todas as pastas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as pastas</SelectItem>
            <SelectItem value="no-folder">Sem pasta</SelectItem>
            {flatFolders.map((folder) => (
              <SelectItem key={folder.id} value={folder.id}>
                <span style={{ paddingLeft: `${folder.level * 12}px` }}>
                  {folder.level > 0 && "└ "}
                  {folder.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Day of week filter */}
        <Select
          value={activeFilters.dayOfWeek || "all"}
          onValueChange={(value) => onDayFilter(value === "all" ? undefined : value)}
        >
          <SelectTrigger className="w-[180px] h-9">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Dia da semana" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os dias</SelectItem>
            {DAYS_OF_WEEK.map((day) => (
              <SelectItem key={day.value} value={day.value}>
                {day.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear all filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="h-9"
          >
            <X className="h-4 w-4 mr-2" />
            Limpar filtros
          </Button>
        )}

        {/* Active filters badges */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 ml-2">
            {activeFilters.searchText && (
              <Badge variant="secondary" className="text-xs">
                Busca: {activeFilters.searchText}
              </Badge>
            )}
            {activeFilters.dayOfWeek && (
              <Badge variant="secondary" className="text-xs">
                {DAYS_OF_WEEK.find(d => d.value === activeFilters.dayOfWeek)?.label}
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
