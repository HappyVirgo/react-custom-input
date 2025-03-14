import React, { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Paper, Popper, MenuItem } from '@mui/material';
import { styled } from '@mui/system';
import { useFormulaStore } from '../../stores/formulaStore';

const InputWrapper = styled(Paper)`
  display: flex;
  flex-wrap: wrap;
  padding: 8px;
  min-height: 48px;
  align-items: center;
  gap: 4px;
`;

const TagElement = styled(Box)`
  background-color: #e3f2fd;
  padding: 4px 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const Input = styled('input')`
  border: none;
  outline: none;
  padding: 4px;
  flex: 1;
  min-width: 100px;
`;

const operators = ['+', '-', '*', '/', '^', '(', ')'];

interface Suggestion {
  name: string;
  category: string;
  value: string | number;
  id: string;
}

export const FormulaInput: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { tags, addTag, removeTag } = useFormulaStore();
  const [result, setResult] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  
  const { data: suggestions, error: queryError } = useQuery<Suggestion[]>({
    queryKey: ['suggestions', inputValue],
    queryFn: async () => {
      if (!inputValue || operators.includes(inputValue)) return [];
      const response = await fetch(`https://652f91320b8d8ddac0b2b62b.mockapi.io/autocomplete?search=${inputValue}`);
      if (!response.ok) {
        throw new Error(`Error ${response.status}: Failed to fetch suggestions`);
      }
      return response.json();
    },
    enabled: !!inputValue && !operators.includes(inputValue) && !/^\d+$/.test(inputValue) && (inputValue !== " "),
    retry: false,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim(); // Remove any spaces
    if (!value) return; // If only spaces were entered, do nothing
    const lastChar = value.slice(-1);

    if (operators.includes(lastChar)) {
      // If there's a number before the operator, convert it to tag first
      if (/^\d+$/.test(value.slice(0, -1))) {
        handleNumberInput(value.slice(0, -1));
      }
      handleOperatorInput(lastChar);
    } else {
      setInputValue(value);
      setAnchorEl(e.currentTarget);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && /^\d+$/.test(inputValue)) {
      handleNumberInput(inputValue);
    } else if (e.key === 'Backspace' && inputValue === '') {
      e.preventDefault();
      const lastTag = tags[tags.length - 1];
      if (lastTag) {
        removeTag(lastTag.id);
      }
    }
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    addTag({
      id: suggestion.id,
      name: suggestion.name,
      value: suggestion.value,
      type: 'variable',
    });
    setInputValue('');
    setAnchorEl(null);
    inputRef.current?.focus();
  };

  const handleOperatorInput = (value: string) => {
    if (operators.includes(value)) {
      addTag({
        id: Math.random().toString(),
        name: null,
        value,
        type: 'operator',
      });
      setInputValue('');
    }
  };

  const handleNumberInput = (value: string) => {
    addTag({
      id: Math.random().toString(),
      name: null,
      value,
      type: 'number',
    });
    setInputValue('');
    setAnchorEl(null); // Close suggestions when adding number tag
  };

  const handleBlur = () => {
    setResult(calculateFormula().toString());
  };

  const calculateFormula = () => {
    // Simple calculation example
    let result = 0;
    try {
      const formula = tags.map(tag => tag.value).join(' ');
      console.log(formula)
      result = eval(formula); // Note: Using eval for simple demo. In production, use a proper formula parser
    } catch (error) {
      console.error('Invalid formula');
      setError('Invalid formula')
    }
    return result;
  };

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      <InputWrapper>
        {tags.map((tag) => (
          <TagElement key={tag.id} sx={{
            backgroundColor: tag.type === 'number' ? '#e8f5e9' : '#e3f2fd'
          }}>
            {tag.type === 'variable' ? tag.name : tag.value}
          </TagElement>
        ))}
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          ref={inputRef}
          onBlur={handleBlur}
          placeholder="Enter formula..."
        />
      </InputWrapper>
      <TagElement sx={{
        backgroundColor: '#e1f5e9'
        }}>
        {result}
      </TagElement>
      {queryError && (
        <Box sx={{ mt: 1, color: 'error.main', fontSize: '0.875rem' }}>
          {error}
        </Box>
      )}

      {!queryError && <Popper open={!!suggestions?.length} anchorEl={anchorEl} placement="bottom-start">
        <Paper sx={{ mt: 1, maxHeight: 200, overflow: 'auto' }}>
          {suggestions?.map((suggestion) => (
            <MenuItem
              key={suggestion.id}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {suggestion.name} ({suggestion.category})
            </MenuItem>
          ))}
        </Paper>
      </Popper>}
    </Box>
  );
};