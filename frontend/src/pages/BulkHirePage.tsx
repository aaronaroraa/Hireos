import React from 'react';
import { BulkUploadSection } from '../components/BulkUploadSection';

export const BulkHirePage: React.FC = () => {
    return (
        <div className="space-y-8 pb-10">
            <div>
                <h1 className="text-2xl font-display font-bold text-black tracking-tight">Bulk Hire</h1>
                <p className="text-gray-400 mt-1 text-sm">
                    Upload a CSV or spreadsheet of candidates. The AI scores everyone against the role and
                    auto-shortlists the top three or four — your fast lane from thousands of applicants to a
                    short interview list.
                </p>
            </div>

            <BulkUploadSection onCampaignComplete={() => { /* analytics refresh handled inside */ }} />
        </div>
    );
};
