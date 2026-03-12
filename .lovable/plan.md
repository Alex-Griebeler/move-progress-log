

## Fix: EditExerciseLibraryDialog scroll and save button visibility

**Problem**: The save button ("Salvar Alteracoes") is inside the `ScrollArea` at line 517-525, meaning users must scroll through a very long form (530+ lines of fields) to reach it. Radix `ScrollArea` can also clip content, making the button unreachable.

**Solution**: Move the submit button outside the `ScrollArea` so it's always visible as a sticky footer at the bottom of the dialog. Use `overflow-y-auto` instead of Radix `ScrollArea` for more reliable native scrolling.

### Changes — `src/components/EditExerciseLibraryDialog.tsx`

1. Replace `ScrollArea` with a native scrollable `div` (`overflow-y-auto`) for the form body — more reliable scrolling across devices
2. Move the "Salvar Alteracoes" button outside the scrollable area into a fixed footer section with a top border
3. Keep the `form` id approach so the external button can still submit the form via `form="edit-exercise-form"`

```text
DialogContent (max-w-2xl max-h-[90vh] flex flex-col)
├── DialogHeader (fixed)
├── div.overflow-y-auto.flex-1 (scrollable form body)
│   └── form#edit-exercise-form (all fields)
└── div.pt-4.border-t (fixed footer, always visible)
    └── Button[type=submit][form=edit-exercise-form]
```

Single file change, no backend/security impact.

