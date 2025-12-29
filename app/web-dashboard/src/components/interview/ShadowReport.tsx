import React from 'react';
import { ShadowReport as ReportType } from '@/types';
import { FaFileAlt, FaStar, FaChartLine, FaUserTie, FaTimes, FaCheck } from 'react-icons/fa';

interface ShadowReportProps {
  report: ReportType;
}

export const ShadowReport: React.FC<ShadowReportProps> = ({ report }) => {
  
  const isHire = report.verdict.includes("Hire") && !report.verdict.includes("No");
  const verdictColor = isHire ? "bg-red-100 text-red-700 border-red-200" : "bg-red-100 text-red-800 border-red-200";
  // Let's make Hire green for better UX
  const badgeStyle = isHire 
    ? "bg-green-100 text-green-800 border-green-200" 
    : "bg-red-100 text-red-800 border-red-200";

  return (
    <div className="bg-[#0f172a] rounded-xl border border-gray-700 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4">
      
      {/* Header */}
      <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-[#1e293b]">
        <div>
          <h2 className="text-2xl font-bold text-white">Shadow Report</h2>
          <p className="text-gray-400 text-sm">Evaluation for <span className="text-white font-medium">Candidate</span></p>
        </div>
        <div className={`px-4 py-2 rounded-full border flex items-center gap-2 font-bold ${badgeStyle}`}>
           {isHire ? <FaCheck /> : <FaTimes />}
           {report.verdict}
        </div>
      </div>

      <div className="p-6 space-y-6">
        
        {/* Row 1: Presence & STAR */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#1e293b] p-5 rounded-xl border border-gray-700">
            <h4 className="text-blue-400 font-bold mb-3 flex items-center gap-2">
                <FaUserTie /> Candidate Presence
            </h4>
            <p className="text-gray-300 text-sm leading-relaxed">{report.candidate_presence}</p>
          </div>
          <div className="bg-[#1e293b] p-5 rounded-xl border border-gray-700">
            <h4 className="text-blue-400 font-bold mb-3 flex items-center gap-2">
                <FaStar /> STAR Proficiency
            </h4>
            <p className="text-gray-300 text-sm leading-relaxed">{report.star_proficiency}</p>
          </div>
        </div>

        {/* Row 2: Strengths & Red Flags */}
        <div>
            <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                <FaChartLine className="text-blue-400"/> Key Observations
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Strengths */}
                <div className="bg-[#f0fdf4] p-5 rounded-xl border border-green-200">
                    <h5 className="text-green-800 font-bold mb-2">Strengths</h5>
                    {report.strengths.length > 0 ? (
                        <ul className="list-disc list-inside text-green-900 text-sm space-y-1">
                            {report.strengths.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                    ) : (
                        <p className="text-green-900/60 italic text-sm">No specific strengths identified.</p>
                    )}
                </div>

                {/* Red Flags */}
                <div className="bg-[#fef2f2] p-5 rounded-xl border border-red-200">
                    <h5 className="text-red-800 font-bold mb-2">Potential Red Flags</h5>
                    {report.red_flags.length > 0 ? (
                        <ul className="list-disc list-inside text-red-900 text-sm space-y-1">
                            {report.red_flags.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                    ) : (
                        <p className="text-red-900/60 italic text-sm">No red flags observed.</p>
                    )}
                </div>
            </div>
        </div>

        {/* Row 3: Summary */}
        <div className="bg-[#1e293b] p-5 rounded-xl border border-gray-700">
            <h4 className="text-blue-400 font-bold mb-3 flex items-center gap-2">
                <FaFileAlt /> Hiring Manager Summary
            </h4>
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                {report.hiring_manager_summary}
            </p>
        </div>

      </div>
    </div>
  );
};