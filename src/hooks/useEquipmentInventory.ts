import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { EquipmentInventoryItem } from "@/types/aiSession";

const EQUIPMENT_INVENTORY_COLUMNS = `
  id,
  name,
  category,
  quantity,
  weight_kg,
  weight_range,
  location,
  is_available,
  notes
`;

export const useEquipmentInventory = (onlyAvailable = true) => {
  return useQuery({
    queryKey: ["equipment-inventory", onlyAvailable],
    queryFn: async () => {
      let query = supabase
        .from("equipment_inventory")
        .select(EQUIPMENT_INVENTORY_COLUMNS)
        .order("category")
        .order("name");

      if (onlyAvailable) {
        query = query.eq("is_available", true);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Map snake_case to camelCase
      return data.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        weightKg: item.weight_kg,
        weightRange: item.weight_range,
        location: item.location || "sala_principal",
        isAvailable: item.is_available ?? true,
        notes: item.notes,
      })) as EquipmentInventoryItem[];
    },
  });
};

export const useEquipmentByCategory = (onlyAvailable = true) => {
  const { data: equipment, ...rest } = useEquipmentInventory(onlyAvailable);

  const groupedEquipment = equipment?.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, EquipmentInventoryItem[]>) || {};

  return {
    data: groupedEquipment,
    flatData: equipment,
    ...rest,
  };
};
