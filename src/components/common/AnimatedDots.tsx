import React, { useEffect, useState } from 'react';

interface AnimatedDotsProps {
  value: string;
  length: number;
}

const AnimatedDots: React.FC<AnimatedDotsProps> = ({ value, length }) => {
  const [colors, setColors] = useState<string[]>([]);

  useEffect(() => {
    const gradients = [
      'bg-gradient-to-br from-orange-300 via-orange-500 to-red-600',
      'bg-gradient-to-br from-yellow-200 via-yellow-400 to-orange-500',
      'bg-gradient-to-br from-green-300 via-green-500 to-emerald-700',
      'bg-gradient-to-br from-blue-400 to-indigo-600',
      'bg-gradient-to-br from-purple-400 to-indigo-600',
      'bg-gradient-to-br from-teal-400 to-blue-600',
      'bg-gradient-to-br from-red-400 to-orange-600',
      'bg-gradient-to-br from-indigo-400 to-purple-600',
    ];

    const colorCounts: Record<string, number> = {};
    const newColors: string[] = [];

    for (let i = 0; i < length; i++) {
      let availableGradients = gradients.filter((gradient) => (colorCounts[gradient] || 0) < 2);
      if (availableGradients.length === 0) {
        availableGradients = gradients;
      }
      const randomGradient =
        availableGradients[Math.floor(Math.random() * availableGradients.length)];
      newColors.push(randomGradient);
      colorCounts[randomGradient] = (colorCounts[randomGradient] || 0) + 1;
    }

    setColors(newColors);
  }, [length]);

  return (
    <div className="flex justify-center space-x-3">
      {Array.from({ length }).map((_, index) => (
        <div
          key={index}
          className={`w-6 h-6 rounded-full transition-all duration-150 ${
            index < value.length ? colors[index] : 'bg-gray-600'
          }`}
        />
      ))}
    </div>
  );
};

export default AnimatedDots;
