import { useEffect } from 'react';
import Cal, { getCalApi } from '@calcom/embed-react';

interface CalendarBookerProps {
  name: string;
  email: string;
  onSuccess: () => void;
}

export default function CalendarBooker({ name, email, onSuccess }: CalendarBookerProps) {
  useEffect(() => {
    (async () => {
      const cal = await getCalApi();
      cal('ui', {
        theme: 'light',
        styles: { branding: { brandColor: '#6b8f71' } },
        hideEventTypeDetails: false,
      });
      cal('on', {
        action: 'bookingSuccessful',
        callback: () => onSuccess(),
      });
    })();
  }, [onSuccess]);

  return (
    <Cal
      calLink="elman/aiconsultation"
      config={{
        layout: 'column_view',
        theme: 'light',
        name: name || '',
        email: email || '',
      }}
      style={{ width: '100%', height: '100%', overflow: 'auto' }}
    />
  );
}
