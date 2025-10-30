-- Fix protocol instructions formatting to use proper line breaks
UPDATE public.recovery_protocols SET instructions = E'1. Pré-aqueça a sauna (80-100°C)\n2. Hidrate-se bem antes\n3. Sessões de 15-20 minutos\n4. Resfrie gradualmente após\n5. Hidrate novamente' WHERE name = 'Sauna Seca';

UPDATE public.recovery_protocols SET instructions = E'1. Temperatura entre 40-50°C\n2. Umidade elevada (100%)\n3. Sessões de 15-20 minutos\n4. Respire profundamente\n5. Hidrate após' WHERE name = 'Sauna a Vapor';

UPDATE public.recovery_protocols SET instructions = E'1. Água entre 10-15°C\n2. Imersão de 3-10 minutos\n3. Comece com períodos curtos\n4. Respire calmamente\n5. Aqueça-se gradualmente' WHERE name = 'Imersão no Gelo';

UPDATE public.recovery_protocols SET instructions = E'1. 3 minutos água quente (38-42°C)\n2. 1 minuto água fria (10-15°C)\n3. Repita 3 vezes\n4. Termine com frio\n5. Total: 12-21 minutos' WHERE name = 'Contraste Quente-Frio';

UPDATE public.recovery_protocols SET instructions = E'1. 3 minutos água fria (10-15°C)\n2. 1 minuto água quente (38-42°C)\n3. Repita 3 vezes\n4. Termine com quente para relaxamento\n5. Total: 12-21 minutos' WHERE name = 'Contraste Frio-Quente';

UPDATE public.recovery_protocols SET instructions = E'1. Inspire por 4 segundos\n2. Segure por 4 segundos\n3. Expire por 4 segundos\n4. Segure vazio por 4 segundos\n5. Repita por 5-10 minutos' WHERE name = 'Box Breathing';

UPDATE public.recovery_protocols SET instructions = E'1. 30-40 respirações profundas rápidas\n2. Expire e segure vazio (1-3 min)\n3. Inspire fundo e segure (10-15s)\n4. Repita 3-4 rounds\n5. Faça deitado' WHERE name = 'Wim Hof';

UPDATE public.recovery_protocols SET instructions = E'1. Inspire por 5 segundos\n2. Expire por 5 segundos\n3. 6 respirações por minuto\n4. Foque no coração\n5. Pratique 5 minutos, 3x ao dia' WHERE name = 'Coerência Cardíaca';

UPDATE public.recovery_protocols SET instructions = E'1. Sente-se confortavelmente\n2. Foque na respiração natural\n3. Observe pensamentos sem julgamento\n4. Retorne suavemente ao foco\n5. Pratique 10-20 minutos diários' WHERE name = 'Mindfulness Meditation';

UPDATE public.recovery_protocols SET instructions = E'1. Deite-se confortavelmente\n2. Escaneie mentalmente cada parte do corpo\n3. Note sensações sem julgar\n4. Relaxe áreas tensas\n5. Da cabeça aos pés (20 min)' WHERE name = 'Body Scan Mindfulness';

UPDATE public.recovery_protocols SET instructions = E'1. 60-70% da FCmax\n2. Deve conseguir conversar\n3. 30-45 minutos\n4. Bike, corrida leve, remo\n5. Frequência: 3-4x/semana' WHERE name = 'Cardio Zona 2';

UPDATE public.recovery_protocols SET instructions = E'1. Sequência de posturas fluidas\n2. Sincronize movimento e respiração\n3. Foque em mobilidade, não força\n4. 20-40 minutos\n5. Adapte à sua condição' WHERE name = 'Yoga Flow';

UPDATE public.recovery_protocols SET instructions = E'1. Ritmo confortável\n2. 30-60 minutos\n3. Ao ar livre se possível\n4. Sem inclinações intensas\n5. Foque em relaxar' WHERE name = 'Caminhada Recuperativa';