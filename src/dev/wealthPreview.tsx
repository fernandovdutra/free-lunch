import { createRoot } from 'react-dom/client';
import '@/index.css';
import { Wealth } from '@/pages/Wealth';

// Standalone preview of the Wealth page for visual verification — renders the
// page (mock-data driven, no Firebase/router needed) inside a mobile-width,
// Calm-Terminal dark frame. Not shipped; used only by the screenshot script.
createRoot(document.getElementById('root')!).render(
  <div className="min-h-screen bg-bg text-textHi">
    <div className="mx-auto max-w-[440px] px-4">
      <Wealth />
    </div>
  </div>
);
