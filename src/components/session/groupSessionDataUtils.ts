import {
  areSimilarObservations,
  type AccumulatedRecording,
  type GroupObservation,
  type SessionExercise,
} from "@/types/sessionRecording";

export interface SessionData {
  sessions: Array<{
    student_name: string;
    auto_added?: boolean;
    clinical_observations?: GroupObservation[];
    exercises: SessionExercise[];
  }>;
}

export interface MergedStudent {
  student_name: string;
  recording_numbers: number[];
  clinical_observations: GroupObservation[];
  exercises: SessionExercise[];
}

export interface SelectedStudentForValidation {
  name: string;
  weight_kg?: number;
}

export interface PrescriptionExerciseForValidation {
  exercise_name?: string;
  sets?: string | number | null;
  should_track?: boolean;
  exercises_library?: { name?: string | null } | null;
}

interface ValidateMergedDataParams {
  mergedStudents: MergedStudent[];
  selectedStudents: SelectedStudentForValidation[];
  prescribedExercises: PrescriptionExerciseForValidation[];
  accumulatedRecordingsCount: number;
}

interface AddUnmentionedExercisesParams {
  mergedStudents: MergedStudent[];
  prescribedExercises: PrescriptionExerciseForValidation[];
}

interface RawObservation {
  observation: string;
}

interface RawExercise {
  name: string;
  reps?: number;
  load_kg?: number;
  observations?: string;
}

interface RawSession {
  student_name: string;
  clinical_observations: RawObservation[];
  exercises: RawExercise[];
}

export interface RawAudioSegment {
  extractedData?: {
    sessions: RawSession[];
  };
}

const normalizeName = (value: string): string => value.toLowerCase().trim();

const areExerciseNamesSimilar = (a: string, b: string): boolean => {
  const left = normalizeName(a);
  const right = normalizeName(b);
  return left === right || left.includes(right) || right.includes(left);
};

const getPrescriptionExerciseName = (
  prescribed: PrescriptionExerciseForValidation,
): string => (prescribed.exercise_name || prescribed.exercises_library?.name || "").trim();

export const mergeAllRecordings = (
  recordings: AccumulatedRecording<SessionData>[],
  existingData?: MergedStudent[],
): MergedStudent[] => {
  const studentMap = new Map<string, MergedStudent>();

  if (existingData) {
    existingData.forEach((existing) => {
      studentMap.set(normalizeName(existing.student_name), {
        ...existing,
        recording_numbers: [0],
      });
    });
  }

  recordings.forEach((recording) => {
    recording.data.sessions.forEach((session) => {
      const key = normalizeName(session.student_name);
      if (!studentMap.has(key)) {
        studentMap.set(key, {
          student_name: session.student_name,
          recording_numbers: [],
          clinical_observations: [],
          exercises: [],
        });
      }

      const merged = studentMap.get(key);
      if (!merged) return;

      if (!merged.recording_numbers.includes(recording.recordingNumber)) {
        merged.recording_numbers.push(recording.recordingNumber);
      }

      if (session.clinical_observations) {
        session.clinical_observations.forEach((newObservation) => {
          const alreadyExists = merged.clinical_observations.some((existingObservation) =>
            areSimilarObservations(
              existingObservation.observation_text,
              newObservation.observation_text,
            ),
          );
          if (!alreadyExists) {
            merged.clinical_observations.push(newObservation);
          }
        });
      }

      session.exercises.forEach((newExercise) => {
        const duplicateExists = merged.exercises.some(
          (existingExercise) =>
            existingExercise.executed_exercise_name === newExercise.executed_exercise_name &&
            existingExercise.reps === newExercise.reps &&
            existingExercise.load_kg === newExercise.load_kg,
        );

        if (!duplicateExists) {
          merged.exercises.push(newExercise);
        }
      });
    });
  });

  return Array.from(studentMap.values()).sort((a, b) =>
    a.student_name.localeCompare(b.student_name),
  );
};

export const validateMergedData = ({
  mergedStudents,
  selectedStudents,
  prescribedExercises,
  accumulatedRecordingsCount,
}: ValidateMergedDataParams): { errors: string[]; warnings: string[] } => {
  const warnings: string[] = [];
  const errors: string[] = [];
  const trackablePrescribedExercises = prescribedExercises.filter(
    (exercise) => exercise.should_track !== false,
  );

  mergedStudents.forEach((student) => {
    const matchingStudent = selectedStudents.find(
      (selectedStudent) =>
        normalizeName(selectedStudent.name) === normalizeName(student.student_name),
    );
    const studentWeight = matchingStudent?.weight_kg;

    if (student.exercises.length === 0) {
      errors.push(
        `❌ ${student.student_name} foi mencionado mas não tem exercícios registrados`,
      );
    }

    if (trackablePrescribedExercises.length > 0) {
      trackablePrescribedExercises.forEach((prescribed) => {
        const prescribedName = normalizeName(getPrescriptionExerciseName(prescribed));
        if (!prescribedName) return;

        const wasExecuted = student.exercises.some((exercise) =>
          areExerciseNamesSimilar(exercise.executed_exercise_name, prescribedName),
        );

        if (!wasExecuted) {
          warnings.push(
            `⚠️ ${student.student_name}: "${getPrescriptionExerciseName(
              prescribed,
            )}" prescrito mas NÃO mencionado no áudio`,
          );
        }
      });
    }

    student.exercises.forEach((exercise, index) => {
      const exerciseName = exercise.executed_exercise_name || `Exercício ${index + 1}`;

      if (!exercise.reps || exercise.reps <= 0) {
        errors.push(`❌ ${student.student_name} - ${exerciseName}: faltam repetições`);
      }

      if (!exercise.load_breakdown || exercise.load_breakdown.trim() === "") {
        warnings.push(
          `⚠️ ${student.student_name} - ${exerciseName}: sem descrição de carga`,
        );
      }

      if (exercise.load_kg === null || exercise.load_kg === 0) {
        warnings.push(`⚠️ ${student.student_name} - ${exerciseName}: sem carga calculada`);
      }

      const isBodyWeight = exercise.load_breakdown
        ?.toLowerCase()
        .includes("peso corporal");

      if (isBodyWeight && exercise.load_kg === null && studentWeight) {
        errors.push(
          `❌ ${student.student_name} - ${exerciseName}: peso corporal não foi calculado automaticamente (aluno tem ${studentWeight} kg cadastrado)`,
        );
      }
    });

    student.clinical_observations.forEach((observation, index) => {
      if (!observation.severity) {
        errors.push(
          `❌ ${student.student_name}: Observação clínica ${index + 1} sem severidade`,
        );
      }

      if (!observation.observation_text || observation.observation_text.trim() === "") {
        errors.push(`❌ ${student.student_name}: Observação clínica ${index + 1} sem texto`);
      }
    });

    if (student.recording_numbers.length === 1 && accumulatedRecordingsCount > 1) {
      warnings.push(
        `⚠️ ${student.student_name} só aparece na gravação ${student.recording_numbers[0]}`,
      );
    }
  });

  selectedStudents.forEach((student) => {
    const wasMentioned = mergedStudents.find(
      (mergedStudent) =>
        normalizeName(mergedStudent.student_name) === normalizeName(student.name),
    );
    if (!wasMentioned) {
      warnings.push(`⚠️ ${student.name} não foi mencionado em nenhuma gravação`);
    }
  });

  return { errors, warnings };
};

export const addUnmentionedPrescribedExercises = ({
  mergedStudents,
  prescribedExercises,
}: AddUnmentionedExercisesParams): MergedStudent[] => {
  const trackablePrescribedExercises = prescribedExercises.filter(
    (exercise) => exercise.should_track !== false,
  );

  return mergedStudents.map((student) => {
    const unmentionedExercises = trackablePrescribedExercises.filter((prescribed) => {
      const prescribedName = normalizeName(getPrescriptionExerciseName(prescribed));
      if (!prescribedName) return false;

      const wasExecuted = student.exercises.some((exercise) =>
        areExerciseNamesSimilar(exercise.executed_exercise_name, prescribedName),
      );
      return !wasExecuted;
    });

    const exercisesToAdd: SessionExercise[] = unmentionedExercises.map((prescribed) => {
      const exerciseName = getPrescriptionExerciseName(prescribed);
      const setsAsNumber = Number.parseInt(String(prescribed.sets ?? ""), 10);

      return {
        prescribed_exercise_name: exerciseName,
        executed_exercise_name: exerciseName,
        sets: Number.isNaN(setsAsNumber) ? null : setsAsNumber,
        reps: null,
        load_kg: null,
        load_breakdown: "",
        observations:
          "⚠️ Exercício prescrito mas não mencionado - preencher manualmente",
        is_best_set: false,
      };
    });

    return {
      ...student,
      exercises: [...student.exercises, ...exercisesToAdd],
    };
  });
};

export const mapAudioSegmentsToSessionData = (
  segments: RawAudioSegment[],
): SessionData => {
  const mapRawExercise = (raw: RawExercise): SessionExercise => ({
    executed_exercise_name: raw.name,
    reps: raw.reps ?? null,
    load_kg: raw.load_kg ?? null,
    load_breakdown: "",
    observations: raw.observations ?? null,
    is_best_set: false,
  });

  const mapRawObservation = (raw: RawObservation): GroupObservation => ({
    observation_text: raw.observation,
    categories: ["geral"],
    severity: "média",
  });

  const sessionsByStudent = segments.reduce(
    (accumulator, segment) => {
      if (!segment.extractedData?.sessions) return accumulator;

      segment.extractedData.sessions.forEach((session) => {
        const mappedExercises = session.exercises.map(mapRawExercise);
        const mappedObservations = session.clinical_observations.map(mapRawObservation);
        const existingSession = accumulator.find(
          (studentSession) =>
            normalizeName(studentSession.student_name) === normalizeName(session.student_name),
        );

        if (!existingSession) {
          accumulator.push({
            student_name: session.student_name,
            exercises: [...mappedExercises],
            clinical_observations: [...mappedObservations],
          });
          return;
        }

        mappedExercises.forEach((newExercise) => {
          const duplicateIndex = existingSession.exercises.findIndex((existingExercise) =>
            areExerciseNamesSimilar(
              existingExercise.executed_exercise_name,
              newExercise.executed_exercise_name,
            ),
          );

          if (duplicateIndex >= 0) {
            if (
              (newExercise.load_kg || 0) >=
              (existingSession.exercises[duplicateIndex].load_kg || 0)
            ) {
              existingSession.exercises[duplicateIndex] = newExercise;
            }
            return;
          }

          existingSession.exercises.push(newExercise);
        });

        existingSession.clinical_observations = [
          ...existingSession.clinical_observations,
          ...mappedObservations,
        ];
      });

      return accumulator;
    },
    [] as Array<{
      student_name: string;
      exercises: SessionExercise[];
      clinical_observations: GroupObservation[];
    }>,
  );

  return { sessions: sessionsByStudent };
};
