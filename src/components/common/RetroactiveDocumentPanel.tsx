import React from 'react';

/** Historical-data recovery is out of V1 scope. This renders no UI. */
export interface RetroactiveFields { documentDate: string; attachmentUrl?: string; notes?: string; referenceNumber?: string; }
export const emptyRetroactiveFields = (): RetroactiveFields => ({ documentDate: '', attachmentUrl: '', notes: '', referenceNumber: '' });
export const RetroactiveDocumentPanel: React.FC<any> = () => null;
