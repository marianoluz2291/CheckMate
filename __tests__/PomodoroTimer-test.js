import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import PomodoroTimer from '../screens/PomodoroTimer';

jest.useFakeTimers();

describe('PomodoroTimer Component', () => {
  const mockTask = {
    id: 1,
    title: 'Test Task',
    pomodoros: 0,
  };
  const mockOnPomodoroComplete = jest.fn();
  const mockOnUpdateTask = jest.fn();

  it('renders correctly with the initial state', () => {
    const { getByText } = render(
      <PomodoroTimer
        task={mockTask}
        onPomodoroComplete={mockOnPomodoroComplete}
        onUpdateTask={mockOnUpdateTask}
        theme="light"
      />
    );

    expect(getByText('Test Task')).toBeTruthy();
    expect(getByText('🍅 0 pomodoros completed')).toBeTruthy();
    expect(getByText('25:00')).toBeTruthy();
    expect(getByText('Focus Time')).toBeTruthy();
  });

  it('toggles the timer on Start/Pause button press', () => {
    const { getByText } = render(
      <PomodoroTimer
        task={mockTask}
        onPomodoroComplete={mockOnPomodoroComplete}
        onUpdateTask={mockOnUpdateTask}
        theme="light"
      />
    );

    const startButton = getByText('Start');

    // Start the timer
    fireEvent.press(startButton);
    expect(getByText('Pause')).toBeTruthy();

    // Pause the timer
    fireEvent.press(getByText('Pause'));
    expect(getByText('Start')).toBeTruthy();
  });

  it('resets the timer on Reset button press', () => {
    const { getByText } = render(
      <PomodoroTimer
        task={mockTask}
        onPomodoroComplete={mockOnPomodoroComplete}
        onUpdateTask={mockOnUpdateTask}
        theme="light"
      />
    );

    const startButton = getByText('Start');
    const resetButton = getByText('Reset');

    // Start the timer
    fireEvent.press(startButton);

    // Simulate 5 seconds of timer running
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(getByText('24:55')).toBeTruthy();

    // Reset the timer
    fireEvent.press(resetButton);
    expect(getByText('25:00')).toBeTruthy();
    expect(getByText('Start')).toBeTruthy();
  });

  it('calls onPomodoroComplete when a session is completed', () => {
    const { getByText } = render(
      <PomodoroTimer
        task={mockTask}
        onPomodoroComplete={mockOnPomodoroComplete}
        onUpdateTask={mockOnUpdateTask}
        theme="light"
      />
    );

    const startButton = getByText('Start');

    // Start the timer
    fireEvent.press(startButton);

    // Simulate the completion of a work session (25 minutes)
    act(() => {
      jest.advanceTimersByTime(25 * 60 * 1000);
    });

    expect(mockOnPomodoroComplete).toHaveBeenCalledWith(mockTask.id, true);
    expect(mockOnUpdateTask).toHaveBeenCalledWith(mockTask.id, { pomodoros: 1 });
  });
});