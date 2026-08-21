import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StickyCartBar } from './sticky-cart-bar';

describe('StickyCartBar', () => {
  it('hides for an empty cart', () => {
    render(<StickyCartBar itemCount={0} total={0} onOpen={vi.fn()} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
