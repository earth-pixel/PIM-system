import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Custom Dropdown Filter Component (Apple-inspired design)
 * Strictly locks the menu direction to always open downwards (Drop-down)
 * and uses React Portal + fixed positioning (z-index 9999) to ensure
 * it is NEVER clipped or covered by tables, sticky headers, or sibling stacking contexts.
 */
export default function DropdownFilter({
  value,
  onChange,
  options = [],
  children,
  placeholder = 'เลือก...',
  disabled = false,
  className = '',
  menuClassName = '',
  align = 'left',
  id,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, right: 0, minWidth: 0 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  // Parse items from either `options` prop or `children` (<option> tags)
  const items = React.useMemo(() => {
    if (options && options.length > 0) {
      return options.map(opt => {
        if (typeof opt === 'object' && opt !== null) {
          return {
            value: opt.value !== undefined ? opt.value : '',
            label: opt.label !== undefined ? opt.label : String(opt.value),
          };
        }
        return { value: opt, label: String(opt) };
      });
    }

    if (children) {
      const parsed = [];
      React.Children.forEach(children, child => {
        if (React.isValidElement(child)) {
          parsed.push({
            value: child.props.value !== undefined ? child.props.value : '',
            label: child.props.children || String(child.props.value),
          });
        }
      });
      return parsed;
    }

    return [];
  }, [options, children]);

  // Find currently selected item's label
  const selectedItem = items.find(item => String(item.value) === String(value));
  const displayLabel = selectedItem ? selectedItem.label : placeholder;

  // Function to calculate exact button position on viewport
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    
    // If trigger button is completely scrolled out of view, close dropdown
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      setIsOpen(false);
      return;
    }

    setCoords({
      top: rect.bottom + 6,
      left: rect.left,
      right: rect.right,
      minWidth: Math.max(rect.width, 180),
    });
  }, []);

  // Handle open/close and positioning events
  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleClickOutside = (event) => {
      if (
        triggerRef.current && !triggerRef.current.contains(event.target) &&
        menuRef.current && !menuRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      updatePosition();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleSelect = (val) => {
    setIsOpen(false);
    if (onChange) {
      const syntheticEvent = {
        target: { value: val, name: id },
        currentTarget: { value: val, name: id },
        value: val,
      };
      onChange(syntheticEvent);
    }
  };

  return (
    <div className={`relative inline-block w-full md:w-auto select-none ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`} id={id}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`
          w-full md:w-auto px-3 py-2 bg-[#f5f5f7] hover:bg-[#ececee] border rounded-xl text-xs font-medium
          flex items-center justify-between gap-2.5 transition-all cursor-pointer text-left
          ${isOpen
            ? 'border-[#0071e3] ring-2 ring-[#0071e3]/10 bg-white text-[#1d1d1f]'
            : 'border-[#d2d2d7] text-zinc-700 hover:border-zinc-400'
          }
          ${className}
        `}
      >
        <span className="truncate max-w-[220px]">{displayLabel}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#0071e3]' : ''}`}
        />
      </button>

      {/* Dropdown Menu - Rendered via Portal at document.body with fixed z-[9999] and solid white background */}
      {isOpen && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: align === 'right' ? undefined : `${coords.left}px`,
            right: align === 'right' ? `${Math.max(0, window.innerWidth - coords.right)}px` : undefined,
            minWidth: `${coords.minWidth}px`,
            zIndex: 9999,
            scrollbarWidth: 'thin',
          }}
          className={`
            max-h-64 overflow-y-auto bg-white border border-[#d2d2d7] rounded-2xl
            shadow-[0_16px_40px_rgba(0,0,0,0.18),0_4px_12px_rgba(0,0,0,0.08)]
            p-1.5 animate-scale-in origin-top select-none
            ${menuClassName}
          `}
        >
          <div className="space-y-0.5">
            {items.map((item, idx) => {
              const isSelected = String(item.value) === String(value);
              return (
                <button
                  key={`${item.value}-${idx}`}
                  type="button"
                  onClick={() => handleSelect(item.value)}
                  className={`
                    w-full text-left px-3 py-2 text-xs rounded-xl transition-all cursor-pointer
                    flex items-center justify-between gap-2
                    ${isSelected
                      ? 'bg-[#0071e3]/10 text-[#0071e3] font-bold'
                      : 'text-[#1d1d1f] hover:bg-[#f5f5f7] hover:text-[#0071e3] font-medium'
                    }
                  `}
                >
                  <span className="truncate">{item.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#0071e3] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
