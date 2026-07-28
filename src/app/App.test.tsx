import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { LOCAL_STORAGE_KEY } from '../features/preferences/model/local-state';
import { resetStorageProbeForTests } from '../shared/lib/safe-storage';
import type { Grumble } from '../shared/domain/grumble';

/**
 * Integration tests for the composed application shell.
 *
 * The API is stubbed at the `fetch` boundary so the whole real stack — hook, reducer,
 * storage, components — is exercised end to end.
 */

function serverGrumble(overrides: Partial<Grumble> = {}): Grumble {
  return {
    id: 'srv-1',
    text: 'Your calendar is the crime scene.',
    tone: 'dry',
    createdAt: '2026-07-28T10:00:00.000Z',
    favorite: false,
    ...overrides,
  };
}

/** The stage region, scoped so assertions ignore the identical text in the history log. */
function stage() {
  return screen.getByRole('region', { name: /current grumble/i });
}

/** Narrows a fetch `BodyInit` to the JSON string these tests always send. */
function asBodyString(body: BodyInit | null | undefined): string {
  return typeof body === 'string' ? body : '';
}

function mockFetchOnce(body: Grumble) {
  vi.mocked(fetch).mockResolvedValue(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

beforeEach(() => {
  localStorage.clear();
  resetStorageProbeForTests();
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('renders the hero and the empty stage', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Motivation,');
    expect(screen.getByText('No opinion yet. A rare moment of peace.')).toBeInTheDocument();
  });

  it('shows private mode when Supabase is not configured', () => {
    render(<App />);
    expect(screen.getByText('Private mode')).toBeInTheDocument();
  });

  it('generates a grumble and displays it', async () => {
    const user = userEvent.setup();
    mockFetchOnce(serverGrumble());
    render(<App />);

    await user.click(screen.getByRole('button', { name: /make him grumble/i }));

    await waitFor(() =>
      expect(within(stage()).getByText(/Your calendar is the crime scene\./)).toBeInTheDocument(),
    );
  });

  it('submits the typed prompt and clears the field', async () => {
    const user = userEvent.setup();
    mockFetchOnce(serverGrumble());
    render(<App />);

    const input = screen.getByLabelText('Optional context');
    await user.type(input, 'avoiding my taxes');
    await user.click(screen.getByRole('button', { name: /make him grumble/i }));

    await waitFor(() => expect(within(stage()).getByText(/crime scene/)).toBeInTheDocument());
    expect(input).toHaveValue('');

    const [, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(JSON.parse(asBodyString(init?.body))).toMatchObject({ prompt: 'avoiding my taxes' });
  });

  it('generates when Enter is pressed in the composer', async () => {
    const user = userEvent.setup();
    mockFetchOnce(serverGrumble());
    render(<App />);

    await user.type(screen.getByLabelText('Optional context'), 'hurry up{Enter}');
    await waitFor(() => expect(within(stage()).getByText(/crime scene/)).toBeInTheDocument());
  });

  it('adds the grumble to the history log', async () => {
    const user = userEvent.setup();
    mockFetchOnce(serverGrumble());
    render(<App />);

    await user.click(screen.getByRole('button', { name: /make him grumble/i }));
    const log = screen.getByRole('region', { name: /grumble log/i });
    await waitFor(() => expect(within(log).getByText(/crime scene/)).toBeInTheDocument());
  });

  it('toggles a favorite', async () => {
    const user = userEvent.setup();
    mockFetchOnce(serverGrumble());
    render(<App />);

    await user.click(screen.getByRole('button', { name: /make him grumble/i }));
    await waitFor(() => expect(within(stage()).getByText(/crime scene/)).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Favorite' }));
    expect(await screen.findByRole('button', { name: 'Remove favorite' })).toBeInTheDocument();
  });

  it('changes the tone preference and sends it to the API', async () => {
    const user = userEvent.setup();
    mockFetchOnce(serverGrumble({ tone: 'brutal' }));
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'brutal' }));
    expect(screen.getByRole('button', { name: 'brutal' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: /make him grumble/i }));
    await waitFor(() => expect(fetch).toHaveBeenCalled());

    const [, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(JSON.parse(asBodyString(init?.body))).toMatchObject({ tone: 'brutal' });
  });

  it('clears local history', async () => {
    const user = userEvent.setup();
    mockFetchOnce(serverGrumble());
    render(<App />);

    await user.click(screen.getByRole('button', { name: /make him grumble/i }));
    await waitFor(() => expect(within(stage()).getByText(/crime scene/)).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /clear local history/i }));
    expect(screen.getByText('No opinion yet. A rare moment of peace.')).toBeInTheDocument();
  });

  it('falls back to a local grumble when the network fails', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'));
    render(<App />);

    await user.click(screen.getByRole('button', { name: /make him grumble/i }));

    await waitFor(() => {
      expect(screen.queryByText('No opinion yet. A rare moment of peace.')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /make him grumble/i })).toBeEnabled();
  });

  /** Regression: corrupt persisted state used to render a blank page. */
  it('mounts with corrupt persisted state instead of crashing', () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({ history: null }));
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('restores a persisted grumble on load', () => {
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({
        history: [serverGrumble({ id: 'old', text: 'A restored grumble.' })],
        preferences: { tone: 'dry', autoplay: false, reducedMotion: false },
      }),
    );
    render(<App />);
    expect(within(stage()).getByText(/A restored grumble\./)).toBeInTheDocument();
  });

  it('applies the reduced-motion class when enabled', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('checkbox', { name: /reduce motion/i }));
    expect(document.querySelector('main')).toHaveClass('reduce-motion');
  });

  it('opens the lazily-loaded auth dialog', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  /** The brand link must respect the GitHub Pages base path, not a bare "/". */
  it('points the brand link at the configured base path', () => {
    render(<App />);
    const brand = screen.getByRole('link', { name: /grumpy/i });
    expect(brand.getAttribute('href')).toBe(import.meta.env.BASE_URL);
  });
});
