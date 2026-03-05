import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { notify } from "@/lib/notify";
import i18n from "@/i18n/pt-BR.json";
import { Loader2, Upload, X } from "lucide-react";
import { useCreateStudent } from "@/hooks/useStudents";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { STUDENT_OBJECTIVES, MAX_OBJECTIVES, getObjectiveLabel } from "@/constants/objectives";
import { NAV_LABELS } from "@/constants/navigation";

const formSchema = z.object({
  name: z.string().trim().min(1, i18n.errors.required).max(100, i18n.errors.maxLength.replace("{{max}}", "100")),
  birth_date: z.string().optional().refine((date) => {
    if (!date) return true;
    const birthDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return birthDate <= today;
  }, i18n.validation.dateFuture),
  weekly_sessions_proposed: z.coerce.number().min(1, i18n.errors.min.replace("{{min}}", "1")).max(7, i18n.errors.max.replace("{{max}}", "7")),
  objectives: z.array(z.string()).max(2, "Selecione no máximo 2 objetivos").optional(),
  limitations: z.string().optional(),
  preferences: z.string().optional(),
  max_heart_rate: z.coerce.number().optional().nullable(),
  injury_history: z.string().optional(),
  fitness_level: z.enum(['iniciante', 'intermediario', 'avancado']).optional().nullable(),
  weight_kg: z.coerce.number().positive(i18n.validation.positiveNumber).optional().nullable(),
  height_cm: z.coerce.number().positive(i18n.validation.positiveNumber).optional().nullable(),
});

type FormData = z.infer<typeof formSchema>;

interface Student {
  id: string;
  name: string;
  weight_kg?: number | null;
  height_cm?: number | null;
  birth_date?: string | null;
  objectives?: string[] | null;
  limitations?: string | null;
  preferences?: string | null;
  injury_history?: string | null;
  fitness_level?: string | null;
  max_heart_rate?: number | null;
  weekly_sessions_proposed?: number;
  avatar_url?: string | null;
}

interface AddStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStudentCreated?: (student: Student) => void;
}

export const AddStudentDialog = ({ open, onOpenChange, onStudentCreated }: AddStudentDialogProps) => {
  const createStudent = useCreateStudent();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      birth_date: "",
      weekly_sessions_proposed: 2,
      objectives: [],
      limitations: "",
      preferences: "",
      max_heart_rate: null,
      injury_history: "",
      fitness_level: null,
      weight_kg: null,
      height_cm: null,
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        notify.error(i18n.modules.upload.errorSize.replace("{{max}}", "5"));
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const onSubmit = async (data: FormData) => {
    const loader = notify.loading(i18n.feedback.saving);
    
    try {
      setIsUploadingAvatar(true);

      // Auto-calcular frequência cardíaca máxima
      let maxHeartRate = data.max_heart_rate;
      if (!maxHeartRate && data.birth_date) {
        const birthYear = new Date(data.birth_date).getFullYear();
        const age = new Date().getFullYear() - birthYear;
        maxHeartRate = 220 - age;
      }

      let avatarUrl = null;

      // Upload avatar if provided
      if (avatarFile) {
        loader.update(i18n.feedback.uploading);
        
        const tempId = crypto.randomUUID();
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${tempId}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('student-avatars')
          .upload(fileName, avatarFile);

        if (uploadError) {
          throw new Error(i18n.modules.upload.error);
        }

        const { data: { publicUrl } } = supabase.storage
          .from('student-avatars')
          .getPublicUrl(fileName);

        avatarUrl = publicUrl;
      }

      const newStudent = await createStudent.mutateAsync({
        name: data.name,
        birth_date: data.birth_date || null,
        weekly_sessions_proposed: data.weekly_sessions_proposed,
        objectives: data.objectives || null,
        limitations: data.limitations || null,
        preferences: data.preferences || null,
        max_heart_rate: maxHeartRate,
        injury_history: data.injury_history || null,
        fitness_level: data.fitness_level || null,
        avatar_url: avatarUrl,
        weight_kg: data.weight_kg,
        height_cm: data.height_cm,
      });
      
      loader.dismiss();
      form.reset();
      setAvatarFile(null);
      setAvatarPreview(null);
      onOpenChange(false);
      
      // Notify parent component about the new student
      if (onStudentCreated && newStudent) {
        onStudentCreated(newStudent);
      }
    } catch (error) {
      loader.error(i18n.modules.students.errorCreate, error instanceof Error ? error.message : "Erro desconhecido");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{NAV_LABELS.addStudent}</DialogTitle>
          <DialogDescription>
            Cadastre um novo aluno no sistema
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-md max-h-[70vh] overflow-y-auto pr-sm">
            <div className="flex flex-col items-center gap-md pb-lg">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarPreview || undefined} className="object-cover" />
                <AvatarFallback>?</AvatarFallback>
              </Avatar>
              <div className="flex gap-xs">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('avatar-upload-add')?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {avatarPreview ? 'Alterar Foto' : 'Adicionar Foto'}
                </Button>
                {avatarPreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeAvatar}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <input
                id="avatar-upload-add"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/jpg"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{i18n.forms.fullName}</FormLabel>
                  <FormControl>
                    <Input 
                      id="add-student-name"
                      name="student-name"
                      autoComplete="name"
                      placeholder={i18n.forms.placeholder.name} 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-md">
              <FormField
                control={form.control}
                name="birth_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Nascimento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="weekly_sessions_proposed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sessões/semana</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" max="7" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-md">
              <FormField
                control={form.control}
                name="weight_kg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Peso (kg)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.1"
                        placeholder="Ex: 70.5" 
                        {...field} 
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="height_cm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Altura (cm)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.1"
                        placeholder="Ex: 175" 
                        {...field} 
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="fitness_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nível de Condicionamento</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o nível" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="iniciante">Iniciante</SelectItem>
                      <SelectItem value="intermediario">Intermediário</SelectItem>
                      <SelectItem value="avancado">Avançado</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="max_heart_rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>FC Máx. (bpm)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Se vazio, usa fórmula 220-idade" 
                      {...field} 
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="objectives"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Objetivos (até {MAX_OBJECTIVES})</FormLabel>
                  <div className="space-y-xs">
                    {STUDENT_OBJECTIVES.map((objective) => {
                      const isChecked = field.value?.includes(objective.value) || false;
                      const isDisabled = !isChecked && (field.value?.length || 0) >= MAX_OBJECTIVES;
                      
                      return (
                        <div key={objective.value} className="flex items-center gap-xs">
                          <Checkbox
                            checked={isChecked}
                            disabled={isDisabled}
                            onCheckedChange={(checked) => {
                              const current = field.value || [];
                              const updated = checked 
                                ? [...current, objective.value]
                                : current.filter(v => v !== objective.value);
                              field.onChange(updated);
                            }}
                          />
                          <Label className={isDisabled ? "opacity-50" : ""}>
                            {objective.label}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Badges dos objetivos selecionados */}
                  {field.value && field.value.length > 0 && (
                    <div className="flex flex-wrap gap-xs mt-xs">
                      {field.value.map((value) => (
                        <Badge key={value} variant="secondary" className="gap-1">
                          {getObjectiveLabel(value)}
                          <X 
                            className="h-3 w-3 cursor-pointer hover:text-destructive" 
                            onClick={() => {
                              field.onChange(field.value!.filter(v => v !== value));
                            }}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="limitations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Limitações</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Ex: Dor no joelho, problemas na lombar..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="injury_history"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Histórico de Lesões</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descreva lesões anteriores relevantes..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preferences"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferências</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Ex: Prefere treinos curtos, gosta de exercícios com peso livre..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-sm pt-lg">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onOpenChange(false)}
                >
                  {i18n.actions.cancel}
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  className="flex-1"
                  disabled={createStudent.isPending || isUploadingAvatar}
                >
                  {createStudent.isPending || isUploadingAvatar ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-label={i18n.feedback.saving} />
                      {i18n.feedback.saving}
                    </>
                  ) : (
                    NAV_LABELS.saveStudent
                  )}
                </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
