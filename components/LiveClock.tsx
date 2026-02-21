"use client";

import { useEffect, useState } from "react";

interface LiveClockProps {
  timezone: string;
  className?: string;
}

export default function LiveClock({ timezone, className }: LiveClockProps) {
  const [time, setTime] = useState("");

  useEffect(() => {
    function update() {
      setTime(
        new Intl.DateTimeFormat("en-GB", {
          timeZone: timezone,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }).format(new Date())
      );
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [timezone]);

  return <span className={className}>{time}</span>;
}
