import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ProductThumbnail } from './product-thumbnail';

describe('ProductThumbnail', () => {
  it('shows a deliberate fallback when a product has no image', () => {
    render(<ProductThumbnail alt="ข้าวผัด" />);

    expect(screen.getByLabelText('ไม่มีรูปสินค้า: ข้าวผัด')).toBeInTheDocument();
  });
});
