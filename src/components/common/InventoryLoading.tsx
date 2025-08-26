'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Lottie from 'lottie-react';
import catAnimation from '../../../public/Loader cat.json';

const vietnamesePhrases = [
  'Ní đang mò mẫm trong kho tối...',
  'Ní đang đếm từng sợi vải...',
  'Ní đang săn lùng những bộ cánh đẹp...',
  'Ní đang kiểm tra từng góc tủ...',
  'Ní đang phân loại theo màu sắc...',
  'Ní đang tìm kiếm như một thám tử...',
  'Ní đang sắp xếp lại tủ quần áo...',
  'Ní đang kiểm tra chất lượng vải...',
  'Ní đang tìm những món đồ hot...',
  'Ní đang cúng ông địa...',
  'Ní đang xin phép thổ công...',
  'Ní đang khấn vái tổ tiên app đừng hư...',
  'Ní đang cầu may mắn...',
  'Ní đang xin thần linh phù hộ...',
];

const InventoryLoading: React.FC = () => {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(() =>
    Math.floor(Math.random() * vietnamesePhrases.length)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPhraseIndex((prev) => (prev + 1) % vietnamesePhrases.length);
    }, 2500); // Change phrase every 2.5 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {/* Cat Lottie Animation with white background */}
      <div className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 mx-auto mb-8">
        <div className="bg-white rounded-full p-4 shadow-lg">
          <Lottie
            animationData={catAnimation}
            loop={true}
            autoplay={true}
            className="w-full h-full"
          />
        </div>
      </div>

      {/* Animated Vietnamese Phrases with better design */}
      <div className="text-center max-w-lg">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPhraseIndex}
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="text-blue-300 text-xl font-medium tracking-wide"
          >
            {vietnamesePhrases[currentPhraseIndex]}
          </motion.div>
        </AnimatePresence>

        {/* Loading dots with better design */}
        <motion.div
          className="flex justify-center mt-6 space-x-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className="w-3 h-3 bg-blue-400 rounded-full shadow-sm"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.4, 1, 0.4],
                backgroundColor: ['#60a5fa', '#3b82f6', '#60a5fa'],
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: index * 0.2,
                ease: 'easeInOut',
              }}
            />
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default InventoryLoading;
