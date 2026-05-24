import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '../context/ThemeContext';
import CoachRichMessage from '../components/coach/CoachRichMessage';

const weeklyPlanRich = {
  type: 'weekly_plan',
  data: {
    days: [
      { day: 1, title: 'Easy aerobic run', sessionType: 'easy_run', durationMinutes: 45, distanceKm: 8, rpe: 4 },
      { day: 2, title: 'Rest day', sessionType: 'rest_or_xt', durationMinutes: 0, distanceKm: 0, rpe: 2 },
      { day: 3, title: 'Tempo intervals', sessionType: 'tempo', durationMinutes: 50, distanceKm: 8, rpe: 7 }
    ]
  }
};

function renderRich(richContent) {
  return render(
    <ThemeProvider>
      <CoachRichMessage richContent={richContent} />
    </ThemeProvider>
  );
}

describe('CoachRichMessage', () => {
  it('renders weekly plan list with day titles', () => {
    renderRich(weeklyPlanRich);

    expect(screen.getByTestId('coach-rich-weekly_plan')).toBeInTheDocument();
    expect(screen.getByText('Easy aerobic run')).toBeInTheDocument();
    expect(screen.getByText('Tempo intervals')).toBeInTheDocument();
    expect(screen.getByText(/45 min/)).toBeInTheDocument();
  });

  it('renders report summary headline and phase chip', () => {
    renderRich({
      type: 'report_summary',
      data: {
        headline: 'Solid training block',
        readinessPhase: 'build',
        executiveParagraph: 'Consistent volume with healthy ACWR.',
        injuryRiskLevel: 'low'
      }
    });

    expect(screen.getByTestId('coach-rich-report_summary')).toBeInTheDocument();
    expect(screen.getByText('Solid training block')).toBeInTheDocument();
    expect(screen.getByText('build')).toBeInTheDocument();
  });

  it('returns null for none type', () => {
    const { container } = renderRich({ type: 'none', data: null });
    expect(container).toBeEmptyDOMElement();
  });
});
