/**
 * Constantes de Equipamentos - Fabrik Performance
 */

// ============================================================================
// CATEGORIAS DE EQUIPAMENTO
// ============================================================================

export const EQUIPMENT_CATEGORIES = {
  kettlebell: "Kettlebell",
  halter: "Halter",
  barra: "Barra",
  medicine_ball: "Medicine Ball",
  slam_ball: "Slam Ball",
  sand_bag: "Sand Bag",
  suspensao: "Suspensão (TRX)",
  banda: "Banda Elástica",
  mini_band: "Mini Band",
  box: "Box/Plataforma",
  step: "Step",
  bola_suica: "Bola Suíça",
  rolamento: "Equipamento de Rolamento",
  cardio: "Cardio",
  strongman: "Strongman",
  recuperacao: "Recuperação",
} as const;

export type EquipmentCategory = keyof typeof EQUIPMENT_CATEGORIES;

// ============================================================================
// LISTA DE EQUIPAMENTOS DA FABRIK
// ============================================================================

export const FABRIK_EQUIPMENT = [
  // Kettlebells
  { name: "Kettlebell 8kg", category: "kettlebell", weight: 8 },
  { name: "Kettlebell 12kg", category: "kettlebell", weight: 12 },
  { name: "Kettlebell 16kg", category: "kettlebell", weight: 16 },
  { name: "Kettlebell 20kg", category: "kettlebell", weight: 20 },
  { name: "Kettlebell 24kg", category: "kettlebell", weight: 24 },
  { name: "Kettlebell 32kg", category: "kettlebell", weight: 32 },
  
  // Halteres
  { name: "Halter 2kg", category: "halter", weight: 2 },
  { name: "Halter 4kg", category: "halter", weight: 4 },
  { name: "Halter 6kg", category: "halter", weight: 6 },
  { name: "Halter 8kg", category: "halter", weight: 8 },
  { name: "Halter 10kg", category: "halter", weight: 10 },
  { name: "Halter 12kg", category: "halter", weight: 12 },
  
  // Barras
  { name: "Barra Olímpica", category: "barra", weight: 20 },
  { name: "Barra Hexagonal", category: "barra", weight: 25 },
  { name: "Landmine", category: "barra", weight: null },
  
  // Medicine Balls e Slam Balls
  { name: "Medicine Ball 4kg", category: "medicine_ball", weight: 4 },
  { name: "Medicine Ball 6kg", category: "medicine_ball", weight: 6 },
  { name: "Medicine Ball 8kg", category: "medicine_ball", weight: 8 },
  { name: "Slam Ball 10kg", category: "slam_ball", weight: 10 },
  { name: "Slam Ball 15kg", category: "slam_ball", weight: 15 },
  
  // Sand Bags
  { name: "Sand Bag 15kg", category: "sand_bag", weight: 15 },
  { name: "Sand Bag 20kg", category: "sand_bag", weight: 20 },
  
  // Acessórios
  { name: "TRX", category: "suspensao", weight: null },
  { name: "Banda Elástica Leve", category: "banda", weight: null },
  { name: "Banda Elástica Média", category: "banda", weight: null },
  { name: "Banda Elástica Pesada", category: "banda", weight: null },
  { name: "Mini Band Leve", category: "mini_band", weight: null },
  { name: "Mini Band Média", category: "mini_band", weight: null },
  { name: "Mini Band Pesada", category: "mini_band", weight: null },
  
  // Boxes e Plataformas
  { name: "Box Jump 50cm", category: "box", weight: null },
  { name: "Box Jump 60cm", category: "box", weight: null },
  { name: "Step", category: "step", weight: null },
  
  // Bolas e Rolamento
  { name: "Bola Suíça 55cm", category: "bola_suica", weight: null },
  { name: "Bola Suíça 65cm", category: "bola_suica", weight: null },
  { name: "Foam Roller", category: "rolamento", weight: null },
  { name: "Bola de Lacrosse", category: "rolamento", weight: null },
  
  // Cardio e Strongman
  { name: "Air Bike", category: "cardio", weight: null },
  { name: "Yoke", category: "strongman", weight: 60 },
  
  // Recuperação
  { name: "Banheira de Gelo", category: "recuperacao", weight: null },
  { name: "Sauna", category: "recuperacao", weight: null },
] as const;

// ============================================================================
// HELPER PARA OBTER EQUIPAMENTOS POR CATEGORIA
// ============================================================================

export const getEquipmentByCategory = (category: EquipmentCategory) => {
  return FABRIK_EQUIPMENT.filter((eq) => eq.category === category);
};

export const getEquipmentNames = (): string[] => {
  return FABRIK_EQUIPMENT.map((eq) => eq.name);
};
