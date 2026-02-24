import { supabase } from "@/integrations/supabase/client";

interface ExerciseData {
  name: string;
  movement_pattern: string;
  laterality: string;
  contraction_type: string;
  level: string;
  description?: string;
}

// Mapeamento de Base para Laterality
const mapLaterality = (base: string): string => {
  const baseNormalized = base.toLowerCase().trim();
  
  if (baseNormalized.includes('bilateral') && baseNormalized.includes('assimétrica')) {
    return 'base_assimetrica';
  }
  if (baseNormalized.includes('unilateral') && baseNormalized.includes('assimétrica')) {
    return 'unilateral';
  }
  if (baseNormalized.includes('bilateral')) {
    return 'bilateral';
  }
  if (baseNormalized.includes('unilateral')) {
    return 'unilateral';
  }
  
  // Default para bilateral se não especificado
  return 'bilateral';
};

// Mapeamento de Nível
const mapLevel = (nivel: string): string => {
  const nivelNormalized = nivel.toLowerCase().trim();
  
  if (nivelNormalized.includes('iniciante') && nivelNormalized.includes('interm')) {
    return 'Iniciante/Intermediário';
  }
  if (nivelNormalized.includes('interm') && nivelNormalized.includes('avançado')) {
    return 'Intermediário/Avançado';
  }
  if (nivelNormalized.includes('todos')) {
    return 'Todos os níveis';
  }
  if (nivelNormalized.includes('iniciante')) {
    return 'Iniciante';
  }
  if (nivelNormalized.includes('intermediário') || nivelNormalized.includes('interm')) {
    return 'Intermediário';
  }
  if (nivelNormalized.includes('avançado')) {
    return 'Avançado';
  }
  
  return 'Intermediário'; // default
};

// Lista de exercícios extraídos da planilha
const exercises: ExerciseData[] = [
  // DOMINÂNCIA DE JOELHO
  { name: "Agachamento assistido", movement_pattern: "Dominância de joelho", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Iniciante" },
  { name: "Agachamento", movement_pattern: "Dominância de joelho", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Iniciante" },
  { name: "Agachamento na caixa", movement_pattern: "Dominância de joelho", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Iniciante" },
  { name: "Agachamento goblet", movement_pattern: "Dominância de joelho", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Iniciante/Intermediário" },
  { name: "Agachamento sumô", movement_pattern: "Dominância de joelho", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário" },
  { name: "Agachamento frontal", movement_pattern: "Dominância de joelho", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário" },
  { name: "Agachamento costas", movement_pattern: "Dominância de joelho", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Avançado" },
  { name: "Agachamento overhead", movement_pattern: "Dominância de joelho", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Avançado" },
  { name: "Agachamento unilateral assistido", movement_pattern: "Dominância de joelho", laterality: "unilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário" },
  { name: "Agachamento unilateral (pistol)", movement_pattern: "Dominância de joelho", laterality: "unilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Avançado" },
  { name: "Agachamento unilateral carregado", movement_pattern: "Dominância de joelho", laterality: "unilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Avançado" },
  { name: "Jump squat", movement_pattern: "Dominância de joelho", laterality: "bilateral", contraction_type: "Dinâmica explosiva", level: "Intermediário/Avançado" },
  { name: "Wall sit", movement_pattern: "Dominância de joelho", laterality: "bilateral", contraction_type: "Isométrica", level: "Todos os níveis" },

  // DOMINÂNCIA DE QUADRIL
  { name: "Ponte no solo", movement_pattern: "Dominância de quadril", laterality: "bilateral", contraction_type: "Dinâmica controlada", level: "Iniciante" },
  { name: "Ponte no solo unilateral", movement_pattern: "Dominância de quadril", laterality: "unilateral", contraction_type: "Dinâmica controlada", level: "Iniciante/Intermediário" },
  { name: "Ponte com pés no slide", movement_pattern: "Dominância de quadril", laterality: "bilateral", contraction_type: "Dinâmica controlada", level: "Intermediário" },
  { name: "Ponte com pés no slide unilateral", movement_pattern: "Dominância de quadril", laterality: "unilateral", contraction_type: "Dinâmica controlada", level: "Intermediário" },
  { name: "Ponte caminhando com calcanhar", movement_pattern: "Dominância de quadril", laterality: "bilateral", contraction_type: "Dinâmica controlada", level: "Intermediário" },
  { name: "Ponte isométrica (topo)", movement_pattern: "Dominância de quadril", laterality: "bilateral", contraction_type: "Isométrica", level: "Todos os níveis" },
  { name: "Hip thrust", movement_pattern: "Dominância de quadril", laterality: "bilateral", contraction_type: "Dinâmica controlada", level: "Intermediário" },
  { name: "Hip thrust unilateral", movement_pattern: "Dominância de quadril", laterality: "unilateral", contraction_type: "Dinâmica controlada", level: "Avançado" },
  { name: "Hip thrust isométrico (topo)", movement_pattern: "Dominância de quadril", laterality: "bilateral", contraction_type: "Isométrica", level: "Todos os níveis" },
  { name: "Flexão nórdica", movement_pattern: "Dominância de quadril", laterality: "bilateral", contraction_type: "Excêntrica controlada", level: "Avançado" },
  { name: "Deadlift (elevado/assistido)", movement_pattern: "Dominância de quadril", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Iniciante" },
  { name: "Deadlift (kettlebell/halter)", movement_pattern: "Dominância de quadril", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Iniciante/Intermediário" },
  { name: "Deadlift (barra) — convencional", movement_pattern: "Dominância de quadril", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário" },
  { name: "Deadlift (barra) — sumô", movement_pattern: "Dominância de quadril", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário" },
  { name: "RDL (romeno) — barra", movement_pattern: "Dominância de quadril", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário/Avançado" },
  { name: "RDL (romeno) — kettlebell/halter", movement_pattern: "Dominância de quadril", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário" },
  { name: "RDL unilateral", movement_pattern: "Dominância de quadril", laterality: "unilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Avançado" },
  { name: "Bom dia (barra)", movement_pattern: "Dominância de quadril", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário/Avançado" },
  { name: "Pull-through", movement_pattern: "Dominância de quadril", laterality: "bilateral", contraction_type: "Dinâmica controlada", level: "Intermediário" },
  { name: "Swing (kettlebell)", movement_pattern: "Dominância de quadril", laterality: "bilateral", contraction_type: "Dinâmica explosiva", level: "Intermediário/Avançado" },
  { name: "RDL base assimétrica", movement_pattern: "Dominância de quadril", laterality: "base_assimetrica", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário" },
  { name: "RDL base assimétrica unilateral", movement_pattern: "Dominância de quadril", laterality: "base_assimetrica", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário/Avançado" },
  { name: "Good morning base assimétrica", movement_pattern: "Dominância de quadril", laterality: "base_assimetrica", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário/Avançado" },
  { name: "Hip thrust base assimétrica", movement_pattern: "Dominância de quadril", laterality: "base_assimetrica", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário" },
  { name: "Hip thrust base assimétrica unilateral", movement_pattern: "Dominância de quadril", laterality: "base_assimetrica", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Avançado" },

  // EMPURRAR HORIZONTAL
  { name: "Flexão de braços em posição elevada", movement_pattern: "Empurrar horizontal", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Iniciante" },
  { name: "Flexão de braços assistida", movement_pattern: "Empurrar horizontal", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Iniciante" },
  { name: "Flexão de braços ajoelhado", movement_pattern: "Empurrar horizontal", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Iniciante" },
  { name: "Flexão de braços", movement_pattern: "Empurrar horizontal", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Iniciante/Intermediário" },
  { name: "Flexão de braços pés elevados", movement_pattern: "Empurrar horizontal", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário" },
  { name: "Flexão de braços com elástico", movement_pattern: "Empurrar horizontal", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário/Avançado" },
  { name: "Flexão de braços com sobrecarga", movement_pattern: "Empurrar horizontal", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Avançado" },
  { name: "Flexão de braços pliométrica", movement_pattern: "Empurrar horizontal", laterality: "bilateral", contraction_type: "Dinâmica explosiva", level: "Intermediário/Avançado" },
  { name: "Flexão de braços isométrica", movement_pattern: "Empurrar horizontal", laterality: "bilateral", contraction_type: "Isométrica", level: "Todos os níveis" },
  { name: "Supino reto (solo)", movement_pattern: "Empurrar horizontal", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Iniciante/Intermediário" },
  { name: "Supino reto (banco)", movement_pattern: "Empurrar horizontal", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário" },
  { name: "Supino inclinado", movement_pattern: "Empurrar horizontal", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário" },
  { name: "Supino reto unilateral", movement_pattern: "Empurrar horizontal", laterality: "unilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário/Avançado" },

  // EMPURRAR VERTICAL
  { name: "Desenvolvimento assistido", movement_pattern: "Empurrar vertical", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Iniciante" },
  { name: "Desenvolvimento ajoelhado", movement_pattern: "Empurrar vertical", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Iniciante" },
  { name: "Desenvolvimento semi-ajoelhado", movement_pattern: "Empurrar vertical", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Iniciante/Intermediário" },
  { name: "Desenvolvimento militar em pé", movement_pattern: "Empurrar vertical", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário" },
  { name: "Desenvolvimento militar unilateral", movement_pattern: "Empurrar vertical", laterality: "unilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário/Avançado" },
  { name: "Desenvolvimento militar barra", movement_pattern: "Empurrar vertical", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Avançado" },
  { name: "Push press", movement_pattern: "Empurrar vertical", laterality: "bilateral", contraction_type: "Dinâmica explosiva", level: "Avançado" },
  { name: "Landmine press sentado", movement_pattern: "Empurrar vertical", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Iniciante" },
  { name: "Landmine press ajoelhado", movement_pattern: "Empurrar vertical", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Iniciante" },
  { name: "Landmine press semi-ajoelhado", movement_pattern: "Empurrar vertical", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário" },
  { name: "Landmine press em pé", movement_pattern: "Empurrar vertical", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário/Avançado" },
  { name: "Landmine press base assimétrica", movement_pattern: "Empurrar vertical", laterality: "base_assimetrica", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Avançado" },

  // PUXAR HORIZONTAL
  { name: "Remada baixa assistida (supino invertido)", movement_pattern: "Puxar horizontal", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Iniciante" },
  { name: "Remada baixa (supino invertido)", movement_pattern: "Puxar horizontal", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Iniciante/Intermediário" },
  { name: "Remada baixa unilateral", movement_pattern: "Puxar horizontal", laterality: "unilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário" },
  { name: "Remada sentada", movement_pattern: "Puxar horizontal", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Iniciante/Intermediário" },
  { name: "Remada unilateral no banco", movement_pattern: "Puxar horizontal", laterality: "unilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário" },
  { name: "Remada curvada", movement_pattern: "Puxar horizontal", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário/Avançado" },
  { name: "Remada curvada unilateral", movement_pattern: "Puxar horizontal", laterality: "unilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Avançado" },
  { name: "Remada landmine", movement_pattern: "Puxar horizontal", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Avançado" },
  { name: "Remada isométrica", movement_pattern: "Puxar horizontal", laterality: "bilateral", contraction_type: "Isométrica", level: "Todos os níveis" },

  // PUXAR VERTICAL
  { name: "Puxada vertical assistida", movement_pattern: "Puxar vertical", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Iniciante" },
  { name: "Puxada na polia alta", movement_pattern: "Puxar vertical", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Iniciante/Intermediário" },
  { name: "Puxada na polia alta unilateral", movement_pattern: "Puxar vertical", laterality: "unilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário" },
  { name: "Barra fixa assistida", movement_pattern: "Puxar vertical", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário" },
  { name: "Barra fixa (pull-up)", movement_pattern: "Puxar vertical", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário/Avançado" },
  { name: "Barra fixa (chin-up)", movement_pattern: "Puxar vertical", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário/Avançado" },
  { name: "Barra fixa (neutra)", movement_pattern: "Puxar vertical", laterality: "bilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário/Avançado" },
  { name: "Barra fixa isométrica", movement_pattern: "Puxar vertical", laterality: "bilateral", contraction_type: "Isométrica", level: "Intermediário/Avançado" },
  { name: "Muscle-up", movement_pattern: "Puxar vertical", laterality: "bilateral", contraction_type: "Dinâmica explosiva", level: "Avançado" },

  // DOMINÂNCIA DE JOELHO UNILATERAL
  { name: "Split squat assistido", movement_pattern: "Dominância de joelho unilateral", laterality: "unilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Iniciante" },
  { name: "Split squat", movement_pattern: "Dominância de joelho unilateral", laterality: "unilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Iniciante" },
  { name: "Split squat isométrico", movement_pattern: "Dominância de joelho unilateral", laterality: "unilateral", contraction_type: "Isométrica", level: "Iniciante/Intermediário" },
  { name: "Step-up", movement_pattern: "Dominância de joelho unilateral", laterality: "unilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Iniciante/Intermediário" },
  { name: "Step-down", movement_pattern: "Dominância de joelho unilateral", laterality: "unilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Iniciante/Intermediário" },
  { name: "Afundo (forward)", movement_pattern: "Dominância de joelho unilateral", laterality: "unilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Iniciante/Intermediário" },
  { name: "Afundo reverso", movement_pattern: "Dominância de joelho unilateral", laterality: "unilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Iniciante/Intermediário" },
  { name: "Side lunge", movement_pattern: "Dominância de joelho unilateral", laterality: "unilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário" },
  { name: "Curtsy lunge", movement_pattern: "Dominância de joelho unilateral", laterality: "unilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário" },
  { name: "Split squat carregado", movement_pattern: "Dominância de joelho unilateral", laterality: "unilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário" },
  { name: "Split squat com barra", movement_pattern: "Dominância de joelho unilateral", laterality: "unilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário/Avançado" },
  { name: "Afundo búlgaro", movement_pattern: "Dominância de joelho unilateral", laterality: "unilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário" },
  { name: "Afundo búlgaro carregado", movement_pattern: "Dominância de joelho unilateral", laterality: "unilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário" },
  { name: "Afundo búlgaro com barra", movement_pattern: "Dominância de joelho unilateral", laterality: "unilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Avançado" },
  { name: "Step-up carregado", movement_pattern: "Dominância de joelho unilateral", laterality: "unilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário" },
  { name: "Step-up com barra", movement_pattern: "Dominância de joelho unilateral", laterality: "unilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário/Avançado" },
  { name: "Side lunge carregado", movement_pattern: "Dominância de joelho unilateral", laterality: "unilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário/Avançado" },
  { name: "Side lunge landmine", movement_pattern: "Dominância de joelho unilateral", laterality: "unilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Avançado" },
  { name: "Side lunge step-up/down", movement_pattern: "Dominância de joelho unilateral", laterality: "unilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário/Avançado" },
  { name: "Curtsy goblet", movement_pattern: "Dominância de joelho unilateral", laterality: "unilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário" },
  { name: "Curtsy landmine", movement_pattern: "Dominância de joelho unilateral", laterality: "unilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário/Avançado" },
  { name: "Curtsy step-up/step-down", movement_pattern: "Dominância de joelho unilateral", laterality: "unilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário/Avançado" },
  { name: "Walking lunge", movement_pattern: "Dominância de joelho unilateral", laterality: "unilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário" },
  { name: "Walking lunge carregado", movement_pattern: "Dominância de joelho unilateral", laterality: "unilateral", contraction_type: "Dinâmica controlada (ênfase excêntrica)", level: "Intermediário/Avançado" },
  { name: "Jump lunge", movement_pattern: "Dominância de joelho unilateral", laterality: "unilateral", contraction_type: "Dinâmica explosiva", level: "Avançado" },

  // CARRY
  { name: "Farmer carry estático", movement_pattern: "Carry", laterality: "bilateral", contraction_type: "Isométrica", level: "Iniciante" },
  { name: "Farmer carry caminhando", movement_pattern: "Carry", laterality: "bilateral", contraction_type: "Isométrica", level: "Iniciante/Intermediário" },
  { name: "Suitcase carry estático", movement_pattern: "Carry", laterality: "unilateral", contraction_type: "Isométrica", level: "Intermediário" },
  { name: "Suitcase carry caminhando", movement_pattern: "Carry", laterality: "unilateral", contraction_type: "Isométrica", level: "Intermediário" },
  { name: "Front rack carry estático", movement_pattern: "Carry", laterality: "bilateral", contraction_type: "Isométrica", level: "Intermediário/Avançado" },
  { name: "Overhead carry estático", movement_pattern: "Carry", laterality: "bilateral", contraction_type: "Isométrica", level: "Avançado" },
  { name: "Overhead carry unilateral", movement_pattern: "Carry", laterality: "unilateral", contraction_type: "Isométrica", level: "Avançado" },
  { name: "Offset carry", movement_pattern: "Carry", laterality: "unilateral", contraction_type: "Isométrica", level: "Avançado" },

  // MOBILIDADE
  { name: "Mobilidade torácica em quadrupedia (T-spine rotation)", movement_pattern: "Mobilidade", laterality: "bilateral", contraction_type: "Dinâmica controlada", level: "Iniciante" },
  { name: "Mobilidade torácica lateral (open book)", movement_pattern: "Mobilidade", laterality: "bilateral", contraction_type: "Dinâmica controlada", level: "Iniciante" },
  { name: "Mobilidade quadril (90/90 hip switch)", movement_pattern: "Mobilidade", laterality: "bilateral", contraction_type: "Dinâmica controlada", level: "Iniciante" },
  { name: "Mobilidade tornozelo (knee to wall)", movement_pattern: "Mobilidade", laterality: "bilateral", contraction_type: "Dinâmica controlada", level: "Iniciante" },
  { name: "Mobilidade posterior (good morning c/ bastão)", movement_pattern: "Mobilidade", laterality: "bilateral", contraction_type: "Dinâmica controlada", level: "Intermediário" },
  { name: "Mobilidade adutores (cossack squat)", movement_pattern: "Mobilidade", laterality: "bilateral", contraction_type: "Dinâmica controlada", level: "Intermediário/Avançado" },
  { name: "Mobilidade escapular (shrugs pendurados)", movement_pattern: "Mobilidade", laterality: "bilateral", contraction_type: "Dinâmica controlada", level: "Intermediário/Avançado" },

  // CORE - ANTI-EXTENSÃO
  { name: "Dead bug", movement_pattern: "Core - Anti-extensão", laterality: "bilateral", contraction_type: "Isométrica", level: "Iniciante" },
  { name: "Prancha frontal", movement_pattern: "Core - Anti-extensão", laterality: "bilateral", contraction_type: "Isométrica", level: "Iniciante" },
  { name: "Rollout (ab wheel ou barra)", movement_pattern: "Core - Anti-extensão", laterality: "bilateral", contraction_type: "Dinâmica controlada", level: "Intermediário/Avançado" },

  // CORE - ANTI-ROTAÇÃO
  { name: "Bird dog", movement_pattern: "Core - Anti-rotação", laterality: "bilateral", contraction_type: "Isométrica", level: "Iniciante" },
  { name: "Pallof press", movement_pattern: "Core - Anti-rotação", laterality: "bilateral", contraction_type: "Isométrica", level: "Intermediário" },
  { name: "Prancha frontal c/ toques no ombro", movement_pattern: "Core - Anti-rotação", laterality: "bilateral", contraction_type: "Isométrica", level: "Intermediário/Avançado" },

  // CORE - ANTI-FLEXÃO LATERAL
  { name: "Side plank", movement_pattern: "Core - Anti-flexão lateral", laterality: "unilateral", contraction_type: "Isométrica", level: "Iniciante/Intermediário" },
  { name: "Side plank c/ abdução quadril", movement_pattern: "Core - Anti-flexão lateral", laterality: "unilateral", contraction_type: "Isométrica", level: "Intermediário" },
  { name: "Suitcase hold (estático)", movement_pattern: "Core - Anti-flexão lateral", laterality: "unilateral", contraction_type: "Isométrica", level: "Intermediário/Avançado" },

  // ATIVAÇÃO
  { name: "Glute bridge isométrico", movement_pattern: "Ativação", laterality: "bilateral", contraction_type: "Isométrica", level: "Iniciante" },
  { name: "Glute bridge c/ abdução", movement_pattern: "Ativação", laterality: "bilateral", contraction_type: "Isométrica", level: "Iniciante/Intermediário" },
  { name: "Quadrupedia kickback", movement_pattern: "Ativação", laterality: "unilateral", contraction_type: "Dinâmica controlada", level: "Intermediário" },
  { name: "Y-T-W-L", movement_pattern: "Ativação", laterality: "bilateral", contraction_type: "Dinâmica controlada", level: "Intermediário/Avançado" },
  { name: "Face pull (elástico/polia)", movement_pattern: "Ativação", laterality: "bilateral", contraction_type: "Dinâmica controlada", level: "Intermediário" },
  { name: "Shrug isométrico pendurado", movement_pattern: "Ativação", laterality: "bilateral", contraction_type: "Isométrica", level: "Intermediário" },
];

export const populateExercisesLibrary = async () => {
  console.log("Iniciando população do banco de dados...");
  
  // Buscar todos os exercícios existentes
  const { data: existingExercises, error: fetchError } = await supabase
    .from('exercises_library')
    .select('name');
  
  if (fetchError) {
    console.error("Erro ao buscar exercícios existentes:", fetchError);
    return { success: false, error: fetchError };
  }
  
  const existingNames = new Set(
    existingExercises?.map(ex => ex.name.toLowerCase().trim()) || []
  );
  
  console.log(`Encontrados ${existingNames.size} exercícios existentes`);
  
  // Filtrar apenas exercícios novos
  const newExercises = exercises.filter(
    ex => !existingNames.has(ex.name.toLowerCase().trim())
  );
  
  console.log(`${newExercises.length} novos exercícios para adicionar`);
  
  if (newExercises.length === 0) {
    console.log("Nenhum exercício novo para adicionar");
    return { success: true, added: 0, skipped: exercises.length };
  }
  
  // Inserir novos exercícios
  const { data, error } = await supabase
    .from('exercises_library')
    .insert(newExercises.map(ex => ({
      name: ex.name,
      movement_pattern: ex.movement_pattern,
      laterality: mapLaterality(ex.laterality),
      contraction_type: ex.contraction_type,
      level: mapLevel(ex.level),
      description: ex.description || null,
    })));
  
  if (error) {
    console.error("Erro ao inserir exercícios:", error);
    return { success: false, error };
  }
  
  console.log(`${newExercises.length} exercícios adicionados com sucesso!`);
  
  return { 
    success: true, 
    added: newExercises.length,
    skipped: exercises.length - newExercises.length
  };
};
