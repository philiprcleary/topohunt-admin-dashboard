import { useEffect, useRef, useState, type ReactNode } from 'react';

const ANIMATION_MS = 300;

interface MapSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onClosed?: () => void;
  title: ReactNode;
  children: ReactNode;
}

export default function MapSidebar({ isOpen, onClose, onClosed, title, children }: MapSidebarProps) {
  const [mounted, setMounted] = useState(isOpen);
  const [visible, setVisible] = useState(false);
  const onClosedRef = useRef(onClosed);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onClosedRef.current = onClosed;
  }, [onClosed]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      return;
    }

    setVisible(false);
    const timer = setTimeout(() => {
      setMounted(false);
      onClosedRef.current?.();
    }, ANIMATION_MS);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!mounted || !isOpen) {
      return;
    }

    setVisible(false);

    let openFrame = 0;
    const mountFrame = requestAnimationFrame(() => {
      openFrame = requestAnimationFrame(() => {
        setVisible(true);
      });
    });

    return () => {
      cancelAnimationFrame(mountFrame);
      cancelAnimationFrame(openFrame);
    };
  }, [mounted, isOpen]);

  if (!mounted) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        className={`map-sidebar-backdrop${visible ? ' map-sidebar-backdrop--visible' : ''}`}
        aria-label="Close map"
        onClick={onClose}
      />
      <aside className={`map-sidebar${visible ? ' map-sidebar--open' : ''}`}>
        <div className="map-sidebar-header">
          {typeof title === 'string' ? <h3>{title}</h3> : title}
          <button
            type="button"
            className="map-sidebar-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="map-sidebar-body">{children}</div>
      </aside>
    </>
  );
}
