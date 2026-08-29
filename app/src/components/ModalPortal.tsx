import { ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
  children: ReactNode;
}

// Renders children directly into document.body, escaping any parent
// stacking context (e.g. the sidebar/header's z-index layers) so a
// fixed, full-screen overlay actually covers the entire viewport.
const ModalPortal: React.FC<ModalPortalProps> = ({ children }) => {
  return createPortal(children, document.body);
};

export default ModalPortal;
