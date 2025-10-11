
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function Dashboard() {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to news page when accessing the main dashboard
    navigate('/dashboard/news', { replace: true });
  }, [navigate]);

  return null;
}
