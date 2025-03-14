import React, { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { autocompletion } from '@codemirror/autocomplete';
import { defaultKeymap } from '@codemirror/commands';
import { defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
import styled from 'styled-components';
import { useFormulaStore } from '../../stores/formulaStore';
import { Decoration, DecorationSet, EditorView, keymap, WidgetType } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { useQuery } from '@tanstack/react-query';

const EditorContainer = styled.div`
  .cm-editor {
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 8px;
  }
  
  .cm-tag {
    background: #e8f0fe;
    border-radius: 3px;
    padding: 2px 4px;
    margin: 0 2px;
  }
`;

const findTagAtCursor = (state: EditorState, pos: number) => {
  const text = state.doc.toString();
  const tagRegex = /\{\{([^}]+)\}\}/g;
  let match;

  while ((match = tagRegex.exec(text)) !== null) {
    const from = match.index;
    const to = from + match[0].length;
    if (pos >= from && pos <= to) {
      return { from, to };
    }
  }
  return null;
};

const calculateFormula = (formula: string, variables: Record<string, number>) => {
  try {
    // Replace all {{variable}} with their values
    let calculableFormula = formula.replace(/\{\{([^}]+)\}\}/g, (_match, variable) => {
      return (variables[variable] ?? 0).toString();
    });
    // Use Function to safely evaluate the mathematical expression
    return new Function(`return ${calculableFormula}`)();
  } catch (error) {
    console.error('Error calculating formula:', error);
    return 0;
  }
};

const createTagHandler = keymap.of([{
  key: 'Backspace',
  run: (view) => {
    const pos = view.state.selection.main.head;
    const tag = findTagAtCursor(view.state, pos);
    
    if (tag) {
      view.dispatch({
        changes: { from: tag.from, to: tag.to, insert: '' }
      });
      return true;
    }
    return false;
  }
}]);

const createTagExtension = () => {
  return [
    EditorView.decorations.compute(['doc'], state => {
      const builder = new RangeSetBuilder<Decoration>();
      const text = state.doc.toString();
      const tagRegex = /\{\{([^}]+)\}\}/g;
      let match;

      while ((match = tagRegex.exec(text)) !== null) {
        const from = match.index;
        const to = from + match[0].length;
        const tagContent = match[1]; // Extract the content between {{}}
        
        builder.add(from, to, Decoration.replace({
          widget: new class extends WidgetType {
            toDOM() {
              const span = document.createElement('span');
              span.className = 'cm-tag';
              span.textContent = tagContent.trim();
              return span;
            }
          }
        }));
      }
      return builder.finish();
    }),
    createTagHandler
  ];
};

interface Suggestion {
  name: string;
  category: string;
  value: string;
  id: string;
}

const createAutocompleteExtension = (getSuggestions: () => Promise<Suggestion[]>) => {
  const operators = ['+', '-', '*', '/', '(', ')', '^'];
  
  return autocompletion({
    activateOnTyping: true,
    override: [async (context) => {
      const word = context.matchBefore(/[\w]+$/);
      if (!word) return null;

      const currentWord = word.text;
      
      if (operators.includes(currentWord) || /^\d+$/.test(currentWord)) {
        return null;
      }

      try {
        const suggestions = await getSuggestions();
        
        return {
          from: word.from,
          options: suggestions.map(item => ({
            label: item.name,
            type: item.category,
            apply: `{{${item.name}}}`,
            detail: item.category
          }))
        };
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
        return null;
      }
    }]
  });
};

export const FormulaEditor: React.FC = () => {
  const editorRef = useRef<HTMLDivElement>(null);
  const { setFormula } = useFormulaStore();
  const viewRef = useRef<EditorView | null>(null);

  const { data: suggestions = [] } = useQuery<Suggestion[]>({
    queryKey: ['suggestions'],
    queryFn: async () => {
      const response = await fetch('https://652f91320b8d8ddac0b2b62b.mockapi.io/autocomplete');
      return response.json();
    }
  });

  const createVariableMap = (suggestions: Suggestion[]) => {
    return suggestions.reduce((acc, item) => {
      acc[item.name] = parseFloat(item.value) || 0;
      return acc;
    }, {} as Record<string, number>);
  };

  const handleBlur = () => {
    if (viewRef.current) {
      const formula = viewRef.current.state.doc.toString();
      const variables = createVariableMap(suggestions);
      const result = calculateFormula(formula, variables);
      console.log('Calculation result:', result);
    }
  };

  useEffect(() => {
    if (!editorRef.current) return;

    const startState = EditorState.create({
      doc: '',
      extensions: [
        syntaxHighlighting(defaultHighlightStyle),
        EditorView.lineWrapping,
        EditorView.theme({}),
        createAutocompleteExtension(async () => suggestions),
        ...createTagExtension(),
        keymap.of(defaultKeymap),
        keymap.of([{
          key: "Enter",
          run: view => {
            const formula = view.state.doc.toString();
            const variables = createVariableMap(suggestions);
            const result = calculateFormula(formula, variables);
            console.log('Calculation result:', result);
            return true;
          }
        }]),
        EditorState.allowMultipleSelections.of(true),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            setFormula(update.state.doc.toString());
          }
        })
      ]
    });

    viewRef.current = new EditorView({
      state: startState,
      parent: editorRef.current
    });

    return () => viewRef.current?.destroy();
  }, [suggestions]); // Added suggestions to dependencies

  return <EditorContainer ref={editorRef} onBlur={handleBlur} />;
};