import React, { useState, useRef, JSX } from 'react';
import { styled } from '@mui/material/styles';
import { Theme } from '@mui/material';

const EditorContainer = styled('div')(({ theme }: { theme: Theme }) => ({
  border: `1px solid ${theme.palette.divider}`,
  padding: theme.spacing(1),
  minHeight: '24px',
  lineHeight: '24px',
  outline: 'none',
  borderRadius: theme.shape.borderRadius,
  '&:focus': {
    borderColor: theme.palette.primary.main,
  }
}));

const Tag = styled('span')(({ theme }: { theme: Theme }) => ({
  backgroundColor: theme.palette.primary.light || '#e8f0fe',
  borderRadius: theme.shape.borderRadius,
  padding: '2px 4px',
  margin: '0 2px',
  color: theme.palette.primary.main,
  fontFamily: theme.typography.fontFamily,
}));

interface CustomInputProps {
  onChange?: (value: string) => void;
}

const CustomInput: React.FC<CustomInputProps> = ({ onChange }) => {
  const [content, setContent] = useState<(string | JSX.Element)[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const selection = window.getSelection();
    if (!selection) return;

    const range = selection.getRangeAt(0);
    const text = (e.target as HTMLDivElement).textContent || '';

    if (text.includes('<') && text.includes('>')) {
      const parts = text.split(/(<[^>]+>)/g);
      const newContent = parts.map((part, index) => {
        if (part.startsWith('<') && part.endsWith('>')) {
          return (
            <Tag key={index}>
              {part}
            </Tag>
          );
        }
        return part;
      });
      setContent(newContent);
      onChange?.(text);
    } else {
      setContent([text]);
      onChange?.(text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Backspace') {
      const selection = window.getSelection();
      if (!selection) return;

      const range = selection.getRangeAt(0);
      const node = range.startContainer;
      
      if (node.parentElement?.tagName === 'SPAN' && range.startOffset === 0) {
        e.preventDefault();
        node.parentElement.remove();
      }
    }
  };

  return (
    <EditorContainer
      ref={editorRef}
      contentEditable
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      suppressContentEditableWarning
    />
  );
};

export default CustomInput;