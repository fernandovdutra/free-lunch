import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

import { TagInput } from '../TagInput';

/**
 * Controlled wrapper mirroring how TransactionForm drives TagInput: the parent
 * owns the tag array (there it comes from the optimistically patched
 * transaction) and re-renders with the next value.
 */
function Harness({
  initialTags = [],
  suggestions = [],
  onChange,
}: {
  initialTags?: string[];
  suggestions?: string[];
  onChange?: (next: string[]) => void;
}) {
  const [tags, setTags] = useState<string[]>(initialTags);
  return (
    <TagInput
      tags={tags}
      suggestions={suggestions}
      onChange={(next) => {
        onChange?.(next);
        setTags(next);
      }}
    />
  );
}

function typeInInput(value: string) {
  fireEvent.change(screen.getByLabelText('Add tag'), { target: { value } });
}

function draftValue() {
  return screen.getByLabelText<HTMLInputElement>('Add tag').value;
}

function pressEnter() {
  fireEvent.keyDown(screen.getByLabelText('Add tag'), { key: 'Enter' });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('TagInput', () => {
  it('renders the current tags as chips', () => {
    render(<Harness initialTags={['work', 'trip']} />);
    expect(screen.getByText('work')).toBeDefined();
    expect(screen.getByText('trip')).toBeDefined();
  });

  it('adds a tag on Enter', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    typeInInput('work');
    pressEnter();

    expect(onChange).toHaveBeenCalledWith(['work']);
    expect(screen.getByText('work')).toBeDefined();
    // Draft is cleared after committing.
    expect(draftValue()).toBe('');
  });

  it('adds a tag when comma is pressed', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    typeInInput('trip');
    fireEvent.keyDown(screen.getByLabelText('Add tag'), { key: ',' });

    expect(onChange).toHaveBeenCalledWith(['trip']);
  });

  it('commits everything before a typed/pasted comma and keeps the remainder as draft', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    typeInInput('work,trip,lun');

    expect(onChange).toHaveBeenCalledWith(['work', 'trip']);
    expect(draftValue()).toBe('lun');
  });

  it('normalizes: trims whitespace before storing', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    typeInInput('   work   ');
    pressEnter();

    expect(onChange).toHaveBeenCalledWith(['work']);
  });

  it('ignores a whitespace-only draft', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    typeInInput('    ');
    pressEnter();

    expect(onChange).not.toHaveBeenCalled();
  });

  it('dedupes: re-adding an existing tag is a silent no-op', () => {
    const onChange = vi.fn();
    render(<Harness initialTags={['work']} onChange={onChange} />);

    typeInInput(' work ');
    pressEnter();

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getAllByText('work')).toHaveLength(1);
  });

  it('keeps casing distinct (case-sensitive, like the MCP write path)', () => {
    const onChange = vi.fn();
    render(<Harness initialTags={['work']} onChange={onChange} />);

    typeInInput('Work');
    pressEnter();

    expect(onChange).toHaveBeenCalledWith(['work', 'Work']);
  });

  it('removes a tag via its chip button', () => {
    const onChange = vi.fn();
    render(<Harness initialTags={['work', 'trip']} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText('Remove tag work'));

    expect(onChange).toHaveBeenCalledWith(['trip']);
    expect(screen.queryByText('work')).toBeNull();
  });

  it('removes the last tag on Backspace with an empty draft', () => {
    const onChange = vi.fn();
    render(<Harness initialTags={['work', 'trip']} onChange={onChange} />);

    fireEvent.keyDown(screen.getByLabelText('Add tag'), { key: 'Backspace' });

    expect(onChange).toHaveBeenCalledWith(['work']);
  });

  it('does not remove a tag on Backspace while a draft is being typed', () => {
    const onChange = vi.fn();
    render(<Harness initialTags={['work']} onChange={onChange} />);

    typeInInput('tr');
    fireEvent.keyDown(screen.getByLabelText('Add tag'), { key: 'Backspace' });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('offers suggestions that are not already applied, and adds one on tap', () => {
    const onChange = vi.fn();
    render(<Harness initialTags={['work']} suggestions={['work', 'trip']} onChange={onChange} />);

    // 'work' is already applied, so only 'trip' is suggested.
    expect(screen.queryByText('+ work')).toBeNull();
    fireEvent.click(screen.getByText('+ trip'));

    expect(onChange).toHaveBeenCalledWith(['work', 'trip']);
  });

  it('filters suggestions by the draft, case-insensitively', () => {
    render(<Harness suggestions={['work', 'trip', 'lunch']} />);

    typeInInput('TR');

    expect(screen.getByText('+ trip')).toBeDefined();
    expect(screen.queryByText('+ work')).toBeNull();
    expect(screen.queryByText('+ lunch')).toBeNull();
  });
});
