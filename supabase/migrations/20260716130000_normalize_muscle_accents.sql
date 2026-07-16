-- Normaliza acentos no vocabulário de primary_muscles (tríceps→triceps, bíceps→biceps, etc.).
-- Unifica o filtro por grupamento muscular. text[], idempotente (IS DISTINCT FROM), casa por id8+nome. Auditado Codex.

UPDATE public.exercises_library SET primary_muscles = ARRAY['manguito','serratil','core']::text[]
WHERE left(id::text,8) = '1f1531c0' AND name = 'Arm Bar' AND primary_muscles IS DISTINCT FROM ARRAY['manguito','serratil','core']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['deltoide','triceps']::text[]
WHERE left(id::text,8) = '13067940' AND name = 'Arnold Press' AND primary_muscles IS DISTINCT FROM ARRAY['deltoide','triceps']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['gluteo','isquiotibial','ombro','trapezio']::text[]
WHERE left(id::text,8) = '0d69aff1' AND name = 'Arranco com kettlebell' AND primary_muscles IS DISTINCT FROM ARRAY['gluteo','isquiotibial','ombro','trapezio']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['gluteo','isquiotibial','ombro','trapezio']::text[]
WHERE left(id::text,8) = '5ce9527a' AND name = 'Arremesso + press com kettlebell (clean & press)' AND primary_muscles IS DISTINCT FROM ARRAY['gluteo','isquiotibial','ombro','trapezio']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['gluteo','isquiotibial','ombro','trapezio']::text[]
WHERE left(id::text,8) = '03f0f096' AND name = 'Arremesso com kettlebell (clean)' AND primary_muscles IS DISTINCT FROM ARRAY['gluteo','isquiotibial','ombro','trapezio']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['deltoide_posterior','romboides']::text[]
WHERE left(id::text,8) = '0ddb3f6b' AND name = 'Banda elástica Pull-Apart' AND primary_muscles IS DISTINCT FROM ARRAY['deltoide_posterior','romboides']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['latissimo','romboides','biceps']::text[]
WHERE left(id::text,8) = 'c1ff5323' AND name = 'Barbell Row' AND primary_muscles IS DISTINCT FROM ARRAY['latissimo','romboides','biceps']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['latissimo','biceps']::text[]
WHERE left(id::text,8) = '1d801bcf' AND name = 'Barra fixa archer (unilateral)' AND primary_muscles IS DISTINCT FROM ARRAY['latissimo','biceps']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['latissimo','biceps']::text[]
WHERE left(id::text,8) = 'e659f81c' AND name = 'Barra fixa com sobrecarga' AND primary_muscles IS DISTINCT FROM ARRAY['latissimo','biceps']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['gluteo','transverso_abdominal','romboides']::text[]
WHERE left(id::text,8) = '01a21953' AND name = 'Bird Dog' AND primary_muscles IS DISTINCT FROM ARRAY['gluteo','transverso_abdominal','romboides']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['obliquo','core','ombro']::text[]
WHERE left(id::text,8) = '29d693e2' AND name = 'Bola medicinal — arremesso rotacional' AND primary_muscles IS DISTINCT FROM ARRAY['obliquo','core','ombro']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['peitoral','triceps','core']::text[]
WHERE left(id::text,8) = '04a8c4d1' AND name = 'Bola medicinal — passe de peito' AND primary_muscles IS DISTINCT FROM ARRAY['peitoral','triceps','core']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['quadriceps','gluteo','obliquo']::text[]
WHERE left(id::text,8) = '4173056f' AND name = 'Bulgarian Split Squat com Rotação' AND primary_muscles IS DISTINCT FROM ARRAY['quadriceps','gluteo','obliquo']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['ombro','core','trapezio']::text[]
WHERE left(id::text,8) = '5f89dabf' AND name = 'Carregada acima da cabeça (overhead carry)' AND primary_muscles IS DISTINCT FROM ARRAY['ombro','core','trapezio']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['obliquo','core','trapezio','quadrado_lombar']::text[]
WHERE left(id::text,8) = 'dc0e1149' AND name = 'Carregada de mala (suitcase carry) (Core)' AND primary_muscles IS DISTINCT FROM ARRAY['obliquo','core','trapezio','quadrado_lombar']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['obliquo','core','gluteo']::text[]
WHERE left(id::text,8) = '3e64103b' AND name = 'Chop semi-ajoelhado' AND primary_muscles IS DISTINCT FROM ARRAY['obliquo','core','gluteo']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['adutores','obliquo','core']::text[]
WHERE left(id::text,8) = '40920c03' AND name = 'Copenhagen Plank' AND primary_muscles IS DISTINCT FROM ARRAY['adutores','obliquo','core']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['serratil','trapezio']::text[]
WHERE left(id::text,8) = '45ea447f' AND name = 'Deslizamento na parede' AND primary_muscles IS DISTINCT FROM ARRAY['serratil','trapezio']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['triceps','peitoral_inferior']::text[]
WHERE left(id::text,8) = '9006a850' AND name = 'Dip em Banco' AND primary_muscles IS DISTINCT FROM ARRAY['triceps','peitoral_inferior']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['triceps','peitoral_inferior','deltoide_anterior']::text[]
WHERE left(id::text,8) = 'efc17269' AND name = 'Dip em Paralelas' AND primary_muscles IS DISTINCT FROM ARRAY['triceps','peitoral_inferior','deltoide_anterior']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['peitoral','deltoide_anterior']::text[]
WHERE left(id::text,8) = 'd382f65a' AND name = 'Doorway Chest Alongamento' AND primary_muscles IS DISTINCT FROM ARRAY['peitoral','deltoide_anterior']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['gastrocnemio','soleo']::text[]
WHERE left(id::text,8) = 'a69c978d' AND name = 'Excêntrico panturrilha elevação' AND primary_muscles IS DISTINCT FROM ARRAY['gastrocnemio','soleo']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['deltoide_posterior','manguito','romboides']::text[]
WHERE left(id::text,8) = '112609fe' AND name = 'Face Pull em pé' AND primary_muscles IS DISTINCT FROM ARRAY['deltoide_posterior','manguito','romboides']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['trapezio','core','antebraco']::text[]
WHERE left(id::text,8) = '20bf56b0' AND name = 'Farmers Carry' AND primary_muscles IS DISTINCT FROM ARRAY['trapezio','core','antebraco']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['core','trapezio','obliquo']::text[]
WHERE left(id::text,8) = 'e7cd4372' AND name = 'Farmers Walk (Core)' AND primary_muscles IS DISTINCT FROM ARRAY['core','trapezio','obliquo']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['peitoral','triceps','serratil']::text[]
WHERE left(id::text,8) = '5c18ee6c' AND name = 'Flexão Archer' AND primary_muscles IS DISTINCT FROM ARRAY['peitoral','triceps','serratil']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['peitoral','triceps','serratil']::text[]
WHERE left(id::text,8) = '9b363abb' AND name = 'Flexão com Anéis (Ring Flexão)' AND primary_muscles IS DISTINCT FROM ARRAY['peitoral','triceps','serratil']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['peitoral','triceps']::text[]
WHERE left(id::text,8) = 'f8817eb0' AND name = 'Flexão com Elevação (Déficit)' AND primary_muscles IS DISTINCT FROM ARRAY['peitoral','triceps']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['peitoral','triceps','deltoide_anterior']::text[]
WHERE left(id::text,8) = 'c6418b8d' AND name = 'Flexão com Joelhos' AND primary_muscles IS DISTINCT FROM ARRAY['peitoral','triceps','deltoide_anterior']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['peitoral','triceps','deltoide_anterior']::text[]
WHERE left(id::text,8) = 'bc349853' AND name = 'Flexão Tradicional' AND primary_muscles IS DISTINCT FROM ARRAY['peitoral','triceps','deltoide_anterior']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['peitoral','triceps']::text[]
WHERE left(id::text,8) = 'fbbd5fc1' AND name = 'Floor Press com barra' AND primary_muscles IS DISTINCT FROM ARRAY['peitoral','triceps']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['peitoral','triceps']::text[]
WHERE left(id::text,8) = '08ffcf32' AND name = 'Floor Press com halteres' AND primary_muscles IS DISTINCT FROM ARRAY['peitoral','triceps']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['deltoide','triceps','core']::text[]
WHERE left(id::text,8) = '3a279bf4' AND name = 'Handstand Flexão Assistido' AND primary_muscles IS DISTINCT FROM ARRAY['deltoide','triceps','core']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['isquiotibial','peitoral','triceps']::text[]
WHERE left(id::text,8) = '5127b41b' AND name = 'Inchworm com Flexão' AND primary_muscles IS DISTINCT FROM ARRAY['isquiotibial','peitoral','triceps']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['peitoral','deltoide_anterior','triceps']::text[]
WHERE left(id::text,8) = 'dcc8e889' AND name = 'Landmine Press Horizontal' AND primary_muscles IS DISTINCT FROM ARRAY['peitoral','deltoide_anterior','triceps']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['deltoide_anterior','triceps']::text[]
WHERE left(id::text,8) = 'bf1e4448' AND name = 'Landmine Press Vertical' AND primary_muscles IS DISTINCT FROM ARRAY['deltoide_anterior','triceps']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['latissimo','romboides']::text[]
WHERE left(id::text,8) = '293d2e76' AND name = 'Landmine Row' AND primary_muscles IS DISTINCT FROM ARRAY['latissimo','romboides']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['isquiotibial','gluteo','lombar','trapezio']::text[]
WHERE left(id::text,8) = '0b8727e0' AND name = 'Levantamento terra (barra) — convencional' AND primary_muscles IS DISTINCT FROM ARRAY['isquiotibial','gluteo','lombar','trapezio']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['isquiotibial','gluteo','adutores','trapezio']::text[]
WHERE left(id::text,8) = '9b5f74ca' AND name = 'Levantamento terra (barra) — sumô' AND primary_muscles IS DISTINCT FROM ARRAY['isquiotibial','gluteo','adutores','trapezio']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['fascia_plantar']::text[]
WHERE left(id::text,8) = 'e72b0c2f' AND name = 'Liberação miofascial com bola de lacrosse — Pé (Plantar)' AND primary_muscles IS DISTINCT FROM ARRAY['fascia_plantar']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['peitoral','subclavio']::text[]
WHERE left(id::text,8) = 'ffc6ef90' AND name = 'Liberação miofascial com bola de lacrosse — Peitoral/Subclávio' AND primary_muscles IS DISTINCT FROM ARRAY['peitoral','subclavio']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['gastrocnemio','soleo']::text[]
WHERE left(id::text,8) = '1087d9d8' AND name = 'Liberação miofascial com rolo — Panturrilha' AND primary_muscles IS DISTINCT FROM ARRAY['gastrocnemio','soleo']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['obliquo','core','gluteo']::text[]
WHERE left(id::text,8) = '4751c8c8' AND name = 'Lift semi-ajoelhado' AND primary_muscles IS DISTINCT FROM ARRAY['obliquo','core','gluteo']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['trapezio_inferior']::text[]
WHERE left(id::text,8) = '001a2df6' AND name = 'Low Trap Ativação (Y Prone)' AND primary_muscles IS DISTINCT FROM ARRAY['trapezio_inferior']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['obliquo']::text[]
WHERE left(id::text,8) = '9cffd9f7' AND name = 'Oblique Crunch' AND primary_muscles IS DISTINCT FROM ARRAY['obliquo']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['deltoide','triceps','trapezio']::text[]
WHERE left(id::text,8) = '45f95310' AND name = 'Overhead Press com barra' AND primary_muscles IS DISTINCT FROM ARRAY['deltoide','triceps','trapezio']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['deltoide','triceps','trapezio']::text[]
WHERE left(id::text,8) = 'f7cfb116' AND name = 'Overhead Press com halteres' AND primary_muscles IS DISTINCT FROM ARRAY['deltoide','triceps','trapezio']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['obliquo','core','quadriceps']::text[]
WHERE left(id::text,8) = '9c3bba98' AND name = 'Pallof Press com Agachamento' AND primary_muscles IS DISTINCT FROM ARRAY['obliquo','core','quadriceps']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['soleo']::text[]
WHERE left(id::text,8) = 'ddc275f6' AND name = 'Panturrilha Alongamento com Joelho Flexionado' AND primary_muscles IS DISTINCT FROM ARRAY['soleo']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['gastrocnemio','soleo']::text[]
WHERE left(id::text,8) = 'f8a453d8' AND name = 'Panturrilha elevação com Pausa' AND primary_muscles IS DISTINCT FROM ARRAY['gastrocnemio','soleo']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['deltoide','triceps']::text[]
WHERE left(id::text,8) = 'd95ab617' AND name = 'Pike Flexão' AND primary_muscles IS DISTINCT FROM ARRAY['deltoide','triceps']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['core','deltoide','serratil']::text[]
WHERE left(id::text,8) = 'bafb36fd' AND name = 'Prancha com Elevação Braço' AND primary_muscles IS DISTINCT FROM ARRAY['core','deltoide','serratil']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['core','transverso_abdominal','deltoide']::text[]
WHERE left(id::text,8) = '75375df4' AND name = 'Prancha Frontal' AND primary_muscles IS DISTINCT FROM ARRAY['core','transverso_abdominal','deltoide']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['obliquo','quadrado_lombar']::text[]
WHERE left(id::text,8) = '1cc53c79' AND name = 'Prancha Lateral' AND primary_muscles IS DISTINCT FROM ARRAY['obliquo','quadrado_lombar']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['obliquo','gluteo_medio']::text[]
WHERE left(id::text,8) = 'b65836e8' AND name = 'Prancha Lateral com Abdução' AND primary_muscles IS DISTINCT FROM ARRAY['obliquo','gluteo_medio']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['core','obliquo','quadril']::text[]
WHERE left(id::text,8) = '6ffe6f46' AND name = 'Prancha Spiderman' AND primary_muscles IS DISTINCT FROM ARRAY['core','obliquo','quadril']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['trapezio','romboides','deltoide_posterior']::text[]
WHERE left(id::text,8) = 'b70cc625' AND name = 'Prone Y-T-W' AND primary_muscles IS DISTINCT FROM ARRAY['trapezio','romboides','deltoide_posterior']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['deltoide','triceps','gluteo','quadriceps']::text[]
WHERE left(id::text,8) = '7d7c2fcc' AND name = 'Push Press com barra' AND primary_muscles IS DISTINCT FROM ARRAY['deltoide','triceps','gluteo','quadriceps']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['trapezio','deltoide','gluteo']::text[]
WHERE left(id::text,8) = '64e889a5' AND name = 'Puxada alta com kettlebell' AND primary_muscles IS DISTINCT FROM ARRAY['trapezio','deltoide','gluteo']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['latissimo','biceps','romboides']::text[]
WHERE left(id::text,8) = 'e15b6c04' AND name = 'Puxada na polia alta (lat pulldown)' AND primary_muscles IS DISTINCT FROM ARRAY['latissimo','biceps','romboides']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['latissimo','romboides','biceps']::text[]
WHERE left(id::text,8) = '54c9d09d' AND name = 'Remada com halter' AND primary_muscles IS DISTINCT FROM ARRAY['latissimo','romboides','biceps']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['latissimo','romboides','biceps']::text[]
WHERE left(id::text,8) = '1c3ba739' AND name = 'Remada invertida (TRX/Barra)' AND primary_muscles IS DISTINCT FROM ARRAY['latissimo','romboides','biceps']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['latissimo','romboides','biceps']::text[]
WHERE left(id::text,8) = '334b9011' AND name = 'Remada invertida com Pernas Elevadas' AND primary_muscles IS DISTINCT FROM ARRAY['latissimo','romboides','biceps']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['latissimo','romboides']::text[]
WHERE left(id::text,8) = 'ce7295d0' AND name = 'Remada Meadows' AND primary_muscles IS DISTINCT FROM ARRAY['latissimo','romboides']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['latissimo','romboides','biceps']::text[]
WHERE left(id::text,8) = 'f71e02a5' AND name = 'Remada sentada na polia' AND primary_muscles IS DISTINCT FROM ARRAY['latissimo','romboides','biceps']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['latissimo','romboides','core']::text[]
WHERE left(id::text,8) = '5a4f90e9' AND name = 'Renegade Row' AND primary_muscles IS DISTINCT FROM ARRAY['latissimo','romboides','core']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['core','reto_abdominal','gluteo']::text[]
WHERE left(id::text,8) = '5623fbd8' AND name = 'RKC Plank' AND primary_muscles IS DISTINCT FROM ARRAY['core','reto_abdominal','gluteo']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['serratil','trapezio_inferior']::text[]
WHERE left(id::text,8) = 'df52afab' AND name = 'Serrátil Ativação (deslizamento na parede)' AND primary_muscles IS DISTINCT FROM ARRAY['serratil','trapezio_inferior']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['obliquo','latissimo','core']::text[]
WHERE left(id::text,8) = 'bbcec195' AND name = 'Side Plank com Remo' AND primary_muscles IS DISTINCT FROM ARRAY['obliquo','latissimo','core']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['deltoide','triceps','core']::text[]
WHERE left(id::text,8) = 'f7462b46' AND name = 'Single Arm Overhead Press' AND primary_muscles IS DISTINCT FROM ARRAY['deltoide','triceps','core']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['manguito','capsula_posterior']::text[]
WHERE left(id::text,8) = '0c07ecf8' AND name = 'Sleeper Alongamento' AND primary_muscles IS DISTINCT FROM ARRAY['manguito','capsula_posterior']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['core','obliquo','estabilizadores']::text[]
WHERE left(id::text,8) = '6468ef2d' AND name = 'Stir The Pot' AND primary_muscles IS DISTINCT FROM ARRAY['core','obliquo','estabilizadores']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['peitoral_inferior','triceps']::text[]
WHERE left(id::text,8) = '0bb4aad2' AND name = 'Supino declinado com halteres' AND primary_muscles IS DISTINCT FROM ARRAY['peitoral_inferior','triceps']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['peitoral','triceps','deltoide_anterior']::text[]
WHERE left(id::text,8) = '199b3191' AND name = 'Supino reto com halteres' AND primary_muscles IS DISTINCT FROM ARRAY['peitoral','triceps','deltoide_anterior']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['peitoral','triceps','core']::text[]
WHERE left(id::text,8) = 'cfc087cc' AND name = 'Supino unilateral halter' AND primary_muscles IS DISTINCT FROM ARRAY['peitoral','triceps','core']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['obliquo','core','isquiotibial']::text[]
WHERE left(id::text,8) = 'bf044356' AND name = 'Windmill com kettlebell em pé' AND primary_muscles IS DISTINCT FROM ARRAY['obliquo','core','isquiotibial']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['obliquo','core','isquiotibial']::text[]
WHERE left(id::text,8) = 'f2eb2e28' AND name = 'Windmill kettlebell' AND primary_muscles IS DISTINCT FROM ARRAY['obliquo','core','isquiotibial']::text[];
UPDATE public.exercises_library SET primary_muscles = ARRAY['core','biceps','quadriceps']::text[]
WHERE left(id::text,8) = 'b7357bd2' AND name = 'Zercher Carry' AND primary_muscles IS DISTINCT FROM ARRAY['core','biceps','quadriceps']::text[];
