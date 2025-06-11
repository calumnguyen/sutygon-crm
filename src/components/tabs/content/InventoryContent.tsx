'use client';
import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TRANSLATIONS } from '@/config/translations';

export function InventoryContent() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">{TRANSLATIONS.inventory.title}</h2>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          {TRANSLATIONS.inventory.addItem}
        </Button>
      </div>
      <div className="rounded-md border">{/* Table content will go here */}</div>
    </div>
  );
}
