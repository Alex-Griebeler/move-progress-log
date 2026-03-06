-- Rename position → stability_position
ALTER TABLE exercises_library RENAME COLUMN position TO stability_position;

-- Migrate old position values to new stability_position values
UPDATE exercises_library SET stability_position = 'em_pe_bilateral' WHERE stability_position = 'em_pe';

-- Correct laterality values
UPDATE exercises_library SET laterality = 'alternada' WHERE laterality = 'alternado';
UPDATE exercises_library SET stability_position = 'em_pe_assimetrica' WHERE laterality = 'base_assimetrica';
UPDATE exercises_library SET laterality = NULL WHERE laterality = 'base_assimetrica';