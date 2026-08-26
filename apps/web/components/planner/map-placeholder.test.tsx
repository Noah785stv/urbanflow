import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MapPlaceholder } from './map-placeholder';

describe('MapPlaceholder', () => {
  it('appelle `onShow` au clic comme au clavier (§C5)', async () => {
    const onShow = vi.fn();
    const user = userEvent.setup();
    render(<MapPlaceholder onShow={onShow} />);

    const button = screen.getByRole('button', { name: 'Afficher la carte' });
    await user.click(button);
    expect(onShow).toHaveBeenCalledTimes(1);

    button.focus();
    await user.keyboard('{Enter}');
    expect(onShow).toHaveBeenCalledTimes(2);
  });
});
