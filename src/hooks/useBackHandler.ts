import { useEffect, useRef } from 'react';

interface BackHandler {
  id: string;
  onBack: () => void;
}

// Global stack of active back handlers
const activeHandlers: BackHandler[] = [];

/**
 * Registers a back handler to the global stack.
 * Only the top-most handler on the stack is executed when back navigation is triggered.
 */
export function registerBackHandler(id: string, onBack: () => void) {
  const handler = { id, onBack };
  activeHandlers.push(handler);

  return () => {
    const index = activeHandlers.findIndex(h => h.id === id);
    if (index !== -1) {
      activeHandlers.splice(index, 1);
    }
  };
}

/**
 * Centralized, future-proof React hook to register any modal, bottom sheet,
 * drawer, or sub-screen with the application's centralized Back Navigation system.
 * 
 * Works seamlessly with in-app close/back buttons, browser popstate,
 * Android physical/system back button, and Android back swipe gestures.
 * 
 * Usage:
 * useBackHandler(isModalOpen, () => setIsModalOpen(false), 'MyModal');
 */
export function useBackHandler(isOpen: boolean, onClose: () => void, modalName?: string) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const isPushedRef = useRef(false);
  const handlerId = useRef(`handler_${modalName || 'overlay'}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`);

  useEffect(() => {
    if (!isOpen) {
      // If closed in-app (not via popstate), pop the browser history
      if (isPushedRef.current) {
        isPushedRef.current = false;
        if (window.history.state && window.history.state.isModalDummy) {
          window.history.back();
        }
      }
      return;
    }

    // Modal is opened: push a dummy state to capture browser popstate
    const currentId = `modal_${modalName || 'overlay'}_${Date.now()}`;
    window.history.pushState({ isModalDummy: true, id: currentId }, '');
    isPushedRef.current = true;

    // Register this modal as the top-most back handler
    const unregister = registerBackHandler(handlerId.current, () => {
      onCloseRef.current();
    });

    const handlePopState = (e: PopStateEvent) => {
      // If we popped history, check if this handler is the top-most active handler
      const topHandler = activeHandlers[activeHandlers.length - 1];
      if (topHandler && topHandler.id === handlerId.current) {
        isPushedRef.current = false;
        unregister();
        topHandler.onBack();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      unregister();
      
      // Ensure the history entry is cleaned up if component unmounts unexpectedly
      if (isPushedRef.current) {
        isPushedRef.current = false;
        if (window.history.state && window.history.state.isModalDummy) {
          window.history.back();
        }
      }
    };
  }, [isOpen, modalName]);
}
