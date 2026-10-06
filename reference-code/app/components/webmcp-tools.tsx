'use client';

import { useEffect } from 'react';

type ModelContext = {
  registerTool: (tool: {
    name: string;
    title: string;
    description: string;
    inputSchema: object;
    annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
    execute: (input: unknown) => Promise<unknown> | unknown;
  }, options?: { signal?: AbortSignal }) => void | Promise<void>;
};

const destinations = {
  dashboard: '/dashboard',
  assessment: '/assessment',
  appointments: '/appointments',
  documents: '/documents',
  health_picture: '/health-picture',
  roadmap: '/roadmap',
  assistance: '/assistance',
} as const;

export default function WebMcpTools() {
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();

    void Promise.resolve(context.registerTool({
      name: 'open_health_journey_section',
      title: 'بازکردن بخش مسیر سلامت',
      description: 'یکی از بخش‌های اصلی پنل عضو همیار سلامت را باز می‌کند. این ابزار فقط ناوبری انجام می‌دهد و اطلاعات پزشکی را تغییر نمی‌دهد.',
      inputSchema: {
        type: 'object',
        properties: {
          destination: { type: 'string', enum: Object.keys(destinations) },
        },
        required: ['destination'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) {
        const destination = typeof input === 'object' && input !== null
          ? (input as { destination?: string }).destination
          : undefined;
        if (!destination || !(destination in destinations)) throw new Error('بخش درخواستی معتبر نیست.');
        const path = destinations[destination as keyof typeof destinations];
        window.location.assign(path);
        return { destination, path };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);

    return () => lifecycle.abort();
  }, []);

  return null;
}
