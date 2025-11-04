/**
 * Constantes de navegação e nomenclaturas
 * Centralizadas para garantir consistência em toda a aplicação
 * Padrão: Sentence case, máx. 2-3 palavras, sem gerúndio
 */
export const NAV_LABELS = {
  // Navegação principal
  dashboard: "Dashboard",
  students: "Alunos",
  exercises: "Exercícios",
  prescriptions: "Prescrições",
  protocols: "Protocolos",
  
  // Páginas secundárias
  studentsComparison: "Comparar alunos",
  adminUsers: "Usuários",
  adminDiagnostics: "Diagnóstico Oura",
  
  // Ações comuns
  addStudent: "Adicionar aluno",
  groupSession: "Sessão em grupo",
  generateInvite: "Gerar convite",
  importExcel: "Importar Excel",
  importExercises: "Importar exercícios",
  newPrescription: "Nova prescrição",
  recordSession: "Registrar sessão",
  signOut: "Sair",
  back: "Voltar",
  
  // Tabs
  tabTraining: "Treinamento",
  tabOverview: "Visão geral",
  tabSessions: "Sessões",
  tabExercises: "Exercícios",
  tabPrescriptions: "Prescrições",
  tabOura: "Métricas Oura",
  
  // Stats cards
  statTotalSessions: "Sessões registradas",
  statThisMonth: "Este mês",
  statActiveStudents: "Alunos ativos",
  statAvgLoad: "Carga média",
  statTotalUsers: "Total de usuários",
  statAdmins: "Administradores",
  statModerators: "Treinadores",
  statStudents: "Alunos",
  
  // Seções
  sectionRecentSessions: "Sessões recentes",
  sectionFilters: "Filtros",
  sectionUserList: "Lista de usuários",
  
  // Subtítulos padrão
  subtitleDefault: "Sistema de registro e acompanhamento",
  subtitleStudents: "Gerencie os dados dos seus alunos",
  subtitleExercises: "Gerencie exercícios com classificações por padrões de movimento",
  subtitlePrescriptions: "Crie e gerencie prescrições de treino para seus alunos",
  subtitleProtocols: "Biblioteca completa baseada em evidências científicas",
  subtitleComparison: "Visualize e compare dados de até 10 alunos simultaneamente",
  subtitleAdminUsers: "Gerencie contas, perfis e permissões de todos os usuários do sistema",
  subtitleDiagnostics: "Painel técnico para administradores",
} as const;

export type NavLabel = typeof NAV_LABELS[keyof typeof NAV_LABELS];
