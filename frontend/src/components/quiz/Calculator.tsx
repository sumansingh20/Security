'use client';

import { useState, useCallback } from 'react';
import { X, Delete, Plus, Minus, Divide, Equal, Percent } from 'lucide-react';
import clsx from 'clsx';

interface CalculatorProps {
  type: 'basic' | 'scientific';
  onClose: () => void;
}

export default function Calculator({ type, onClose }: CalculatorProps) {
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [memory, setMemory] = useState(0);
  const [lastResult, setLastResult] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 100 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Basic operations
  const handleNumber = (num: string) => {
    setDisplay((prev) => {
      if (prev === '0' || prev === 'Error') return num;
      return prev + num;
    });
  };

  const handleDecimal = () => {
    if (!display.includes('.')) {
      setDisplay((prev) => prev + '.');
    }
  };

  const handleOperator = (op: string) => {
    setExpression(display + ' ' + op + ' ');
    setLastResult(parseFloat(display));
    setDisplay('0');
  };

  const handleClear = () => {
    setDisplay('0');
    setExpression('');
    setLastResult(null);
  };

  const handleBackspace = () => {
    setDisplay((prev) => {
      if (prev.length === 1 || prev === 'Error') return '0';
      return prev.slice(0, -1);
    });
  };

  const handleEquals = () => {
    try {
      // Build full expression
      const fullExpr = expression + display;
      // Safe evaluation (replace × and ÷ with * and /)
      const safeExpr = fullExpr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/\^/g, '**');
      
      // eslint-disable-next-line no-eval
      const result = eval(safeExpr);
      
      if (isNaN(result) || !isFinite(result)) {
        setDisplay('Error');
      } else {
        setDisplay(String(parseFloat(result.toFixed(10))));
      }
      setExpression('');
      setLastResult(result);
    } catch {
      setDisplay('Error');
      setExpression('');
    }
  };

  const handlePercent = () => {
    const current = parseFloat(display);
    setDisplay(String(current / 100));
  };

  const handlePlusMinus = () => {
    setDisplay((prev) => {
      const num = parseFloat(prev);
      return String(-num);
    });
  };

  // Scientific operations
  const handleScientific = (func: string) => {
    try {
      const current = parseFloat(display);
      let result: number;

      switch (func) {
        case 'sin':
          result = Math.sin(current * (Math.PI / 180)); // Degrees
          break;
        case 'cos':
          result = Math.cos(current * (Math.PI / 180));
          break;
        case 'tan':
          result = Math.tan(current * (Math.PI / 180));
          break;
        case 'log':
          result = Math.log10(current);
          break;
        case 'ln':
          result = Math.log(current);
          break;
        case 'sqrt':
          result = Math.sqrt(current);
          break;
        case 'square':
          result = current * current;
          break;
        case 'cube':
          result = current * current * current;
          break;
        case 'inv':
          result = 1 / current;
          break;
        case 'exp':
          result = Math.exp(current);
          break;
        case 'abs':
          result = Math.abs(current);
          break;
        case 'fact':
          result = factorial(current);
          break;
        case 'pi':
          result = Math.PI;
          break;
        case 'e':
          result = Math.E;
          break;
        default:
          result = current;
      }

      if (isNaN(result) || !isFinite(result)) {
        setDisplay('Error');
      } else {
        setDisplay(String(parseFloat(result.toFixed(10))));
      }
    } catch {
      setDisplay('Error');
    }
  };

  const factorial = (n: number): number => {
    if (n < 0) return NaN;
    if (n === 0 || n === 1) return 1;
    if (n > 170) return Infinity;
    let result = 1;
    for (let i = 2; i <= Math.floor(n); i++) {
      result *= i;
    }
    return result;
  };

  // Memory operations
  const handleMemory = (action: string) => {
    switch (action) {
      case 'MC':
        setMemory(0);
        break;
      case 'MR':
        setDisplay(String(memory));
        break;
      case 'M+':
        setMemory((prev) => prev + parseFloat(display));
        break;
      case 'M-':
        setMemory((prev) => prev - parseFloat(display));
        break;
    }
  };

  // Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.calc-body')) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    },
    [isDragging, dragOffset]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add event listeners for dragging
  useState(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  });

  const buttonClass = 'p-3 text-center font-medium rounded-lg transition-all hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95';
  const operatorClass = 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800';
  const scientificClass = 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-300 text-xs';

  return (
    <div
      className="fixed z-50 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
      style={{ left: position.x, top: position.y }}
    >
      {/* Header - Draggable */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 cursor-move border-b border-gray-100 dark:border-gray-700"
        onMouseDown={handleMouseDown}
      >
        <span className="font-semibold text-gray-900 dark:text-white">
          Calculator {type === 'scientific' ? '(Scientific)' : ''}
        </span>
        <button
          onClick={onClose}
          className="p-1.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Calculator Body */}
      <div className="calc-body p-4" style={{ width: type === 'scientific' ? '320px' : '260px' }}>
        {/* Display */}
        <div className="mb-4">
          {expression && (
            <div className="text-right text-sm text-gray-500 dark:text-gray-400 h-5 overflow-hidden">
              {expression}
            </div>
          )}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3 text-right text-2xl font-mono text-gray-900 dark:text-white overflow-x-auto tabular-nums">
            {display}
          </div>
          {memory !== 0 && (
            <div className="text-right text-xs text-gray-500 dark:text-gray-400 mt-1">M = {memory}</div>
          )}
        </div>

        {/* Scientific Functions */}
        {type === 'scientific' && (
          <div className="grid grid-cols-5 gap-1.5 mb-3">
            <button className={clsx(buttonClass, scientificClass)} onClick={() => handleScientific('sin')}>sin</button>
            <button className={clsx(buttonClass, scientificClass)} onClick={() => handleScientific('cos')}>cos</button>
            <button className={clsx(buttonClass, scientificClass)} onClick={() => handleScientific('tan')}>tan</button>
            <button className={clsx(buttonClass, scientificClass)} onClick={() => handleScientific('log')}>log</button>
            <button className={clsx(buttonClass, scientificClass)} onClick={() => handleScientific('ln')}>ln</button>
            
            <button className={clsx(buttonClass, scientificClass)} onClick={() => handleScientific('sqrt')}>√</button>
            <button className={clsx(buttonClass, scientificClass)} onClick={() => handleScientific('square')}>x²</button>
            <button className={clsx(buttonClass, scientificClass)} onClick={() => handleScientific('cube')}>x³</button>
            <button className={clsx(buttonClass, scientificClass)} onClick={() => handleOperator('^')}>xʸ</button>
            <button className={clsx(buttonClass, scientificClass)} onClick={() => handleScientific('inv')}>1/x</button>
            
            <button className={clsx(buttonClass, scientificClass)} onClick={() => handleScientific('exp')}>eˣ</button>
            <button className={clsx(buttonClass, scientificClass)} onClick={() => handleScientific('pi')}>π</button>
            <button className={clsx(buttonClass, scientificClass)} onClick={() => handleScientific('e')}>e</button>
            <button className={clsx(buttonClass, scientificClass)} onClick={() => handleScientific('abs')}>|x|</button>
            <button className={clsx(buttonClass, scientificClass)} onClick={() => handleScientific('fact')}>n!</button>
          </div>
        )}

        {/* Memory Row */}
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          <button className={clsx(buttonClass, 'bg-gray-50 dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-400')} onClick={() => handleMemory('MC')}>MC</button>
          <button className={clsx(buttonClass, 'bg-gray-50 dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-400')} onClick={() => handleMemory('MR')}>MR</button>
          <button className={clsx(buttonClass, 'bg-gray-50 dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-400')} onClick={() => handleMemory('M+')}>M+</button>
          <button className={clsx(buttonClass, 'bg-gray-50 dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-400')} onClick={() => handleMemory('M-')}>M-</button>
        </div>

        {/* Main Buttons */}
        <div className="grid grid-cols-4 gap-1.5">
          {/* Row 1 */}
          <button className={clsx(buttonClass, 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300')} onClick={handleClear}>C</button>
          <button className={clsx(buttonClass, 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300')} onClick={handlePlusMinus}>±</button>
          <button className={clsx(buttonClass, 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300')} onClick={handlePercent}>%</button>
          <button className={clsx(buttonClass, operatorClass)} onClick={() => handleOperator('÷')}>÷</button>

          {/* Row 2 */}
          <button className={clsx(buttonClass, 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white')} onClick={() => handleNumber('7')}>7</button>
          <button className={clsx(buttonClass, 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white')} onClick={() => handleNumber('8')}>8</button>
          <button className={clsx(buttonClass, 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white')} onClick={() => handleNumber('9')}>9</button>
          <button className={clsx(buttonClass, operatorClass)} onClick={() => handleOperator('×')}>×</button>

          {/* Row 3 */}
          <button className={clsx(buttonClass, 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white')} onClick={() => handleNumber('4')}>4</button>
          <button className={clsx(buttonClass, 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white')} onClick={() => handleNumber('5')}>5</button>
          <button className={clsx(buttonClass, 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white')} onClick={() => handleNumber('6')}>6</button>
          <button className={clsx(buttonClass, operatorClass)} onClick={() => handleOperator('-')}>−</button>

          {/* Row 4 */}
          <button className={clsx(buttonClass, 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white')} onClick={() => handleNumber('1')}>1</button>
          <button className={clsx(buttonClass, 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white')} onClick={() => handleNumber('2')}>2</button>
          <button className={clsx(buttonClass, 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white')} onClick={() => handleNumber('3')}>3</button>
          <button className={clsx(buttonClass, operatorClass)} onClick={() => handleOperator('+')}>+</button>

          {/* Row 5 */}
          <button className={clsx(buttonClass, 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white col-span-2')} onClick={() => handleNumber('0')}>0</button>
          <button className={clsx(buttonClass, 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white')} onClick={handleDecimal}>.</button>
          <button className={clsx(buttonClass, operatorClass)} onClick={handleEquals}>=</button>
        </div>

        {/* Backspace */}
        <button
          className={clsx(buttonClass, 'w-full mt-3 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 flex items-center justify-center gap-2')}
          onClick={handleBackspace}
        >
          <Delete className="w-4 h-4" />
          Backspace
        </button>
      </div>
    </div>
  );
}
