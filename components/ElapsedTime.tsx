"use client";

import { useEffect, useState } from "react";

interface ElapsedTimeProps {
  since: string; // ISO timestamp
  className?: string;
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

export default function ElapsedTime({ since, className }: ElapsedTimeProps) {
  const [elapsed, setElapsed] = useState(Date.now() - new Date(since).getTime());

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Date.now() - new Date(since).getTime());
    }, 1000);
    return () => clearInterval(id);
  }, [since]);

  return <span className={className}>{formatElapsed(elapsed)}</span>;
}
