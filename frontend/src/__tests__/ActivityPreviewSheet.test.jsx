import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ActivityPreviewSheet from '../components/ActivityPreviewSheet';
import { ThemeProvider } from '../context/ThemeContext';
import { activitiesApi } from '../services/api';

jest.mock('../services/api', () => ({
  activitiesApi: {
    getActivity: jest.fn(() =>
      Promise.resolve({
        data: { activity: { map: { summary_polyline: '' } } }
      })
    )
  }
}));

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: () => ({
      matches: false,
      media: '',
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn()
    })
  });
});

const sample = {
  _id: 'abc',
  name: 'Evening Run',
  type: 'run',
  distance: 8000,
  duration: 2400,
  pace: 5.0,
  date: new Date().toISOString()
};

describe('ActivityPreviewSheet', () => {
  beforeEach(() => {
    activitiesApi.getActivity.mockResolvedValue({
      data: { activity: { map: { summary_polyline: '' } } }
    });
  });

  it('shows preview stats and open link', async () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <ActivityPreviewSheet activity={sample} open onClose={jest.fn()} />
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(await screen.findByText('Evening Run')).toBeInTheDocument();
    expect(screen.getByText(/8 km/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open full activity/i })).toHaveAttribute(
      'href',
      '/activities/abc'
    );
  });

  it('calls onClose when close pressed', () => {
    const onClose = jest.fn();
    render(
      <ThemeProvider>
        <MemoryRouter>
          <ActivityPreviewSheet activity={sample} open onClose={onClose} />
        </MemoryRouter>
      </ThemeProvider>
    );
    fireEvent.click(screen.getByLabelText('Close preview'));
    expect(onClose).toHaveBeenCalled();
  });
});
