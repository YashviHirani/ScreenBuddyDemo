import React from 'react';

interface GoalInputProps {
  goal: string;
  setGoal: (goal: string) => void;
  disabled: boolean;
}

export const GoalInput: React.FC<GoalInputProps> = ({ goal, setGoal, disabled }) => {
  return (
    <div className="w-full mb-6">
      <label htmlFor="goal" className="block text-sm font-medium text-gray-400 mb-2">
        What is your End Goal for this session?
      </label>
      <div className="relative">
        <input
          type="text"
          id="goal"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          disabled={disabled}
          placeholder="e.g. Create a YouTube video, Debug React App, Write a blog post..."
          className={`w-full bg-gray-900 border ${disabled ? 'border-gray-800 text-gray-500' : 'border-gray-700 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'} rounded-lg py-3 px-4 shadow-sm transition-all duration-200 placeholder-gray-600 text-base`}
        />
        {disabled && goal && (
          <div className="absolute right-3 top-3.5">
            <svg className="w-5 h-5 text-green-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Screen Buddy will use this to keep you on track and flag distractions.
      </p>
    </div>
  );
};