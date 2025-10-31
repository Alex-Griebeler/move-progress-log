import { supabase } from "@/integrations/supabase/client";

interface TestSessionExercise {
  exercise_name: string;
  sets: number;
  reps: number;
  load_kg: number;
  load_description: string;
  load_breakdown: string;
  observations?: string;
}

interface TestSession {
  studentId: string;
  studentName: string;
  date: string;
  time: string;
  exercises: TestSessionExercise[];
}

// Gerar data aleatória nos últimos 30 dias
const getRandomDate = (daysAgo: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
};

// Gerar horário aleatório (manhã ou tarde)
const getRandomTime = (): string => {
  const morning = ['08:00', '09:00', '10:00'];
  const afternoon = ['14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
  const times = [...morning, ...afternoon];
  return times[Math.floor(Math.random() * times.length)];
};

const observations = [
  "Excelente execução, boa amplitude",
  "Relatou leve desconforto no joelho esquerdo",
  "Progressão de 5kg em relação à sessão anterior",
  "Melhorou estabilidade do core",
  "Última série com auxílio",
  "Solicitou redução de carga por fadiga",
  "Ótima concentração durante o exercício",
  "Melhor controle da respiração",
  "Aumentou amplitude de movimento",
  null,
  null, // Mais chances de não ter observação
];

const getRandomObservation = () => {
  return observations[Math.floor(Math.random() * observations.length)] || undefined;
};

export const populateTestSessions = async () => {
  try {
    // Buscar todos os alunos
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, name')
      .order('name');

    if (studentsError) throw studentsError;
    if (!students || students.length === 0) {
      throw new Error('Nenhum aluno encontrado. Crie alunos primeiro.');
    }

    // Definir distribuição de sessões por aluno
    const sessionsDistribution: Record<string, number> = {};
    
    // Primeiros 2 alunos: 3 sessões cada
    sessionsDistribution[students[0].id] = 3;
    if (students.length > 1) sessionsDistribution[students[1].id] = 3;
    
    // Próximos 3 alunos: 2 sessões cada
    for (let i = 2; i < Math.min(5, students.length); i++) {
      sessionsDistribution[students[i].id] = 2;
    }
    
    // Restante: 1 sessão cada
    for (let i = 5; i < students.length; i++) {
      sessionsDistribution[students[i].id] = 1;
    }

    // Templates de sessões
    const sessionTemplates = [
      // Sessão de Pernas
      {
        type: 'legs',
        exercises: [
          { name: 'Agachamento Livre', sets: 4, reps: 10, baseLoad: 60 },
          { name: 'Leg Press 45°', sets: 3, reps: 12, baseLoad: 120 },
          { name: 'Afundo Caminhando', sets: 3, reps: 10, baseLoad: 20 },
          { name: 'Mesa Flexora', sets: 3, reps: 12, baseLoad: 35 },
          { name: 'Panturrilha em Pé', sets: 4, reps: 15, baseLoad: 50 },
        ],
      },
      // Sessão de Peito/Tríceps
      {
        type: 'chest',
        exercises: [
          { name: 'Supino Reto com Barra', sets: 4, reps: 10, baseLoad: 50 },
          { name: 'Supino Inclinado com Halteres', sets: 3, reps: 12, baseLoad: 20 },
          { name: 'Crucifixo na Polia', sets: 3, reps: 12, baseLoad: 15 },
          { name: 'Tríceps na Polia', sets: 3, reps: 12, baseLoad: 25 },
          { name: 'Tríceps Francês', sets: 3, reps: 10, baseLoad: 12 },
        ],
      },
      // Sessão de Costas/Bíceps
      {
        type: 'back',
        exercises: [
          { name: 'Puxada Frontal', sets: 4, reps: 10, baseLoad: 45 },
          { name: 'Remada Curvada', sets: 3, reps: 10, baseLoad: 40 },
          { name: 'Remada na Polia Baixa', sets: 3, reps: 12, baseLoad: 35 },
          { name: 'Rosca Direta com Barra', sets: 3, reps: 10, baseLoad: 25 },
          { name: 'Rosca Alternada', sets: 3, reps: 12, baseLoad: 12 },
        ],
      },
      // Sessão Full Body
      {
        type: 'fullbody',
        exercises: [
          { name: 'Agachamento Livre', sets: 3, reps: 12, baseLoad: 50 },
          { name: 'Supino com Halteres', sets: 3, reps: 12, baseLoad: 18 },
          { name: 'Remada Curvada', sets: 3, reps: 12, baseLoad: 35 },
          { name: 'Desenvolvimento com Halteres', sets: 3, reps: 10, baseLoad: 15 },
          { name: 'Rosca Direta', sets: 2, reps: 12, baseLoad: 20 },
          { name: 'Tríceps na Polia', sets: 2, reps: 12, baseLoad: 20 },
          { name: 'Prancha Isométrica', sets: 3, reps: 1, baseLoad: 0 },
        ],
      },
    ];

    const testSessions: TestSession[] = [];
    let dayCounter = 1;

    // Criar sessões para cada aluno
    for (const student of students) {
      const numSessions = sessionsDistribution[student.id] || 0;
      
      for (let i = 0; i < numSessions; i++) {
        // Escolher template aleatório
        const template = sessionTemplates[Math.floor(Math.random() * sessionTemplates.length)];
        
        // Gerar exercícios com variação de carga
        const exercises: TestSessionExercise[] = template.exercises.map((ex) => {
          const loadVariation = 0.8 + Math.random() * 0.4; // 80% a 120% da carga base
          const load_kg = Math.round(ex.baseLoad * loadVariation);
          const load_description = load_kg > 0 ? `${load_kg}kg` : 'Peso corporal';
          
          return {
            exercise_name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            load_kg,
            load_description,
            load_breakdown: load_description,
            observations: getRandomObservation(),
          };
        });

        // Distribuir sessões: mais concentradas nas últimas 2 semanas
        const daysAgo = i === 0 ? dayCounter : dayCounter + Math.floor(Math.random() * 15);
        
        testSessions.push({
          studentId: student.id,
          studentName: student.name,
          date: getRandomDate(daysAgo),
          time: getRandomTime(),
          exercises,
        });

        dayCounter += 2; // Espaçar um pouco as sessões
      }
    }

    // Inserir sessões no banco
    let successCount = 0;
    let errorCount = 0;

    for (const session of testSessions) {
      try {
        // Criar workout_session
        const { data: workoutSession, error: sessionError } = await supabase
          .from('workout_sessions')
          .insert({
            student_id: session.studentId,
            date: session.date,
            time: session.time,
          })
          .select()
          .single();

        if (sessionError) {
          console.error(`Erro ao criar sessão para ${session.studentName}:`, sessionError);
          errorCount++;
          continue;
        }

        // Criar exercícios da sessão
        const exercisesToInsert = session.exercises.map((ex) => ({
          session_id: workoutSession.id,
          exercise_name: ex.exercise_name,
          sets: ex.sets,
          reps: ex.reps,
          load_kg: ex.load_kg,
          load_description: ex.load_description,
          load_breakdown: ex.load_breakdown,
          observations: ex.observations,
        }));

        const { error: exercisesError } = await supabase
          .from('exercises')
          .insert(exercisesToInsert);

        if (exercisesError) {
          console.error(`Erro ao criar exercícios para ${session.studentName}:`, exercisesError);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        console.error(`Erro inesperado ao processar sessão de ${session.studentName}:`, err);
        errorCount++;
      }
    }

    return {
      success: true,
      totalSessions: testSessions.length,
      successCount,
      errorCount,
      message: `${successCount} sessões criadas com sucesso!`,
    };
  } catch (error) {
    console.error('Erro ao popular dados de teste:', error);
    throw error;
  }
};
