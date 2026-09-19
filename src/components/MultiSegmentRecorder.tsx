import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AudioSegmentRecorder } from "./AudioSegmentRecorder";
import { TranscriptionEditor } from "./TranscriptionEditor";
import { ArrowRight, Plus } from "lucide-react";


interface RawObservation {
  observation: string;
}

interface RawExercise {
  name?: string;
  executed_exercise_name?: string;
  exercise_library_id?: string | null;
  reps?: number | null;
  reserve_reps?: string | null;
  load_kg?: number | null;
  load_breakdown?: string | null;
  observations?: string | null;
}

interface AudioSegment {
  segmentOrder: number;
  rawTranscription: string;
  editedTranscription?: string;
  audioDuration: number;
  extractedData?: {
    sessions: Array<{
      student_name: string;
      clinical_observations: RawObservation[];
      exercises: RawExercise[];
    }>;
  };
}

interface MultiSegmentRecorderProps {
  prescriptionId?: string;
  selectedStudents?: Array<{ id: string; name: string; weight_kg?: number }>;
  date: string;
  time: string;
  onComplete: (segments: AudioSegment[]) => void;
  onError?: (error: string) => void;
  /** Informa ao diálogo quantos trechos já foram transcritos — usado pela
   *  guarda que confirma antes de descartar gravações ao fechar/voltar. */
  onSegmentsChange?: (count: number) => void;
}

export function MultiSegmentRecorder({
  prescriptionId,
  selectedStudents,
  date,
  time,
  onComplete,
  onError,
  onSegmentsChange,
}: MultiSegmentRecorderProps) {
  const [segments, setSegments] = useState<AudioSegment[]>([]);
  const [currentSegmentNumber, setCurrentSegmentNumber] = useState(1);
  const [showRecorder, setShowRecorder] = useState(true);

  useEffect(() => {
    onSegmentsChange?.(segments.length);
  }, [segments.length, onSegmentsChange]);

  const handleSegmentComplete = (segment: AudioSegment) => {
    setSegments((prev) => [...prev, segment]);
    setShowRecorder(false);
  };

  const handleTranscriptionChange = (segmentIndex: number, transcription: string) => {
    setSegments((prev) =>
      prev.map((seg, idx) =>
        idx === segmentIndex
          ? { ...seg, editedTranscription: transcription }
          : seg
      )
    );
  };

  const handleAddAnotherSegment = () => {
    setCurrentSegmentNumber((prev) => prev + 1);
    setShowRecorder(true);
  };

  const handleFinalize = () => {
    if (segments.length === 0) {
      onError?.("Nenhum trecho de áudio foi gravado");
      return;
    }
    onComplete(segments);
  };

  const totalDuration = segments.reduce((acc, seg) => acc + seg.audioDuration, 0);

  return (
    <div className="space-y-6">
      {segments.length > 0 && (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {segments.length === 1 ? "1 trecho gravado" : `${segments.length} trechos gravados`}
          {" · "}
          {Math.floor(totalDuration / 60)}:{(totalDuration % 60).toString().padStart(2, "0")} min
        </p>
      )}

      {/* Gravador do trecho atual */}
      {showRecorder && (
        <AudioSegmentRecorder
          currentSegmentNumber={currentSegmentNumber}
          prescriptionId={prescriptionId}
          selectedStudents={selectedStudents}
          date={date}
          time={time}
          onSegmentComplete={handleSegmentComplete}
          onError={onError}
        />
      )}

      {/* Trechos transcritos (a rolagem é a do próprio diálogo) */}
      {segments.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-base font-semibold">Transcrições</h3>
          {segments.map((segment, index) => (
            <TranscriptionEditor
              key={index}
              segmentOrder={segment.segmentOrder}
              rawTranscription={segment.rawTranscription}
              initialEditedTranscription={segment.editedTranscription}
              onTranscriptionChange={(transcription) =>
                handleTranscriptionChange(index, transcription)
              }
              autoSave={false}
            />
          ))}
        </div>
      )}

      {/* Um CTA: revisar. Gravar outro trecho fica como ação secundária. */}
      {segments.length > 0 && !showRecorder && (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button onClick={handleAddAnotherSegment} variant="ghost" size="touch">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Gravar outro trecho
          </Button>
          <Button onClick={handleFinalize} size="touch">
            Revisar sessão
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  );
}
