declare global {
  interface Window {
    Cal?: any;
  }
}

import React from 'react';
import { BookerEmbed } from '@calcom/atoms';

interface CalendarBookerProps {
  name: string;
  email: string;
  onSuccess: () => void;
}

export default function CalendarBooker({ name, email, onSuccess }: CalendarBookerProps) {
  return (
    <div className="main">
      <BookerEmbed
        username="elman"
        eventSlug="free-ai-consultation"
        defaultFormValues={{
          name: name || '',
          email: email || '',
        }}
        customClassNames={{
          bookerContainer: 'broccoli-calendar',
          datePickerCustomClassNames: {
            datePickerDatesActive: 'bg-sage-deep-light',
          },
          availableTimeSlotsCustomClassNames: {
            availableTimes: 'bg-sage-deep-light',
          },
          confirmStep: {
            confirmButton: 'bg-sage-deep hover:bg-sage-deep-dark',
          },
        }}
        onCreateBookingSuccess={() => {
          onSuccess();
        }}
      />
    </div>
  );
}
