import React, { useEffect, useState } from 'react';
import CalendarBooker from './CalendarBooker';

interface CalendarBookerWrapperProps {
  onSuccess: () => void;
}

export default function CalendarBookerWrapper({ onSuccess }: CalendarBookerWrapperProps) {
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');

  useEffect(() => {
    // Read the runtime values from window when component mounts
    const name = (window as any).leadName || '';
    const email = (window as any).leadEmail || '';
    setLeadName(name);
    setLeadEmail(email);
  }, []);

  return (
    <CalendarBooker
      name={leadName}
      email={leadEmail}
      onSuccess={onSuccess}
    />
  );
}
