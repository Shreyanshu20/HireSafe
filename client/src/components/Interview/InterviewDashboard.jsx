import React, { useState, useMemo } from "react";

const InterviewDashboard = ({ anomalies, userRole, onClose }) => {
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);

  const getAnomalyInfo = (type) => {
    const anomalyMap = {
      multiple_people: {
        icon: "👥",
        color: "text-red-500",
        severity: "critical",
        category: "Cheating",
        priority: 1,
      },
      candidate_absent: {
        icon: "❌",
        color: "text-red-500",
        severity: "critical",
        category: "Presence",
        priority: 1,
      },
      looking_away_extended: {
        icon: "👀",
        color: "text-orange-500",
        severity: "warning",
        category: "Attention",
        priority: 2,
      },
      suspicious_head_movement: {
        icon: "🔄",
        color: "text-orange-500",
        severity: "warning",
        category: "Behavior",
        priority: 2,
      },
      reading_behavior: {
        icon: "📖",
        color: "text-orange-500",
        severity: "warning",
        category: "Cheating",
        priority: 2,
      },
      eyes_closed_extended: {
        icon: "😴",
        color: "text-yellow-500",
        severity: "moderate",
        category: "Attention",
        priority: 3,
      },
      high_stress_detected: {
        icon: "😰",
        color: "text-yellow-500",
        severity: "moderate",
        category: "Behavior",
        priority: 3,
      },
      candidate_too_far: {
        icon: "📏",
        color: "text-blue-500",
        severity: "minor",
        category: "Technical",
        priority: 4,
      },
      candidate_too_close: {
        icon: "🔍",
        color: "text-blue-500",
        severity: "minor",
        category: "Technical",
        priority: 4,
      },
      poor_video_quality: {
        icon: "📹",
        color: "text-gray-500",
        severity: "minor",
        category: "Technical",
        priority: 4,
      },
      poor_lighting: {
        icon: "💡",
        color: "text-gray-500",
        severity: "minor",
        category: "Technical",
        priority: 4,
      },
      age_verification_concern: {
        icon: "🆔",
        color: "text-purple-500",
        severity: "moderate",
        category: "Identity",
        priority: 3,
      },
      no_movement_detected: {
        icon: "⏸️",
        color: "text-red-500",
        severity: "critical",
        category: "Presence",
        priority: 1,
      },
    };

    return (
      anomalyMap[type] || {
        icon: "⚠️",
        color: "text-gray-500",
        severity: "minor",
        category: "Unknown",
        priority: 5,
      }
    );
  };

  const { severityCounts, sortedAnomalies } = useMemo(() => {
    const counts = {
      critical: 0,
      warning: 0,
      moderate: 0,
      minor: 0,
    };

    anomalies.forEach((anomaly) => {
      const info = getAnomalyInfo(anomaly.type);
      counts[info.severity] = (counts[info.severity] || 0) + 1;
    });

    const sorted = [...anomalies]
      .sort((a, b) => {
        const timeA = a.rawTimestamp || 0;
        const timeB = b.rawTimestamp || 0;

        if (timeA !== timeB) {
          return timeB - timeA;
        }

        const aInfo = getAnomalyInfo(a.type);
        const bInfo = getAnomalyInfo(b.type);
        return aInfo.priority - bInfo.priority;
      })
      .slice(0, 20); // Show more entries

    return { severityCounts: counts, sortedAnomalies: sorted };
  }, [anomalies]);

  const exportAnomalies = () => {
    const data = anomalies.map((anomaly) => ({
      timestamp: anomaly.timestamp,
      type: anomaly.type,
      confidence: anomaly.confidence,
      description: anomaly.description,
      severity: getAnomalyInfo(anomaly.type).severity,
      category: getAnomalyInfo(anomaly.type).category,
    }));

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `interview-anomalies-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRiskLevel = () => {
    if (severityCounts.critical > 0) return { level: "HIGH RISK", color: "text-red-400" };
    if (severityCounts.warning > 2) return { level: "MODERATE RISK", color: "text-yellow-400" };
    return { level: "LOW RISK", color: "text-green-400" };
  };

  const riskAssessment = getRiskLevel();

  if (userRole !== "interviewer") {
    return null; // Only show for interviewers
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-white text-lg font-medium">Live Anomaly Monitoring</h3>
        <div className="flex items-center space-x-4 text-sm">
          <span className="text-green-400">● Live</span>
          <span className="text-gray-400">Total: {anomalies.length}</span>
          {anomalies.length > 0 && (
            <button
              onClick={exportAnomalies}
              className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded transition-colors"
              title="Export anomalies as JSON"
            >
              Export
            </button>
          )}
        </div>
      </div>

      {/* Severity Stats */}
      <div className="mb-4 grid grid-cols-4 gap-2">
        <div className="bg-red-600 bg-opacity-20 p-2 rounded text-center">
          <div className="text-red-400 text-lg font-bold">{severityCounts.critical}</div>
          <div className="text-xs text-red-300">Critical</div>
        </div>
        <div className="bg-yellow-600 bg-opacity-20 p-2 rounded text-center">
          <div className="text-yellow-400 text-lg font-bold">{severityCounts.warning}</div>
          <div className="text-xs text-yellow-300">Warning</div>
        </div>
        <div className="bg-orange-600 bg-opacity-20 p-2 rounded text-center">
          <div className="text-orange-400 text-lg font-bold">{severityCounts.moderate}</div>
          <div className="text-xs text-orange-300">Moderate</div>
        </div>
        <div className="bg-blue-600 bg-opacity-20 p-2 rounded text-center">
          <div className="text-blue-400 text-lg font-bold">{severityCounts.minor}</div>
          <div className="text-xs text-blue-300">Minor</div>
        </div>
      </div>

      {/* Anomaly List */}
      <div className="flex-1 overflow-y-auto">
        {anomalies.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">✅</div>
            <p className="text-gray-400 text-sm">No anomalies detected</p>
            <p className="text-gray-500 text-xs">Candidate behavior appears normal</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedAnomalies.map((anomaly) => {
              const info = getAnomalyInfo(anomaly.type);
              const bgColor = {
                critical: "bg-red-900 border-red-500",
                warning: "bg-yellow-900 border-yellow-500",
                moderate: "bg-orange-900 border-orange-500",
                minor: "bg-blue-900 border-blue-500",
              }[info.severity] || "bg-gray-900 border-gray-500";

              return (
                <div
                  key={anomaly.id}
                  className={`p-3 ${bgColor} rounded-lg border-l-4 transition-all duration-200 hover:bg-opacity-80 cursor-pointer ${
                    selectedAnomaly?.id === anomaly.id ? "ring-2 ring-blue-500" : ""
                  }`}
                  onClick={() => setSelectedAnomaly(selectedAnomaly?.id === anomaly.id ? null : anomaly)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{info.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className={`font-bold ${info.color} text-sm`}>
                            {anomaly.type.replace(/[_-]/g, " ").toUpperCase()}
                          </span>
                          <span className="text-xs bg-gray-700 px-2 py-1 rounded">{info.category}</span>
                        </div>
                        <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                          {anomaly.description}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end space-y-1">
                      <div
                        className={`text-xs px-2 py-1 rounded font-bold ${
                          info.severity === "critical"
                            ? "bg-red-600 text-white"
                            : info.severity === "warning"
                            ? "bg-yellow-600 text-black"
                            : info.severity === "moderate"
                            ? "bg-orange-600 text-white"
                            : "bg-blue-600 text-white"
                        }`}
                      >
                        {(anomaly.confidence * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-gray-400">{anomaly.timestamp}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Risk Assessment Footer */}
      {anomalies.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-700">
          <div className="text-center">
            <div className={`text-lg font-bold ${riskAssessment.color}`}>
              {riskAssessment.level}
            </div>
            <div className="text-xs text-gray-400 mt-1">Overall Interview Assessment</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewDashboard;
