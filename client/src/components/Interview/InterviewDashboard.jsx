import React, { useState, useMemo } from "react";

const InterviewDashboard = ({ anomalies, userRole, onClose }) => {
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);

  const getAnomalyInfo = (type) => {
    const anomalyMap = {
      // Critical Anomalies
      multiple_people: {
        icon: "fa-solid fa-users",
        color: "text-red-500",
        severity: "critical",
        category: "Cheating",
        priority: 1,
      },
      candidate_absent: {
        icon: "fa-solid fa-user-slash",
        color: "text-red-500",
        severity: "critical",
        category: "Presence",
        priority: 1,
      },
      no_movement_detected: {
        icon: "fa-solid fa-pause-circle",
        color: "text-red-500",
        severity: "critical",
        category: "Presence",
        priority: 1,
      },

      // Warning Anomalies
      looking_away_extended: {
        icon: "fa-solid fa-eye-slash",
        color: "text-orange-500",
        severity: "warning",
        category: "Attention",
        priority: 2,
      },
      suspicious_head_movement: {
        icon: "fa-solid fa-arrows-rotate",
        color: "text-orange-500",
        severity: "warning",
        category: "Behavior",
        priority: 2,
      },
      reading_behavior: {
        icon: "fa-solid fa-book-open",
        color: "text-orange-500",
        severity: "warning",
        category: "Cheating",
        priority: 2,
      },

      // Moderate Anomalies
      eyes_closed_extended: {
        icon: "fa-solid fa-eye-low-vision",
        color: "text-yellow-500",
        severity: "moderate",
        category: "Attention",
        priority: 3,
      },
      high_stress_detected: {
        icon: "fa-solid fa-face-frown",
        color: "text-yellow-500",
        severity: "moderate",
        category: "Behavior",
        priority: 3,
      },

      // Minor/Technical Anomalies
      candidate_too_far: {
        icon: "fa-solid fa-magnifying-glass-minus",
        color: "text-blue-500",
        severity: "minor",
        category: "Technical",
        priority: 4,
      },
      candidate_too_close: {
        icon: "fa-solid fa-magnifying-glass-plus",
        color: "text-blue-500",
        severity: "minor",
        category: "Technical",
        priority: 4,
      },
      poor_video_quality: {
        icon: "fa-solid fa-video-slash",
        color: "text-gray-500",
        severity: "minor",
        category: "Technical",
        priority: 4,
      },
      poor_lighting: {
        icon: "fa-solid fa-lightbulb",
        color: "text-gray-500",
        severity: "minor",
        category: "Technical",
        priority: 4,
      },
    };

    return (
      anomalyMap[type] || {
        icon: "fa-solid fa-triangle-exclamation",
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
      .slice(0, 25);

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
    a.download = `interview-anomalies-${
      new Date().toISOString().split("T")[0]
    }.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRiskLevel = () => {
    const criticalTypes = [
      "multiple_people",
      "candidate_absent",
      "no_movement_detected",
    ];
    const warningTypes = [
      "reading_behavior",
      "looking_away_extended",
      "suspicious_head_movement",
    ];

    const criticalCount = anomalies.filter((a) =>
      criticalTypes.includes(a.type)
    ).length;
    const warningCount = anomalies.filter((a) =>
      warningTypes.includes(a.type)
    ).length;

    if (criticalCount > 0) return { level: "HIGH RISK", color: "text-red-400" };
    if (warningCount > 3)
      return { level: "MODERATE RISK", color: "text-yellow-400" };
    if (anomalies.length > 8)
      return { level: "MODERATE RISK", color: "text-yellow-400" };
    return { level: "LOW RISK", color: "text-green-400" };
  };

  const riskAssessment = getRiskLevel();

  if (userRole !== "interviewer") {
    return null;
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-white text-lg font-medium flex items-center gap-2">
          <i className="fa-solid fa-shield-halved text-blue-400"></i>
          Live Anomaly Monitoring
        </h3>
        <div className="flex items-center space-x-4 text-sm">
          <span className="text-green-400 flex items-center gap-1">
            <i className="fa-solid fa-circle text-xs"></i> Live
          </span>
          <span className="text-gray-400">Total: {anomalies.length}</span>
          {anomalies.length > 0 && (
            <button
              onClick={exportAnomalies}
              className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded transition-colors flex items-center gap-1"
              title="Export anomalies as JSON"
            >
              <i className="fa-solid fa-download"></i> Export
            </button>
          )}
        </div>
      </div>

      {/* Severity Stats */}
      <div className="mb-4 grid grid-cols-4 gap-2">
        <div className="bg-red-600 bg-opacity-20 p-2 rounded text-center border border-red-600/30">
          <div className="text-red-400 text-lg font-bold">
            {severityCounts.critical}
          </div>
          <div className="text-xs text-red-300 flex items-center justify-center gap-1">
            <i className="fa-solid fa-exclamation-triangle"></i> Critical
          </div>
        </div>
        <div className="bg-yellow-600 bg-opacity-20 p-2 rounded text-center border border-yellow-600/30">
          <div className="text-yellow-400 text-lg font-bold">
            {severityCounts.warning}
          </div>
          <div className="text-xs text-yellow-300 flex items-center justify-center gap-1">
            <i className="fa-solid fa-exclamation-circle"></i> Warning
          </div>
        </div>
        <div className="bg-orange-600 bg-opacity-20 p-2 rounded text-center border border-orange-600/30">
          <div className="text-orange-400 text-lg font-bold">
            {severityCounts.moderate}
          </div>
          <div className="text-xs text-orange-300 flex items-center justify-center gap-1">
            <i className="fa-solid fa-info-circle"></i> Moderate
          </div>
        </div>
        <div className="bg-blue-600 bg-opacity-20 p-2 rounded text-center border border-blue-600/30">
          <div className="text-blue-400 text-lg font-bold">
            {severityCounts.minor}
          </div>
          <div className="text-xs text-blue-300 flex items-center justify-center gap-1">
            <i className="fa-solid fa-cog"></i> Minor
          </div>
        </div>
      </div>

      {/* Anomaly List */}
      <div className="flex-1 overflow-y-auto">
        {anomalies.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3 text-green-400">
              <i className="fa-solid fa-check-circle"></i>
            </div>
            <p className="text-gray-400 text-sm font-medium">
              No anomalies detected
            </p>
            <p className="text-gray-500 text-xs">
              Candidate behavior appears normal
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedAnomalies.map((anomaly) => {
              const info = getAnomalyInfo(anomaly.type);
              const bgColor =
                {
                  critical:
                    "bg-red-900/40 border-red-500/50 hover:bg-red-900/60",
                  warning:
                    "bg-yellow-900/40 border-yellow-500/50 hover:bg-yellow-900/60",
                  moderate:
                    "bg-orange-900/40 border-orange-500/50 hover:bg-orange-900/60",
                  minor:
                    "bg-blue-900/40 border-blue-500/50 hover:bg-blue-900/60",
                }[info.severity] ||
                "bg-gray-900/40 border-gray-500/50 hover:bg-gray-900/60";

              return (
                <div
                  key={anomaly.id}
                  className={`p-3 ${bgColor} rounded-lg border-l-4 transition-all duration-200 cursor-pointer ${
                    selectedAnomaly?.id === anomaly.id
                      ? "ring-2 ring-blue-500"
                      : ""
                  }`}
                  onClick={() =>
                    setSelectedAnomaly(
                      selectedAnomaly?.id === anomaly.id ? null : anomaly
                    )
                  }
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`text-lg ${info.color}`}>
                        <i className={info.icon}></i>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className={`font-bold ${info.color} text-sm`}>
                            {anomaly.type.replace(/[_-]/g, " ").toUpperCase()}
                          </span>
                          <span className="text-xs bg-gray-700/60 px-2 py-1 rounded border border-gray-600/50">
                            {info.category}
                          </span>
                        </div>
                        <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                          {anomaly.description}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end space-y-1">
                      <div
                        className={`text-xs px-2 py-1 rounded font-bold border ${
                          info.severity === "critical"
                            ? "bg-red-600 text-white border-red-500"
                            : info.severity === "warning"
                            ? "bg-yellow-600 text-black border-yellow-500"
                            : info.severity === "moderate"
                            ? "bg-orange-600 text-white border-orange-500"
                            : "bg-blue-600 text-white border-blue-500"
                        }`}
                      >
                        {(anomaly.confidence * 100).toFixed(0)}%
                      </div>
                      <div className="text-xs text-gray-400 flex items-center gap-1">
                        <i className="fa-solid fa-clock"></i>
                        {anomaly.timestamp}
                      </div>
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
            <div
              className={`text-lg font-bold ${riskAssessment.color} flex items-center justify-center gap-2`}
            >
              <i
                className={`fa-solid ${
                  riskAssessment.level === "HIGH RISK"
                    ? "fa-exclamation-triangle"
                    : riskAssessment.level === "MODERATE RISK"
                    ? "fa-exclamation-circle"
                    : "fa-check-circle"
                }`}
              ></i>
              {riskAssessment.level}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Overall Interview Assessment
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterviewDashboard;
